# E2E tests

End-to-end tests drive the real app in the iOS simulator using
[Maestro](https://maestro.mobile.dev/), with all backend API calls served by a
local mock server so runs are fast, deterministic, and never touch real data.

## How it works

- `mock-server/server.mjs` — dependency-free Node server that mimics the
  backend endpoints (`/recipes`, `/chat`, `/chats`, …) with fixed fixtures.
  State is in-memory and resets on start; `POST /__reset` resets it mid-run.
  Response shapes must mirror `backend/src/endpoints/*` — update both together.
- `flows/*.yaml` — Maestro flows, one scenario per file. `flows/common/` holds
  reusable subflows (e.g. `launch-app.yaml`, which opens the app in Expo Go and
  dismisses Expo Go's onboarding sheet); `flows/config.yaml` limits test
  discovery to top-level files and disables retries.
- `run.sh` — orchestrates a run: starts the mock server, starts the Expo dev
  server with `EXPO_PUBLIC_API_URL` pointing at the mock, boots the iOS
  simulator with Expo Go, then runs all flows.

## Running

```sh
npm run e2e                 # run all flows (from repo root or app/)
bash app/e2e/run.sh app/e2e/flows/recipe-edit-opens-prepopulated-chat.yaml   # single flow
```

Prerequisites (one-time):

- Xcode with an iOS simulator
- Maestro: `brew install mobile-dev-inc/tap/maestro`

Expo Go is installed on the simulator automatically on first run. Logs from
the Expo dev server go to `/tmp/nomnom-e2e-expo.log`.

## Writing flows

- Prefer matching on visible text or accessibility labels; add
  `accessibilityLabel` to icon-only buttons rather than matching coordinates.
- Fixtures live in `mock-server/server.mjs`; keep them small and name IDs with
  an `e2e-` prefix.
- Every regression that slips through to `master` should get a flow here.
