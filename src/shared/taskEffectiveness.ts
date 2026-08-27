export type TaskReviewStatus = 'accepted' | 'rework' | 'discarded';

export interface TaskReviewEntry {
  decision: TaskReviewStatus;
  at: string;
  note?: string;
  timeSavedMinutes?: number;
}

export interface EffectivenessTask {
  title?: string;
  status?: string;
  blockedReason?: string;
  archivedAt?: string;
  createdAt?: string;
  completedAt?: string;
  reviewedAt?: string;
  reviewStatus?: TaskReviewStatus;
  firstReviewStatus?: TaskReviewStatus;
  reworkCount?: number;
  timeSavedMinutes?: number;
  reviewHistory?: TaskReviewEntry[];
  humanQA?: Array<{ q?: string; a?: string; dismissedAt?: string }>;
}

export interface HumanQuestionEntry {
  q: string;
  a?: string;
  askedAt?: string;
  answeredAt?: string;
  dismissedAt?: string;
}

export interface HumanAnswerPatch {
  question: string;
  humanQA: HumanQuestionEntry[];
}

export interface EffectivenessSummary {
  accepted: number;
  reviewed: number;
  firstPassAccepted: number;
  firstPassRate: number | null;
  acceptanceRate: number | null;
  reworkRate: number | null;
  medianTurnaroundMinutes: number | null;
  totalTimeSavedMinutes: number;
  readyForReview: number;
  waitingOnHuman: number;
  active: number;
  blocked: number;
  reviewedToday: number;
}

function validDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isSameLocalDay(value: unknown, now = new Date()): boolean {
  const date = validDate(value);
  return !!date
    && date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

export function taskWaitsOnHuman(task: EffectivenessTask): boolean {
  if (task.status !== 'blocked' || taskIsArchived(task) || !Array.isArray(task.humanQA)) return false;
  return task.humanQA.some((entry) => entry && entry.q && !entry.a && !entry.dismissedAt);
}

export function taskIsArchived(task: Pick<EffectivenessTask, 'archivedAt'>): boolean {
  return typeof task.archivedAt === 'string' && task.archivedAt.trim().length > 0;
}

/** Return the replacement task id recorded in common parked-card titles. */
export function taskSupersededBy(task: Pick<EffectivenessTask, 'title'>): string | null {
  const match = task.title?.match(/\bsuperseded by\s+([a-z0-9._-]+)/i);
  return match?.[1] ?? null;
}

/** Plain-language reason shown for a system-blocked task. */
export function taskBlockedReason(
  task: Pick<EffectivenessTask, 'title' | 'blockedReason'>
): string {
  const explicit = task.blockedReason?.trim();
  if (explicit) return explicit;
  const replacement = taskSupersededBy(task);
  if (replacement) return `This job was replaced by ${replacement}. It can be archived safely.`;
  return 'The agent did not record why this job stopped. Retry it so Talent Chief can diagnose the problem.';
}

/** Build the smallest atomic patch for the latest open human question. */
export function buildHumanAnswerPatch(
  task: { humanQA?: HumanQuestionEntry[] },
  answer: string,
  at = new Date().toISOString()
): HumanAnswerPatch | null {
  const text = answer.trim();
  if (!text || !Array.isArray(task.humanQA)) return null;
  let openIndex = -1;
  for (let i = task.humanQA.length - 1; i >= 0; i--) {
    const entry = task.humanQA[i];
    if (entry && entry.q?.trim() && !entry.a && !entry.dismissedAt) {
      openIndex = i;
      break;
    }
  }
  if (openIndex < 0) return null;
  const question = task.humanQA[openIndex].q;
  return {
    question,
    humanQA: task.humanQA.map((entry, index) => (
      index === openIndex ? { ...entry, a: text, answeredAt: at } : entry
    ))
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/**
 * Outcome metrics over the local task ledger. Agent activity is deliberately
 * absent: tool calls, messages, and tokens are diagnostics, not useful work.
 */
export function summarizeTaskEffectiveness(
  tasks: readonly EffectivenessTask[],
  now = new Date()
): EffectivenessSummary {
  let accepted = 0;
  let reviewed = 0;
  let firstPassAccepted = 0;
  let firstReviewRecorded = 0;
  let rework = 0;
  let totalTimeSavedMinutes = 0;
  let readyForReview = 0;
  let waitingOnHuman = 0;
  let active = 0;
  let blocked = 0;
  let reviewedToday = 0;
  const turnaroundMinutes: number[] = [];

  for (const task of tasks) {
    if (taskIsArchived(task)) continue;
    if (task.status === 'done' && !task.reviewStatus) readyForReview++;
    if (task.status === 'todo' || task.status === 'doing') active++;
    if (task.status === 'blocked') blocked++;
    if (taskWaitsOnHuman(task)) waitingOnHuman++;

    if (task.reviewStatus) {
      reviewed++;
      if (task.reviewStatus === 'accepted') {
        accepted++;
        if (Number.isFinite(task.timeSavedMinutes) && (task.timeSavedMinutes ?? 0) > 0) {
          totalTimeSavedMinutes += task.timeSavedMinutes ?? 0;
        }
      }
      // Preserve the cost of a revision cycle after the task is later accepted.
      // Current status alone would otherwise make historical rework disappear.
      if (
        task.reviewStatus === 'rework'
        || task.firstReviewStatus === 'rework'
        || (task.reworkCount ?? 0) > 0
      ) rework++;
      if (isSameLocalDay(task.reviewedAt, now)) reviewedToday++;
    }

    const first = task.firstReviewStatus
      ?? (task.reviewStatus && (task.reworkCount ?? 0) === 0 ? task.reviewStatus : undefined);
    if (first) {
      firstReviewRecorded++;
      if (first === 'accepted') firstPassAccepted++;
    }

    const start = validDate(task.createdAt);
    const finish = validDate(task.completedAt) ?? validDate(task.reviewedAt);
    if (start && finish && finish.getTime() >= start.getTime()) {
      turnaroundMinutes.push((finish.getTime() - start.getTime()) / 60_000);
    }
  }

  return {
    accepted,
    reviewed,
    firstPassAccepted,
    firstPassRate: firstReviewRecorded > 0 ? firstPassAccepted / firstReviewRecorded : null,
    acceptanceRate: reviewed > 0 ? accepted / reviewed : null,
    reworkRate: reviewed > 0 ? rework / reviewed : null,
    medianTurnaroundMinutes: median(turnaroundMinutes),
    totalTimeSavedMinutes,
    readyForReview,
    waitingOnHuman,
    active,
    blocked,
    reviewedToday
  };
}

export function buildTaskReviewPatch(
  task: EffectivenessTask,
  decision: TaskReviewStatus,
  options: { at?: string; note?: string; timeSavedMinutes?: number } = {}
): Record<string, unknown> {
  const at = options.at ?? new Date().toISOString();
  const note = options.note?.trim() || undefined;
  const timeSavedMinutes = Number.isFinite(options.timeSavedMinutes)
    ? Math.max(0, Math.round(options.timeSavedMinutes ?? 0))
    : undefined;
  const history = Array.isArray(task.reviewHistory) ? task.reviewHistory.slice() : [];
  const entry: TaskReviewEntry = { decision, at };
  if (note) entry.note = note;
  if (decision === 'accepted' && timeSavedMinutes) entry.timeSavedMinutes = timeSavedMinutes;
  history.push(entry);

  const patch: Record<string, unknown> = {
    reviewStatus: decision,
    reviewedAt: at,
    firstReviewStatus: task.firstReviewStatus ?? decision,
    reviewHistory: history,
    status: decision === 'rework' ? 'todo' : 'done',
    completedAt: task.completedAt ?? at
  };
  if (note) patch.reviewNote = note;
  if (decision === 'rework') patch.reworkCount = Math.max(0, task.reworkCount ?? 0) + 1;
  if (decision === 'accepted' && timeSavedMinutes !== undefined) patch.timeSavedMinutes = timeSavedMinutes;
  return patch;
}
