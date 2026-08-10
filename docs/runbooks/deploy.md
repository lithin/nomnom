# Deploy runbook

How to ship the latest `master` to production and cut an app build. Covers the
backend (Cloud Run) and the mobile app (EAS).

## TL;DR

```sh
# from repo root, on an up-to-date master
npm run check && npm run test:integration && npm run e2e   # gate
npm run deploy:backend                                     # backend -> Cloud Run (rolls + verifies the image)

# Android preview APK (only if app changed) — pick ONE:
npm run --prefix app build:android:local                   # local build, no EAS queue -> app/build/nomnom-preview.apk
npm run --prefix app build:android:preview                 # EAS cloud build (free tier may queue)
```

> 🤝 **When deploying from latest `master`, decide the app build up front:**
> **local** (`build:android:local`, compiles here, no queue) or **EAS cloud**
> (`build:android:preview`, runs on Expo's servers). See
> [§2 Build the app](#2-build-the-app-local-or-eas). If you're driving this via
> an assistant, it should ask which one you want before building.

> ℹ️ `npm run deploy:backend` now rolls the new image and verifies the serving
> digest for you (see the "`:latest` tag gotcha" section for why that step
> exists and how to recover if a deploy ever serves a stale image).

## Prerequisites

- `gcloud` authenticated to a principal with access to project `nomnom452`
  (`gcloud config get-value account`). The deploy script targets `nomnom452`
  explicitly, so your active gcloud project can be anything.
- `terraform`, `docker` (daemon running), `openssl`, `npm` on PATH.
- Docker can build `linux/amd64` (buildx). On Apple Silicon this is an emulated
  cross-build and takes a few minutes.
- EAS: logged in (`npx eas-cli whoami` → your Expo account with access to
  `@lithin/nomnom`).
- Secret Manager secrets already exist in `nomnom452`:
  `nomnom-database-url-prod`, `nomnom-gemini-api-key`, `nomnom-backend-api-key`,
  `nomnom-unsplash-access-key`. See [infra/README.md](../../infra/README.md).
  Note that `nomnom-gemini-api-key` holds an AI Studio key that belongs to a
  **second** GCP project — see [The two GCP projects](#the-two-gcp-projects).

## 0. Pre-deploy gate

Deploy only from a clean, up-to-date `master` that passes every check:

```sh
git checkout master && git pull
npm run biome:check
npm run typecheck
npm run test:integration   # fast, in-memory
npm run e2e                # Maestro on the iOS simulator; needs a booted sim + `maestro`
```

All four must be green. See [AGENTS.md](../../AGENTS.md) and
[app/e2e/README.md](../../app/e2e/README.md) for details.

## 1. Deploy the backend (Cloud Run)

```sh
npm run deploy:backend      # runs infra/deploy_backend.sh
```

The script (`infra/deploy_backend.sh`):

1. Configures Docker auth for Artifact Registry (`us-west2`).
2. Runs `prisma migrate deploy` against the **production** Neon DB
   (`nomnom_prod`). Idempotent — "No pending migrations to apply" is normal.
3. Builds and pushes `linux/amd64` image to
   `us-west2-docker.pkg.dev/nomnom452/nomnom/backend:latest`.
4. Ensures the API-key + Unsplash secrets exist.
5. Runs `terraform apply` against `infra/`.

### ⚠️ The `:latest` tag gotcha — the deploy does NOT roll a revision on its own

Terraform's `container_image` is the **`:latest` tag string**, which never
changes between deploys. So `terraform apply` sees no image diff and will
**not** create a new Cloud Run revision for a new image — it only rolls a
revision when some *other* attribute (scaling, env, etc.) changes. Cloud Run
pins each revision to an image **digest**, so it keeps serving the old digest
even though `:latest` now points at your freshly-pushed image.

Symptom: the deploy "succeeds", `/health` returns 200, but the new code/feature
is missing — because a months-old revision is still serving. `/health` passing
proves nothing: the old image is healthy too.

`infra/deploy_backend.sh` handles this automatically: after `terraform apply`
it runs `gcloud run services update <service> --image ...:latest` to force a new
revision, then compares the live revision's digest against the pushed `:latest`
digest and **fails the deploy** if they differ. Using the `:latest` **tag** (not
a hardcoded digest) re-resolves to the current digest while staying consistent
with Terraform state, so it does not cause drift.

If you ever push an image out-of-band (e.g. `npm run docker:backend:push`)
without running the full deploy, run the roll manually:

```sh
gcloud run services update nomnom-backend \
  --image us-west2-docker.pkg.dev/nomnom452/nomnom/backend:latest \
  --project nomnom452 --region us-west2 --quiet
```

> A cleaner long-term fix would be to tag images by git SHA and thread that into
> `infra/terraform.tfvars` `container_image`, so Terraform itself rolls the
> revision. The tag-based roll above is the pragmatic version in place today.

### Verify the backend is actually serving the new image

Do not skip this. Confirm the serving revision is pinned to the digest you just
pushed:

```sh
# Digest of the image you just pushed (tagged :latest)
gcloud artifacts docker images list \
  us-west2-docker.pkg.dev/nomnom452/nomnom/backend \
  --include-tags --project nomnom452 \
  --format='table(DIGEST, TAGS, UPDATE_TIME)' --sort-by='~UPDATE_TIME' | head

# Digest the live revision is pinned to — must match :latest above
REV=$(gcloud run services describe nomnom-backend --project nomnom452 \
  --region us-west2 --format='value(status.latestReadyRevisionName)')
gcloud run revisions describe "$REV" --project nomnom452 --region us-west2 \
  --format='value(status.imageDigest, metadata.creationTimestamp)'

# Health + traffic
curl -sS https://nomnom-backend-k2hyz7s5la-wl.a.run.app/health   # {"status":"ok"}
gcloud run services describe nomnom-backend --project nomnom452 --region us-west2 \
  --format='value(status.traffic)'                                # 100% on latest rev
```

The revision's `imageDigest` **must equal** the `:latest` digest and its
`creationTimestamp` should be from this deploy. If it's an old digest/timestamp,
the roll above didn't take — re-run it.

### Rollback

Route traffic back to a known-good revision:

```sh
gcloud run services update-traffic nomnom-backend \
  --to-revisions <good-revision>=100 --project nomnom452 --region us-west2
```

## 2. Build the app (local or EAS)

The app talks to the Cloud Run backend over `EXPO_PUBLIC_API_URL` (baked into
the build profile in [app/eas.json](../../app/eas.json)). Backend-only features
(e.g. the chat agent's recipe **search** tool) ship with the backend deploy and
need **no app rebuild** — the app just calls `/chat`.

Rebuild the app only when app code, native deps, or the profile's env changed.

**Pick a build path** (both use the `preview` profile, so the artifact is
equivalent — same keystore, same `EXPO_PUBLIC_API_URL`):

| | Local (`build:android:local`) | EAS cloud (`build:android:preview`) |
|---|---|---|
| Where it runs | This machine | Expo's servers |
| Queue | None | Free tier can sit in the queue |
| Time (M1 Pro) | ~12–15 min (native C++ compile) | queue + ~10 min build |
| Needs | JDK 17 + Android SDK + `gcloud` (for the key) | Just `eas-cli` login |
| Output | `app/build/nomnom-preview.apk` | Artifact URL from `build:list` |

### 2a. Local build (no queue)

```sh
npm run --prefix app build:android:local
# == app/scripts/build-android-local.sh (eas build --local, preview profile)
```

- Produces exactly one apk at `app/build/nomnom-preview.apk` (the `/build`
  folder is gitignored). The previous apk is deleted only **after** a successful
  new build, so a failed build never leaves you without the last good one.
- **Backend wiring (the reason for the script):** the app needs both
  `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_BACKEND_API_KEY` (sent as `x-api-key`,
  see [app/src/backend/apiConfig.ts](../../app/src/backend/apiConfig.ts)). The
  key lives only in `app/.env` locally (a *local* key) and `.env` is gitignored,
  so `eas build --local` would stage the project without it and the apk couldn't
  authenticate. The script pins the build to the **deployed** backend: the URL
  from the `preview` profile, and the **production** key pulled from Secret
  Manager (`nomnom452/nomnom-backend-api-key`) at build time — never committed.
  So you must be `gcloud`-authed to `nomnom452` (same as the backend deploy).
- The script sets `JAVA_HOME` to JDK 17 and `ANDROID_HOME` for you. RN 0.81 /
  Expo SDK 54 require **JDK 17** — a newer default JDK will fail the Gradle
  build. If you have no JDK 17: `brew install openjdk@17`.
- First run is slowest (native C++ for reanimated/gesture-handler across ABIs).
  An **arm64** JDK 17 avoids the Rosetta penalty on Apple Silicon.
- Install to a booted device/emulator: `adb install -r app/build/nomnom-preview.apk`.

### 2b. EAS cloud build

```sh
# Android internal-distribution preview APK
npm run --prefix app build:android:preview
# == npx eas-cli build --platform android --profile preview

# iOS / production, when needed:
npx eas-cli build --platform ios --profile production
npx eas-cli build --platform all --profile production
```

- Run EAS commands from `app/` (or with `--prefix app`). A stray `cd` into a
  wrong directory makes Expo silently read a default config — verify with
  `npx expo config --type public | grep -E 'slug|owner|projectId'`
  (expect `slug: nomnom`, `owner: lithin`).
- Builds run in EAS's cloud; on the free tier they can sit in the queue a while.
- Grab the artifact when done:

```sh
npx eas-cli build:list --platform android --limit 1
# Application Archive URL is the installable .apk
```

> iOS and production builds have no local path here — they go through EAS
> (`build:android:local` is Android preview only).

## The two GCP projects

There are **two** GCP projects with nomnom-ish names, both on the same billing
account (`015052-A910CE-640B19`). This is intentional, not a leftover — do not
delete or "consolidate" either without a deliberate migration:

| Project ID | Display name | What it holds |
| --- | --- | --- |
| `nomnom452` | `nomnom` | **The app infrastructure.** Cloud Run (`nomnom-backend`), Secret Manager, Artifact Registry (`nomnom` Docker repo). Everything in this repo and this runbook targets `nomnom452`. |
| `gen-lang-client-0112145441` | `NomNom` | **Gemini LLM inference only.** The only real API enabled is `generativelanguage.googleapis.com`. The `nomnom-gemini-api-key` secret in `nomnom452` is an AI Studio key issued from *this* project, so LLM calls bill here. |

Consequences to keep in mind:

- **`nomnom452` is the correct project** for deploys, secrets, and images.
  Reading secrets from it is expected.
- **Most of the GCP bill lands on `gen-lang-client-0112145441`**, because LLM
  tokens cost far more than the small Cloud Run backend. That's normal. The
  `gen-lang-client-…` name is auto-generated by Google AI Studio when the Gemini
  key was created.
- The Gemini API is **not** enabled on `nomnom452`; the app relies on the
  cross-project AI Studio key stored in the `nomnom-gemini-api-key` secret.
- Cost figures aren't visible from `gcloud` — check the
  [Billing reports](https://console.cloud.google.com/billing) console (filter by
  project) if Gemini spend ever looks off.

## Environments / references

- Backend prod URL: `https://nomnom-backend-k2hyz7s5la-wl.a.run.app`
- GCP project `nomnom452`, region `us-west2`, service `nomnom-backend`
  (Gemini inference bills to `gen-lang-client-0112145441` — see
  [The two GCP projects](#the-two-gcp-projects))
- EAS project `@lithin/nomnom` (`projectId` in `app/app.json`)
- Infra details, secret mapping, Neon branches: [infra/README.md](../../infra/README.md)
