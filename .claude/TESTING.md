# How to run the tests (a note to future me)

Run everything from the **repo root** unless noted. `npm run check` covers the
two fast gates; the other two layers are separate.

| What | Command | Speed | Needs |
| --- | --- | --- | --- |
| Lint + format | `npm run biome:check` | instant | — |
| Types (backend + app) | `npm run typecheck` | seconds | — |
| Both of the above | `npm run check` | seconds | — |
| Backend integration tests | `npm run test:integration` | ~2s | — |
| App e2e (Maestro) | `npm run e2e` | ~1min | iOS simulator + Maestro |

`AGENTS.md` (root/app/backend) is the source of truth for what must pass. Before
a PR: `npm run test:integration` **and** `npm run e2e` both green.

## Backend integration tests — `npm run test:integration`

Vitest + supertest hitting the real Express app over HTTP; DB is an in-memory
prismock and `backend/test/setup.ts` blocks all non-loopback network. Tests live
in `backend/test/`. Never loosen the network guard — mock at the module boundary.
Single file: `npm run -w backend test -- recipes`.

## App e2e — `npm run e2e`

Drives the app in the iOS simulator with **Maestro** against a mock backend, so
runs are deterministic and never touch real data. Everything lives in `app/e2e/`
(`run.sh`, `mock-server/server.mjs`, `flows/*.yaml`). `npm run e2e` delegates to
`app`; internally it's `bash app/e2e/run.sh`.

**Prerequisites (one-time):**
- Xcode with an iOS simulator, and **a simulator already booted** (`open -a Simulator`).
- Maestro: `brew install mobile-dev-inc/tap/maestro` (check with `maestro --version`).

**Run a single flow** (much faster while iterating):
`bash app/e2e/run.sh app/e2e/flows/recipe-list-detail-back-returns-to-list.yaml`

**What `run.sh` does:** starts the mock API on :4001, starts Expo on :8082 (not
:8081, to avoid a normal `expo start`), boots Expo Go on the simulator, runs the
Maestro flows, then tears it all down. Port :8082 must be free or it aborts.

**Gotchas I actually hit (don't relearn these):**
- **The app must point at the mock, not a real backend.** `EXPO_PUBLIC_*` is
  inlined by Metro from `.env` files, which shadows env vars. A local `app/.env`
  pointing at `localhost:8080` will silently make flows hit the real backend and
  fail with "fixture not found". `run.sh` handles this by writing a gitignored
  `app/.env.local` (higher precedence) at the mock and deleting it on exit — so
  don't "fix" flows by editing fixtures if you see real recipe titles; check the
  Expo log at `/tmp/nomnom-e2e-expo.log` for the fetch URL first.
- **Debug artifacts (incl. screenshots) land in `~/.maestro/tests/<timestamp>/`.**
  When a flow fails, open the `screenshot-❌-*.png` there first — it's faster than
  guessing.
- **Flows must cold-start.** `flows/common/launch-app.yaml` does `stopApp` before
  `openLink` so each flow starts on the Chat tab; without it a second flow just
  foregrounds wherever the last one ended.
- **`back` / edge-swipe don't pop a native-stack screen on iOS** (Maestro can't
  synthesize the screen-edge gesture). Tap the header back button by point
  instead (see the recipe-detail flows).
- **A markdown link inside a sentence merges into the paragraph's text node**, so
  Maestro can't match or reliably tap just the link text. If a flow needs to tap
  a link, make the mock reply the bare link (see `mock-server` POST `/chat`).
- Mock response shapes must mirror `backend/src/endpoints/*` — update both together.
