# Repository AI Rules

These rules apply repo-wide. `app/AGENTS.md` and `backend/AGENTS.md` add rules
specific to those workspaces. (Claude Code reads these via the sibling
`CLAUDE.md` symlinks.)

## Checks after every change

After every code change, ensure all three pass before considering the task complete:

1. `npm run biome:check`
2. `npm run typecheck`
3. `npm run test:integration` — backend integration tests (fast, in-memory; see `backend/test/`)

If any check fails, fix the issue and rerun the checks until all pass.

Backend integration tests call the real Express app over HTTP and assert response payloads. They must never call external services: the database is an in-memory prismock client and `backend/test/setup.ts` blocks all non-loopback network requests. Mock at the module boundary instead of loosening that guard.

## Before creating a PR

Keep each PR to a single logical change. If the working changes cover several unrelated things — e.g. a dependency upgrade plus an unrelated bug fix — split them into separate PRs (separate branches off `master`) so each can be reviewed, and reverted, on its own.

Before creating a pull request, run the backend integration tests and the full e2e suite locally and make sure both pass:

```sh
npm run test:integration
npm run e2e
```

This drives the app in the iOS simulator with Maestro against a mocked backend (see `app/e2e/README.md`). If any flow fails, fix the regression and rerun until green — do not open the PR with failing e2e tests.

## Code organization

These apply to both workspaces:

- One logical unit per file. Split a file into its own files when it grows to hundreds of lines, or when it holds concerns that are logically separate.
- Extract generic, widely reused logic, hooks, and components into their own files.
- Group by domain/topic (e.g. a `chat` folder), not by file type. Avoid top-level `components/` or `hooks/` buckets.

## Skills

Vendored skills live in `.claude/skills/` (Claude Code discovers them automatically); see `.claude/skills/README.md` for origins and how to update them.

- Backend: `neon-postgres` — the Neon serverless Postgres database the backend uses.
- App: `react-navigation`, `expo-data-fetching`, `expo-project-structure`, `expo-upgrade`, `react-native-best-practices`.
- Release: `eas-workflows`, `eas-app-stores`.
