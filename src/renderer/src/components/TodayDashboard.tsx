import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useStore } from '@/store/store';
import { openQuestion, parseTasks, waitsOnHuman, type HiveTask } from './TasksKanban';
import { Icon } from './Icon';
import {
  buildHumanAnswerPatch,
  isSameLocalDay,
  summarizeTaskEffectiveness,
  taskBlockedReason,
  taskIsArchived,
  taskSupersededBy,
  type TaskReviewStatus
} from '@shared/taskEffectiveness';
import './TodayDashboard.css';

const POLL_MS = 5000;
const DEFAULT_REVIEW_COUNT = 3;

export function TodayDashboard() {
  const agents = useStore((state) => state.agents);
  const restorable = useStore((state) => state.restorableAgents);
  const openTaskDetail = useStore((state) => state.openTaskDetail);
  const drafts = useStore((state) => state.answerDrafts);
  const setAnswerDraft = useStore((state) => state.setAnswerDraft);
  const [tasks, setTasks] = useState<HiveTask[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [answerNotice, setAnswerNotice] = useState<{ taskId: string; error?: string } | null>(null);
  const [blockedAction, setBlockedAction] = useState<{ taskId: string; kind: BlockedAction } | null>(null);
  const [blockedNotice, setBlockedNotice] = useState<BlockedNotice | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      setTasks(parseTasks(await window.cth.hiveTasks()));
      setLoaded(true);
    } catch {
      // Preserve the last useful snapshot if a write is between rename steps.
    }
  }, []);

  useEffect(() => {
    void refresh();
    timer.current = setInterval(() => { void refresh(); }, POLL_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [refresh]);

  const summary = useMemo(() => summarizeTaskEffectiveness(tasks), [tasks]);
  const questions = useMemo(() => tasks
    .filter(waitsOnHuman)
    .sort((a, b) => b.priority - a.priority
      || dateMs(openQuestion(a)?.askedAt) - dateMs(openQuestion(b)?.askedAt)), [tasks]);
  const readyForReview = useMemo(() => tasks
    .filter((task) => !taskIsArchived(task) && task.status === 'done' && !task.reviewStatus)
    .sort((a, b) => dateMs(b.completedAt) - dateMs(a.completedAt) || b.priority - a.priority), [tasks]);
  const visibleReviews = showAllReviews ? readyForReview : readyForReview.slice(0, DEFAULT_REVIEW_COUNT);
  const active = useMemo(() => tasks
    .filter((task) => !taskIsArchived(task) && (task.status === 'doing' || task.status === 'todo'))
    .sort((a, b) => statusRank(a.status) - statusRank(b.status) || b.priority - a.priority), [tasks]);
  const systemBlocked = useMemo(() => tasks
    .filter((task) => !taskIsArchived(task) && task.status === 'blocked' && !waitsOnHuman(task))
    .sort((a, b) => b.priority - a.priority), [tasks]);
  const archivedBlocked = useMemo(() => tasks
    .filter((task) => taskIsArchived(task) && task.status === 'blocked')
    .sort((a, b) => dateMs(b.archivedAt) - dateMs(a.archivedAt)), [tasks]);
  const completedToday = useMemo(() => tasks
    .filter((task) => !taskIsArchived(task) && !!task.reviewStatus && isSameLocalDay(task.reviewedAt))
    .sort((a, b) => dateMs(b.reviewedAt) - dateMs(a.reviewedAt)), [tasks]);

  const nameFor = (id?: string): string | undefined => id
    ? agents.find((agent) => agent.id === id)?.name
      ?? restorable.find((agent) => agent.id === id)?.name
      ?? id
    : undefined;

  const sendAnswer = async (task: HiveTask) => {
    const answer = buildHumanAnswerPatch(task, drafts[task.id] ?? '');
    if (!answer || sending) return;
    setSending(task.id);
    setAnswerNotice(null);
    try {
      const saved = await window.cth.hivePatchTask(task.id, { humanQA: answer.humanQA });
      if (!saved.ok) throw new Error('The task changed before the answer could be saved.');
      const notified = await window.cth.hiveSend({
        to: 'god',
        act: 'inform',
        subject: `HUMAN ANSWER on task "${task.title}"`,
        body: [
          `The human answered the open question on task ${task.id} ("${task.title}"):`,
          `Q: ${answer.question}`,
          `A: ${(drafts[task.id] ?? '').trim()}`,
          'The answer is recorded on the task card. Act on it, unblock the card, and continue the work.'
        ].join('\n')
      }, 'human');
      if (!notified.ok) throw new Error('Your answer was saved, but Talent Chief could not be notified.');
      setAnswerDraft(task.id, '');
      setTasks((current) => current.map((entry) => (
        entry.id === task.id ? { ...entry, humanQA: answer.humanQA } : entry
      )));
      setAnswerNotice({ taskId: task.id });
      void refresh();
    } catch (error) {
      setAnswerNotice({
        taskId: task.id,
        error: error instanceof Error ? error.message : 'The answer could not be saved.'
      });
    } finally {
      setSending(null);
    }
  };

  const runBlockedAction = async (task: HiveTask, kind: BlockedAction) => {
    if (blockedAction) return;
    const at = new Date().toISOString();
    const patch: Partial<HiveTask> = kind === 'archive'
      ? { archivedAt: at, archivedReason: 'Archived from Today. Task history preserved.' }
      : kind === 'restore'
        ? { archivedAt: '', archivedReason: '' }
        : { status: 'todo', archivedAt: '', archivedReason: '', retryRequestedAt: at };
    setBlockedAction({ taskId: task.id, kind });
    setBlockedNotice(null);
    try {
      const saved = await window.cth.hivePatchTask(task.id, patch);
      if (!saved.ok) throw new Error('The task changed before the action could be saved.');
      setTasks((current) => current.map((entry) => (
        entry.id === task.id ? { ...entry, ...patch } : entry
      )));

      if (kind === 'retry') {
        const notified = await window.cth.hiveSend({
          to: 'god',
          act: 'request',
          subject: `RETRY REQUESTED on task "${task.title}"`,
          body: [
            `The human requested a retry of task ${task.id} ("${task.title}").`,
            `Previous blocker: ${taskBlockedReason(task)}`,
            'The card is back in todo. Diagnose the blocker, assign the right owner, and keep blockedReason current if it stops again.'
          ].join('\n')
        }, 'human');
        if (!notified.ok) {
          setBlockedNotice({
            kind,
            task,
            error: 'The retry was recorded, but Talent Chief could not be notified.'
          });
          return;
        }
      }

      setBlockedNotice({ kind, task });
      void refresh();
    } catch (error) {
      setBlockedNotice({
        kind,
        task,
        error: error instanceof Error ? error.message : 'The action could not be saved.'
      });
      void refresh();
    } finally {
      setBlockedAction(null);
    }
  };

  return (
    <div className="cth-today">
      <header className="cth-today__header">
        <div>
          <h2>Today</h2>
          <p>Your short decision queue first, then work in motion and reviewed outcomes.</p>
        </div>
        <button type="button" className="cth-today__refresh" onClick={() => void refresh()}>refresh</button>
      </header>

      <section className="cth-today__metrics" aria-label="Effectiveness summary">
        <Metric label="accepted outcomes" value={String(summary.accepted)} detail={`${summary.reviewed} reviewed`} />
        <Metric label="first-pass quality" value={formatPercent(summary.firstPassRate)} detail="accepted without rework" />
        <Metric label="median turnaround" value={formatDuration(summary.medianTurnaroundMinutes)} detail="request to review-ready" />
        <Metric label="reported time saved" value={formatSavedTime(summary.totalTimeSavedMinutes)} detail="accepted work only" />
      </section>

      <p className="cth-today__privacy">Effectiveness stays local. Agent activity and token volume do not count as outcomes.</p>

      {blockedNotice && (
        <div className={`cth-today__notice${blockedNotice.error ? ' is-error' : ''}`} role="status">
          <span>{blockedNotice.error ?? blockedNoticeText(blockedNotice.kind)}</span>
          {blockedNotice.kind === 'archive' && !blockedNotice.error && (
            <button type="button" onClick={() => void runBlockedAction(blockedNotice.task, 'restore')}>undo</button>
          )}
          <button type="button" aria-label="dismiss notice" onClick={() => setBlockedNotice(null)}>close</button>
        </div>
      )}

      <OutcomeSection
        title="Needs your answer"
        count={questions.length}
        accent="coral"
        empty={loaded ? 'No questions are waiting on you.' : 'Loading the local task ledger…'}
      >
        {questions.map((task) => (
          <QuestionCard
            key={task.id}
            task={task}
            assignee={nameFor(task.assignee)}
            value={drafts[task.id] ?? ''}
            sending={sending === task.id}
            notice={answerNotice?.taskId === task.id ? answerNotice : null}
            onChange={(value) => setAnswerDraft(task.id, value)}
            onSubmit={() => void sendAnswer(task)}
            onOpen={() => openTaskDetail(task.id)}
          />
        ))}
      </OutcomeSection>

      <OutcomeSection
        title="Ready for review"
        count={readyForReview.length}
        accent="lemon"
        empty="No completed work is waiting for review."
      >
        {visibleReviews.map((task) => (
          <OutcomeRow
            key={task.id}
            task={task}
            assignee={nameFor(task.assignee)}
            label="REVIEW"
            accent="lemon"
            onOpen={() => openTaskDetail(task.id)}
          />
        ))}
        {readyForReview.length > DEFAULT_REVIEW_COUNT && (
          <button
            type="button"
            className="cth-today__show-more"
            onClick={() => setShowAllReviews((shown) => !shown)}
          >
            {showAllReviews ? 'show only the newest 3' : `show ${readyForReview.length - DEFAULT_REVIEW_COUNT} more`}
          </button>
        )}
      </OutcomeSection>

      <OutcomeSection title="In progress" count={active.length} accent="sky" empty="No work is in progress.">
        {active.slice(0, 10).map((task) => (
          <OutcomeRow
            key={task.id}
            task={task}
            assignee={nameFor(task.assignee)}
            label={task.status.toUpperCase()}
            accent={task.status === 'blocked' ? 'coral' : task.status === 'doing' ? 'lemon' : 'sky'}
            onOpen={() => openTaskDetail(task.id)}
          />
        ))}
      </OutcomeSection>

      <OutcomeSection
        title="Agent issues"
        count={systemBlocked.length}
        accent="coral"
        empty="No stalled agent jobs need attention."
      >
        <p className="cth-today-section__help">These do not need your answer. Retry a job, or archive it from Today.</p>
        {systemBlocked.map((task) => (
          <BlockedTaskCard
            key={task.id}
            task={task}
            assignee={nameFor(task.assignee)}
            busy={blockedAction?.taskId === task.id}
            onRetry={() => void runBlockedAction(task, 'retry')}
            onArchive={() => void runBlockedAction(task, 'archive')}
            onOpen={() => openTaskDetail(task.id)}
          />
        ))}
      </OutcomeSection>

      {archivedBlocked.length > 0 && (
        <section className="cth-today-archived">
          <button type="button" onClick={() => setShowArchived((shown) => !shown)}>
            {showArchived ? 'hide archived jobs' : `show ${archivedBlocked.length} archived job${archivedBlocked.length === 1 ? '' : 's'}`}
          </button>
          {showArchived && (
            <div className="cth-today-section__body">
              {archivedBlocked.map((task) => (
                <BlockedTaskCard
                  key={task.id}
                  task={task}
                  assignee={nameFor(task.assignee)}
                  busy={blockedAction?.taskId === task.id}
                  archived
                  onRestore={() => void runBlockedAction(task, 'restore')}
                  onOpen={() => openTaskDetail(task.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <OutcomeSection title="Reviewed today" count={completedToday.length} accent="mint" empty="No outcomes reviewed today yet.">
        {completedToday.map((task) => (
          <OutcomeRow
            key={task.id}
            task={task}
            assignee={nameFor(task.assignee)}
            label={reviewLabel(task.reviewStatus)}
            accent={reviewAccent(task.reviewStatus)}
            onOpen={() => openTaskDetail(task.id)}
          />
        ))}
      </OutcomeSection>
    </div>
  );
}

function QuestionCard({ task, assignee, value, sending, notice, onChange, onSubmit, onOpen }: {
  task: HiveTask;
  assignee?: string;
  value: string;
  sending: boolean;
  notice: { error?: string } | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onOpen: () => void;
}) {
  const question = openQuestion(task)?.q ?? 'What should the team do next?';
  return (
    <article className="cth-today-question">
      <div className="cth-today-question__header">
        <button type="button" onClick={onOpen}>{task.title}</button>
        {assignee && <span>{assignee}</span>}
      </div>
      <div className="cth-today-question__prompt">{question}</div>
      <textarea
        rows={2}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) onSubmit();
        }}
        placeholder="Type your answer here…"
        aria-label={`Answer ${task.title}`}
      />
      <div className="cth-today-question__actions">
        <button type="button" disabled={!value.trim() || sending} onClick={onSubmit}>
          {sending ? 'sending…' : 'send answer'}
        </button>
        <span className={notice?.error ? 'is-error' : ''}>
          {notice?.error ?? (notice ? 'Answer sent. The task can continue.' : '⌘↵ to send')}
        </span>
      </div>
    </article>
  );
}

type BlockedAction = 'retry' | 'archive' | 'restore';

interface BlockedNotice {
  kind: BlockedAction;
  task: HiveTask;
  error?: string;
}

function BlockedTaskCard({ task, assignee, busy, archived = false, onRetry, onArchive, onRestore, onOpen }: {
  task: HiveTask;
  assignee?: string;
  busy: boolean;
  archived?: boolean;
  onRetry?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onOpen: () => void;
}) {
  const superseded = taskSupersededBy(task);
  return (
    <article className={`cth-today-blocked${archived ? ' is-archived' : ''}`}>
      <div className="cth-today-blocked__topline">
        <span>{archived ? 'ARCHIVED' : superseded ? 'PARKED' : 'BLOCKED'}</span>
        {assignee && <span>{assignee}</span>}
      </div>
      <button type="button" className="cth-today-blocked__title" onClick={onOpen}>{task.title}</button>
      <p>{taskBlockedReason(task)}</p>
      <div className="cth-today-blocked__actions">
        {archived ? (
          <button type="button" disabled={busy} onClick={onRestore}>{busy ? 'restoring…' : 'restore'}</button>
        ) : (
          <>
            <button type="button" disabled={busy} onClick={onRetry}>{busy ? 'working…' : superseded ? 'retry anyway' : 'retry job'}</button>
            <button type="button" disabled={busy} onClick={onArchive}>archive</button>
          </>
        )}
        <button type="button" disabled={busy} onClick={onOpen}>details</button>
      </div>
    </article>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="cth-today-metric">
      <div className="cth-today-metric__value">{value}</div>
      <div className="cth-today-metric__label">{label}</div>
      <div className="cth-today-metric__detail">{detail}</div>
    </div>
  );
}

function OutcomeSection({ title, count, accent, empty, children }: {
  title: string;
  count: number;
  accent: AccentName;
  empty: string;
  children: ReactNode;
}) {
  return (
    <section className="cth-today-section">
      <div className="cth-today-section__title" style={{ borderLeftColor: `var(--cth-${accent})` }}>
        <h3>{title}</h3>
        <span>{count}</span>
      </div>
      <div className="cth-today-section__body">
        {count === 0 ? <div className="cth-today-section__empty">{empty}</div> : children}
      </div>
    </section>
  );
}

type AccentName = 'coral' | 'mint' | 'sky' | 'lemon' | 'lilac';

function OutcomeRow({ task, assignee, label, accent, onOpen }: {
  task: HiveTask;
  assignee?: string;
  label: string;
  accent: AccentName;
  onOpen: () => void;
}) {
  const summary = task.result?.trim() || task.description?.trim();
  return (
    <button type="button" className="cth-today-row" onClick={onOpen}>
      <span className="cth-today-row__accent" style={{ background: `var(--cth-${accent})` }} />
      <span className="cth-today-row__content">
        <span className="cth-today-row__topline">
          <span className="cth-today-row__label" style={{ color: `var(--cth-${accent})` }}>{label}</span>
          {assignee && <span className="cth-today-row__assignee">{assignee}</span>}
        </span>
        <span className="cth-today-row__title">{task.title}</span>
        {summary && <span className="cth-today-row__summary">{summary}</span>}
      </span>
      <span className="cth-today-row__arrow"><Icon name="arrow-right" /></span>
    </button>
  );
}

function statusRank(status: HiveTask['status']): number {
  return status === 'doing' ? 0 : status === 'blocked' ? 1 : 2;
}

function dateMs(value?: string): number {
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value * 100)}%`;
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(minutes < 600 ? 1 : 0)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
}

function formatSavedTime(minutes: number): string {
  if (minutes <= 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

function blockedNoticeText(kind: BlockedAction): string {
  if (kind === 'retry') return 'Retry requested. Talent Chief has been notified.';
  if (kind === 'restore') return 'Job restored to Agent issues.';
  return 'Job archived from Today. Its history was kept.';
}

function reviewLabel(status?: TaskReviewStatus): string {
  return status === 'accepted' ? 'ACCEPTED' : status === 'rework' ? 'NEEDS WORK' : 'DISCARDED';
}

function reviewAccent(status?: TaskReviewStatus): AccentName {
  return status === 'accepted' ? 'mint' : status === 'rework' ? 'lemon' : 'coral';
}
