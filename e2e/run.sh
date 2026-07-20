#!/usr/bin/env bash
# Runs the e2e suite: mock API + Expo dev server + Maestro flows on the iOS simulator.
# Usage: npm run e2e   (or: bash e2e/run.sh [flow-file])
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOCK_PORT="${MOCK_API_PORT:-4001}"
# 8082 by default so e2e runs don't clash with a regular `expo start` on 8081.
METRO_PORT="${METRO_PORT:-8082}"
FLOWS="${1:-$ROOT/e2e/flows}"

MOCK_PID=""
EXPO_PID=""

cleanup() {
  # Kill by listening port too: killing the subshell PID alone leaves the
  # spawned expo/node children running.
  [[ -n "$MOCK_PID" ]] && kill "$MOCK_PID" 2>/dev/null || true
  [[ -n "$EXPO_PID" ]] && kill "$EXPO_PID" 2>/dev/null || true
  lsof -ti tcp:"$METRO_PORT" 2>/dev/null | xargs kill 2>/dev/null || true
  lsof -ti tcp:"$MOCK_PORT" 2>/dev/null | xargs kill 2>/dev/null || true
}
trap cleanup EXIT

wait_for_url() {
  local url="$1" label="$2" attempts="${3:-60}"
  for _ in $(seq 1 "$attempts"); do
    if curl -sf "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "Timed out waiting for $label at $url" >&2
  return 1
}

if ! command -v maestro >/dev/null 2>&1; then
  echo "Maestro is not installed. Run: brew install mobile-dev-inc/tap/maestro" >&2
  exit 1
fi

if lsof -ti tcp:"$METRO_PORT" >/dev/null 2>&1; then
  echo "Port $METRO_PORT is already in use (another Metro/Expo instance?). Stop it first." >&2
  exit 1
fi

echo "==> Starting mock API on port $MOCK_PORT"
node "$ROOT/e2e/mock-server/server.mjs" &
MOCK_PID=$!
wait_for_url "http://localhost:$MOCK_PORT/health" "mock API" 15

echo "==> Starting Expo dev server (app pointed at the mock API)"
export EXPO_PUBLIC_API_URL="http://localhost:$MOCK_PORT"
export EXPO_PUBLIC_BACKEND_API_KEY="e2e-mock-key"
export CI=1
(cd "$ROOT/app" && npx expo start --ios --port "$METRO_PORT" >/tmp/nomnom-e2e-expo.log 2>&1) &
EXPO_PID=$!
wait_for_url "http://localhost:$METRO_PORT/status" "Metro" 120

echo "==> Waiting for Expo Go on the simulator"
for _ in $(seq 1 120); do
  if xcrun simctl listapps booted 2>/dev/null | grep -q "host.exp.Exponent"; then
    break
  fi
  sleep 2
done
if ! xcrun simctl listapps booted 2>/dev/null | grep -q "host.exp.Exponent"; then
  echo "Expo Go did not install on the simulator. See /tmp/nomnom-e2e-expo.log" >&2
  exit 1
fi

# Pin Maestro to the booted iOS simulator so it never picks up a running
# Android emulator or another device.
IOS_UDID="$(xcrun simctl list devices booted | grep -Eo '[0-9A-F]{8}-[0-9A-F-]{27}' | head -1)"
if [[ -z "$IOS_UDID" ]]; then
  echo "No booted iOS simulator found." >&2
  exit 1
fi

# Suppress Expo Go's first-run developer-menu sheet, which otherwise covers
# the app UI. The storage key differs across Expo Go versions, so seed all
# known candidates; the launch subflow also dismisses the sheet as a fallback.
for key in EXDevMenuIsOnboardingFinished EXDevMenuIsOnboardingFinishedKey isOnboardingFinished; do
  xcrun simctl spawn "$IOS_UDID" defaults write host.exp.Exponent "$key" -bool true 2>/dev/null || true
done
xcrun simctl terminate "$IOS_UDID" host.exp.Exponent 2>/dev/null || true

echo "==> Running Maestro flows on simulator $IOS_UDID: $FLOWS"
maestro --device "$IOS_UDID" test -e METRO_PORT="$METRO_PORT" "$FLOWS"
