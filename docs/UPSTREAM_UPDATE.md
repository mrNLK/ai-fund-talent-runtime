# Updating from Munder Difflin

An agent owns this maintenance. Mike should not perform Git operations.

1. Fetch `upstream` and inspect release notes and the commit range since the recorded baseline.
2. Create a focused update branch from current `main`.
3. Merge the chosen stable upstream tag while preserving the AI Fund policy, team bootstrap, original replacement art, branding, and permission boundary.
4. Resolve mechanical conflicts directly. Surface only semantic product or security conflicts that require Mike's judgment.
5. Run type checks, focused tests, the production build, policy tests, and a local launch check.
6. Review for secrets and generated junk, then open and review a private pull request.
7. Merge only after the checks pass and update `docs/UPSTREAM_BASELINE.md`.
