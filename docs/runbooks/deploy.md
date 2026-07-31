# Deploy runbook

How to ship the latest `master` to production and cut an app build. Covers the
backend (Cloud Run) and the mobile app (EAS).

## TL;DR

```sh
# from repo root, on an up-to-date master
npm run check && npm run test:integration && npm run e2e   # gate
npm run deploy:backend                                     # backend -> Cloud Run
# ⚠️ MANDATORY: force Cloud Run to roll the new image (see "`:latest` tag gotcha")
gcloud run services update nomnom-backend \
  --image us-west2-docker.pkg.dev/nomnom452/nomnom/backend:latest \
  --project nomnom452 --region us-west2 --quiet
npm run --prefix app build:android:preview                 # Android preview APK (only if app changed)
```

> ⚠️ **Read the "`:latest` tag gotcha" section before trusting a backend
> deploy.** `npm run deploy:backend` alone does **not** reliably roll a new
> Cloud Run revision. You must force the revision to roll and then verify the
> serving digest.

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

**You must force Cloud Run to re-resolve `:latest` after every backend deploy:**

```sh
gcloud run services update nomnom-backend \
  --image us-west2-docker.pkg.dev/nomnom452/nomnom/backend:latest \
  --project nomnom452 --region us-west2 --quiet
```

Using the `:latest` **tag** (not a hardcoded digest) re-resolves to the current
digest and creates a new revision, while staying consistent with what Terraform
holds in state — so it does not cause Terraform drift.

> Proper fix (not yet applied): tag images by git SHA and pass that into
> `infra/terraform.tfvars` `container_image`, or add the `gcloud run services
> update` step above to `infra/deploy_backend.sh`. Until then, this manual roll
> is mandatory.

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

## 2. Build the app (EAS)

The app talks to the Cloud Run backend over `EXPO_PUBLIC_API_URL` (baked into
the build profile in [app/eas.json](../../app/eas.json)). Backend-only features
(e.g. the chat agent's recipe **search** tool) ship with the backend deploy and
need **no app rebuild** — the app just calls `/chat`.

Rebuild the app only when app code, native deps, or the profile's env changed.

```sh
# Android internal-distribution preview APK (the wired-up script)
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

## Environments / references

- Backend prod URL: `https://nomnom-backend-k2hyz7s5la-wl.a.run.app`
- GCP project `nomnom452`, region `us-west2`, service `nomnom-backend`
- EAS project `@lithin/nomnom` (`projectId` in `app/app.json`)
- Infra details, secret mapping, Neon branches: [infra/README.md](../../infra/README.md)
