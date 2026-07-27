# Repository AI Rules

After every code change, the AI must ensure all three checks pass before considering the task complete:

1. `npm run biome:check`
2. `npm run typecheck`
3. `npm run test:integration` — backend integration tests (fast, in-memory; see `backend/test/`)

If any check fails, the AI must fix the issue and rerun the checks until all pass.

Backend integration tests call the real Express app over HTTP and assert response payloads. They must never call external services: the database is an in-memory prismock client and `backend/test/setup.ts` blocks all non-loopback network requests. Mock at the module boundary instead of loosening that guard.

## Before creating a PR

Before creating a pull request, run the backend integration tests and the full e2e suite locally and make sure both pass:

```sh
npm run test:integration
npm run e2e
```

This drives the app in the iOS simulator with Maestro against a mocked backend (see `app/e2e/README.md`). If any flow fails, fix the regression and rerun until green — do not open the PR with failing e2e tests.

## Runbooks

Operational runbooks — deploy, release, migration recovery, and any other repeatable procedure — live in the repository under `docs/runbooks/*.md`. They must **never** live only in an assistant's or contributor's private notes or memory: a runbook that isn't checked in isn't shared, versioned, or reviewable. Whenever you work out such a procedure (or learn a non-obvious gotcha while running one), write it down under `docs/runbooks/` and commit it. Start with [`docs/runbooks/deploy.md`](docs/runbooks/deploy.md).

## Styling

Component colors must always come from the theme (`app/src/theme/config.ts`, via `useTheme()` or `$token` props) rather than hardcoded values, unless specified otherwise.
