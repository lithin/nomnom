# Deploy runbook — publishing NomNom

Publishing a new version = **deploy the backend** to Cloud Run (including DB
migrations) + **build the app** with EAS.

## Prerequisites

- `gcloud` authenticated with access to project `nomnom452` (region `us-west2`)
- `terraform`, `docker` (daemon running, with `buildx`), `openssl`, `npm`
- Logged into EAS (`eas whoami`) as the app owner (`lithin`) for app builds
- `infra/terraform.tfvars` present (see `infra/terraform.tfvars.example`)

## 1. Point at the code you intend to ship

The deploy builds the Docker image and applies migrations from your **local
working tree**, so check out the exact commit you want to release (normally
latest `master`) and regenerate the Prisma client on disk first:

```bash
npx prisma generate --schema backend/prisma/schema.prisma
```

The Docker build copies `backend/src/generated/` (it is not regenerated inside
the image), so a stale client ships stale code.

## 2. Deploy the backend — from the checkout that holds Terraform state

```bash
npm run deploy:backend
```

> **Important:** `infra/` uses **local** Terraform state
> (`infra/terraform.tfstate`, gitignored — there is no remote backend). Run the
> deploy from the checkout where that state lives. A fresh clone or a git
> worktree has no state, so Terraform will try to **recreate** the
> already-existing Cloud Run service / Artifact Registry repo and fail. Run from
> your primary checkout, or migrate the state to a remote backend (recommended
> long-term).

`infra/deploy_backend.sh` runs, in order:

1. Configure Docker auth for Artifact Registry
2. Apply Prisma migrations to prod (`prisma migrate deploy`; `DATABASE_URL`
   pulled from Secret Manager `nomnom-database-url-prod`)
3. Build & push the `linux/amd64` image
4. Ensure the backend API-key secret exists
5. `terraform apply`

**Verify:**

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://nomnom-backend-k2hyz7s5la-wl.a.run.app/health   # -> 200
gcloud run services describe nomnom-backend --region us-west2 --project nomnom452 \
  --format='value(status.latestReadyRevisionName)'
```

## 3. Build the app (EAS)

```bash
cd app && npx eas-cli build --platform android --profile preview --non-interactive --no-wait
```

- `EXPO_PUBLIC_API_URL` comes from the `eas.json` build profile;
  `EXPO_PUBLIC_BACKEND_API_KEY` is a **Secret** EAS environment variable set per
  environment. Neither comes from a local `app/.env` (that only affects local
  Metro).
- The `production` profile auto-increments the version and is for store builds.

## Troubleshooting production migrations

`prisma migrate deploy` here is **not** guaranteed transactional per migration —
a failed migration can leave partially-created objects **and** an unresolved
failed row in `_prisma_migrations` that blocks all future deploys with `P3018`.

Recovery:

1. Mark the failed migration rolled back (from `backend/`):
   ```bash
   DATABASE_URL="$(gcloud secrets versions access latest --secret=nomnom-database-url-prod --project nomnom452)" \
     npx prisma migrate resolve --rolled-back <migration_name>
   ```
2. Drop any partial/orphaned objects the failed migration created — **check they
   are empty first**.
3. Re-run `npm run deploy:backend`.

Notes:

- The prod database (Neon) uses **`uuid`** id columns; `schema.prisma` marks them
  `@db.Uuid`. Any new id / foreign-key column must be `uuid` to match, or FK
  creation fails with `incompatible types: text and uuid`.
- Neon can return a transient `P1001` ("can't reach database server") — just
  retry; a connection failure does not change migration state.
