# AI Fund Talent Runtime

Private, local-first multi-agent Talent prototype based on [Munder Difflin](https://github.com/chaitanyagiri/munder-difflin) v0.4.5.

## Launch

On this Mac, double-click **Launch AI Fund Talent Runtime.command**. The app opens the Talent workspace, starts the fixed agent team, and selects Talent Chief as Mike's main interface.

The launcher uses the supported local Node 20 installation, installs missing project dependencies when needed, and starts only a local development build. Nothing is deployed.

## Agent team

- **Talent Chief · Claude Code**: Mike interface, planning, delegation, synthesis, and consequential escalation.
- **Talent Researcher · Claude Code**: cited public research via Exa, Parallel, and Sider Scholar, plus evidence verification.
- **Candidate Analyst · OpenAI Codex**: structured analysis, paper checks via Sider Scholar, deduplication, unsupported-claim review, and second-model QA.
- **Automation Engineer · Cursor Agent**: repository work, tests, debugging, and local workflow automation.

All environments consume the same canonical policy in `AI_FUND_TALENT_CONTEXT.md`. Repository execution rules live in `AGENTS.md`; Claude, Cursor, and Cowork adapters only point to those canonical sources.

## Safety posture

This prototype has no production candidate-system credentials. Candidate outreach, ATS/CRM changes, candidate-record writes, and production-data writes fail closed through `resources/talent-policy.cjs`. Research outputs stay local and read-only. Candidate-specific information belongs in task output, never general agent memory.

## Verification

The standard local checks are:

- prerequisite availability: `npm run talent:check`
- type checking: `npm run typecheck`
- focused automated tests: `npm run test:focused`
- production compilation: `npm run build`

Node 20, 21, or 22 is required because upstream native dependencies do not build on Node 26.

## Upstream and licensing

`origin` is the private prototype repository. `upstream` remains `chaitanyagiri/munder-difflin` so future stable fixes can be reviewed safely. Baseline and update procedure are recorded in `docs/UPSTREAM_BASELINE.md` and `docs/UPSTREAM_UPDATE.md`.

The Munder source remains MIT licensed. The separately licensed LimeZu office assets and derived maps were removed; this fork uses original minimal Talent office tiles and a programmatic map. The original upstream README is preserved in `docs/UPSTREAM_README.md` for architecture reference.
