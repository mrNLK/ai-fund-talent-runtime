# AI Fund Talent Runtime

Local command center for coordinated talent research. Version 0.4.5. Private prototype. Snapshot as of 24 Aug 2026.

This is an internal operator guide. Do not post it publicly.

---

## What it is

This is a small virtual talent team that lives on your Mac. You give Talent Chief one objective. The Runtime splits the work, tracks it, and returns a sourced shortlist or a clear ask back to you.

The pixel office is a status board. Each character is one specialist. Speech bubbles show what they are doing. Idle means they are waiting for work.

- Specialists on the floor: 4
- Auto mode: Off
- Candidate outreach: Blocked

### The four specialists

| Agent | Job | Talk to them when |
| --- | --- | --- |
| Talent Chief (BOSS) | Takes your brief, assigns work, synthesizes the answer | You have a new objective or a decision to make |
| Talent Researcher | Finds public evidence and cites direct sources | You want discovery or source-backed research |
| Candidate Analyst | Independent QA: identity, duplicates, claim audit, scoring | A list needs a second read before you trust it |
| Automation Engineer | Builds local tools, tests, and repeatable workflows | The process itself needs fixing or repeating |

### What it is allowed to do

**Allowed without you:** Public research, evidence gathering, scoring, duplicate checks, and local reports. Drafts stay on this machine.

**Blocked until you approve:** Email, Lever writes, database writes, calendar changes, contacting a person, and turning on recurring automation.

After you quit and relaunch the Runtime, Talent Researcher can search with Exa, enrich with Parallel, and check papers with Sider Scholar. Candidate Analyst can check papers too. Lever and mail stay disconnected.

---

## How to use it

Click Talent Chief in the bottom bar. Type one brief in the message box on the right. Press send. Leave auto mode off until you trust a run.

The Runtime will not invent a search because it is open. It needs a trigger from you.

### Give it a brief

| Include | Example |
| --- | --- |
| Role or venture idea | EIR for the approved venture brief |
| Geography | Bay Area, commutable to Mountain View |
| Count | 15 prospects |
| Required evidence | Personally built production LLM, agent, RAG, eval, or multimodal systems |
| Exclusions | Do not contact anyone. Research only. |

Standing EIR rules are already loaded: GenAI floor, no invented facts, one rubric per pass, draft-first, never guess the active venture list.

### What each part of the screen does

| On screen | What it means | What you do |
| --- | --- | --- |
| Office floor | Live picture of who is working | Watch. Click a character if you want that agent's panel. |
| Bottom agent cards | Your team roster and idle / working status | Click Talent Chief to give work. Click others only to inspect. |
| Auto mode off | Agents wait for a message instead of running on their own | Keep it off for this prototype unless you explicitly want unattended work. |
| Message box (right) | Direct instruction to the selected agent | Write the brief here. Use + files only if you are attaching a list or brief. |
| Send this agent a note | Side comment that lands on the next turn | Use for a correction. Do not put the main brief here. |
| TERMINAL / GIT / MESSAGES / TRACES | That agent's work log, code, mail, and traces | Open MESSAGES when you want to see what they asked or answered. |
| block tools / stop after this step / 1:1 | Safety brakes | Leave them alone unless an agent is looping or spending too much. |
| memory button | Opens that agent's long-term notes | Inspect only. Candidate names should not live there. |

### The normal sourcing path

1. You brief Talent Chief.
2. Researcher builds a cited evidence file.
3. Analyst audits identity, sources, and claims.
4. Chief returns a ranked shortlist with gaps labeled.

If the venture roster is missing and fit matters, Chief should stop and ask you. If two identities cannot be resolved, it should stop and ask you.

### When it should come back to you

| Situation | Your move |
| --- | --- |
| Role or brief is ambiguous | Paste a tighter objective |
| Venture roster is required | Paste the current idea list |
| Two people might be the same person | Tell it which identity to keep |
| Evidence is too thin to recommend | Accept insufficient data, or widen the search |
| Paid worker or extra spend | Approve or refuse in Settings |
| Outreach, Lever, or database write | Approve with the exact token for that action |

---

## Start the app

The hive folder is not the app. AI Fund Talent Runtime is the team's filing cabinet. The program itself lives in your home folder, in `ai-fund-talent-runtime`. Double-click the launch file there.

### Start it

In Finder, open your home folder, then `ai-fund-talent-runtime`. Double-click `Launch AI Fund Talent Runtime.command`.

macOS may ask you to confirm opening a command file. Allow it. A Terminal window may flash while it starts. Then the pixel office appears. Keep that window open while you use the floor.

First launch can take a minute while it installs local pieces. Later launches are faster.

### Give work after it opens

Click Talent Chief. Type one brief in the right-hand message box. Press send. Auto mode stays off unless you turn it on.

### If it does not open

| What you see | What it means |
| --- | --- |
| Nothing happens after double-click | macOS blocked the command file. Right-click it, choose Open, then confirm. |
| A Terminal error about Node | The launcher needs Node 20. Ask Cursor to run the prerequisite check. |
| The office opens, agents stay idle | That is expected. Auto mode is off. Message Talent Chief. |
| Agents vanish when you quit | Closing the app stops the team. Open the launch file again. |

---

## Add tools

Keys for Exa and Parallel stay on this Mac and never go into hive files. Sider Scholar uses your ChatGPT login. Lever, Gmail, and calendar stay out. Quit the Runtime and launch it again so the agents pick up the tools.

### What each agent can use now

| Agent | Search tools after relaunch |
| --- | --- |
| Talent Researcher (Claude) | Exa discovery, Parallel search and research, Sider Scholar for papers, plus built-in web fetch as fallback |
| Candidate Analyst (Codex) | Isolated Codex session with Sider Scholar for paper checks. No Lever or mail. |
| Automation Engineer (Cursor) | Cursor tools for repo work only. No Exa or Parallel spend from this role. |
| Talent Chief (Claude) | Routes work. Does not run Exa or Parallel itself. |

### How to prove it

After relaunch, click Talent Chief and send: Find 3 Bay Area builders with public evidence they personally built an LLM or agent system. Research only.

Researcher should return people with direct public source links. If the terminal mentions talent-exa or talent-parallel-search, the wiring worked.

### Sider Scholar

Sider Scholar is on Talent Researcher and Candidate Analyst. It looks up publications. A paper is not hands-on GenAI evidence. Wisebase uploads stay off.

This tool uses your ChatGPT login. If an agent says it needs to reauthenticate, open Codex or ChatGPT, reconnect Sider Scholar, then relaunch the Runtime.

Lever, Gmail, and calendar stay disconnected.

---

## The files

The folder list is the team's filing cabinet. You do not need to open these files to run the floor. They are how the agents pass work to each other.

### Files you might actually open

| File | Plain meaning |
| --- | --- |
| board.md | Shared plan and current mission |
| tasks.json | The to-do list with owners and blockers |
| AI_FUND_TALENT_CONTEXT.md | Standing EIR rules every agent must follow |
| talent-permissions.json | What each role is allowed to do |
| hive/task-outputs/ | Finished reports for you to read |

### Each agent's desk

| Folder or file | Plain meaning |
| --- | --- |
| identity.md | Job description |
| memory.md | Standing notes. No candidate names. |
| inbox/ | Messages waiting for that agent |
| outbox/ | Messages that agent is sending |
| cursor.json / settings.json | How that agent's session is configured |

### Team status files

| File | Plain meaning |
| --- | --- |
| roster.json | Saved snapshot of who is on the team |
| roster-backups/ | Older snapshots. Safe to ignore. |
| registry.json | Official roster, including archived agents |
| fleet.json | Who is on the floor right now |
| log.jsonl | Event log. Ignore unless debugging. |
| spawn-requests/ | Request to bring a specialist back or add a temp worker |

### Plumbing. Ignore these.

hive/bin, hive-node, hive-proxy.cjs, cth-hook.cjs, TALENT_POLICY.cjs, PROTOCOL.md, and COMMANDS.md are the mail system and the rule checker. They move messages between desks. They are not something you operate by hand.

The dated JSON files in inbox folders are individual messages. A timestamp plus a short code is one envelope. When an agent finishes a message, it should move that file into inbox/.done/.

---

## Right now (24 Aug 2026)

Talent Chief started a read-only test: 10 Bay Area builders with verifiable hands-on GenAI evidence. Nobody is contacted. Nothing is written to Lever, email, or any candidate system.

### Work in flight

| Item | Status | Why |
| --- | --- | --- |
| t-003 Dry run of 10 Bay Area builders | Doing | Waiting on discovery, then QA, then a local report |
| t-004 Researcher discovery of 14-16 people | Stalled | Five unread inbox messages, including a circuit-breaker warning |
| t-005 Analyst QA | Blocked | Needs the evidence file, and Candidate Analyst is archived |
| t-002 Current venture roster | Blocked | Needed for real EIR fit work. Not needed for this dry run |

### Decisions only you can make

| Ask | Choices |
| --- | --- |
| Who runs QA now that Candidate Analyst is archived? | Bring the Analyst back, route QA to Automation Engineer, or hold at the evidence stage |
| When do you want real EIR fit work? | Paste the current venture idea list from a current source before that pass starts |

### What a healthy first run looks like

You message Talent Chief with a tight brief. Cards at the bottom change from idle to working. Speech bubbles move. A report appears under hive/task-outputs. Chief messages you only if a rule or a missing input blocks the result.

After a relaunch, Talent Researcher uses Exa, Parallel, and Sider Scholar. Candidate Analyst can check papers through Sider Scholar. A shortlist is still research output, not outreach approval.
