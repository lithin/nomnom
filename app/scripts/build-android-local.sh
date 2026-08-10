#!/usr/bin/env bash
#
# Build an Android "preview" APK entirely on this machine (no EAS cloud queue).
#
# Runs the same `preview` profile from eas.json via `eas build --local`, so the
# artifact is equivalent to the cloud build (same keystore) — it just compiles
# here instead of waiting in the free-tier queue. See docs/runbooks/deploy.md.
#
# Backend wiring (why this script exists rather than a bare eas command): the app
# needs BOTH EXPO_PUBLIC_API_URL and EXPO_PUBLIC_BACKEND_API_KEY (sent as the
# x-api-key header, see app/src/backend/apiConfig.ts). The key is a secret and
# lives only in app/.env locally (a *local* key) — which is gitignored, so
# `eas build --local` stages the project WITHOUT it and the app can't auth
# against the deployed backend. This script pins the build to the deployed
# backend: URL from the preview profile, and the *production* key pulled from
# Secret Manager at build time (never committed). Expo inlines EXPO_PUBLIC_*
# into the JS bundle, so both end up baked into the apk.
#
# Output: app/build/nomnom-preview.apk  (app/build/ is gitignored)
# We keep exactly ONE apk: any previous build is deleted once the new one lands.

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$APP_DIR/build"
OUT="$BUILD_DIR/nomnom-preview.apk"
TMP="$BUILD_DIR/.nomnom-preview.apk.tmp"
PROFILE="${1:-preview}"

# Deployed backend + prod key source (keep in sync with infra/deploy_backend.sh).
GCP_PROJECT="nomnom452"
BACKEND_API_KEY_SECRET="nomnom-backend-api-key"

# --- Toolchain: RN 0.81 / Expo SDK 54 needs JDK 17 and the Android SDK ---
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
if [ ! -d "$ANDROID_HOME" ]; then
  echo "error: Android SDK not found at ANDROID_HOME=$ANDROID_HOME" >&2
  exit 1
fi

if JH="$(/usr/libexec/java_home -v 17 2>/dev/null)"; then
  export JAVA_HOME="$JH"
else
  echo "error: no JDK 17 found. Install one, e.g. 'brew install openjdk@17'." >&2
  exit 1
fi
export PATH="$ANDROID_HOME/platform-tools:$PATH"

# --- Backend: pin the build to the DEPLOYED backend + the PRODUCTION api key ---
# URL: read from the preview profile so eas.json stays the single source of truth
# and a stale EXPO_PUBLIC_API_URL in the caller's shell (e.g. a localhost value
# sourced from app/.env) can't leak into the build.
EXPO_PUBLIC_API_URL="$(node -e "process.stdout.write(require('$APP_DIR/eas.json').build.preview.env.EXPO_PUBLIC_API_URL)")"
if [ -z "${EXPO_PUBLIC_API_URL:-}" ]; then
  echo "error: EXPO_PUBLIC_API_URL not found in eas.json build.preview.env" >&2
  exit 1
fi
export EXPO_PUBLIC_API_URL

# Key: pull the production key from Secret Manager at build time. Never commit it.
if ! command -v gcloud >/dev/null 2>&1; then
  echo "error: gcloud not found; needed to fetch the backend API key ($BACKEND_API_KEY_SECRET)." >&2
  exit 1
fi
if ! EXPO_PUBLIC_BACKEND_API_KEY="$(gcloud secrets versions access latest \
      --secret="$BACKEND_API_KEY_SECRET" --project="$GCP_PROJECT" 2>/dev/null)"; then
  echo "error: could not read secret '$BACKEND_API_KEY_SECRET' from project '$GCP_PROJECT'." >&2
  echo "       Run 'gcloud auth login' and confirm access to '$GCP_PROJECT', then retry." >&2
  exit 1
fi
if [ -z "${EXPO_PUBLIC_BACKEND_API_KEY:-}" ]; then
  echo "error: fetched backend API key is empty." >&2
  exit 1
fi
export EXPO_PUBLIC_BACKEND_API_KEY

echo "JAVA_HOME=$JAVA_HOME"
echo "ANDROID_HOME=$ANDROID_HOME"
echo "backend=$EXPO_PUBLIC_API_URL  key=${EXPO_PUBLIC_BACKEND_API_KEY:0:3}**** (from $GCP_PROJECT/$BACKEND_API_KEY_SECRET)"
echo "profile=$PROFILE  ->  $OUT"

mkdir -p "$BUILD_DIR"
rm -f "$TMP"

# Build locally to a temp path so a mid-build failure never clobbers the last
# good apk. Only on success do we swap it in and drop the previous one.
cd "$APP_DIR"
npx eas-cli build \
  --platform android \
  --profile "$PROFILE" \
  --local \
  --non-interactive \
  --output "$TMP"

# Success: remove every older apk, then promote the fresh build. Keeping exactly
# one artifact avoids installing a stale apk by accident.
find "$BUILD_DIR" -maxdepth 1 -name '*.apk' ! -name "$(basename "$TMP")" -delete
mv -f "$TMP" "$OUT"

echo ""
echo "Built: $OUT ($(du -h "$OUT" | cut -f1))"
echo "Install to a booted device/emulator: adb install -r \"$OUT\""
