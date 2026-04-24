# Terraform Cloud Run Deployment

This Terraform stack deploys the backend to Cloud Run and injects production secrets from Secret Manager.

## What it manages

- Required Google APIs (`run.googleapis.com`, `secretmanager.googleapis.com`)
- Cloud Run service (`google_cloud_run_v2_service`)
- Optional public invoker IAM binding (`roles/run.invoker`)

## Prerequisites

- `gcloud` authenticated to your target project
- `terraform` v1.6+
- Artifact Registry repository for container images
- Secret Manager secrets:
  - `nomnom-database-url-prod` (Neon production DB URL)
  - `nomnom-gemini-api-key`
  - `nomnom-backend-api-key` (request auth key between app and backend, auto-created by deploy script if missing)

## Backend deploy (build, secret handling, Terraform apply)

From repo root:

```bash
npm run deploy:backend
```

The script `infra/deploy_backend.sh` does all of the following:

- Builds and pushes the backend image from `infra/terraform.tfvars` `container_image`
- Reuses `nomnom-backend-api-key` if it already exists
- Creates `nomnom-backend-api-key` and generates a key if it does not exist
- Runs `terraform init` and `terraform apply`

## Manual backend build and push

From repo root:

```bash
npm run docker:backend:push
```

## Terraform deploy

```bash
cd infra
# edit terraform.tfvars with your values

terraform init
terraform plan
terraform apply
```

Cloud Run URL is available as output `cloud_run_service_url`.

## Neon environment mapping

Use separate Neon branches/databases and map them to backend envs:

- Local development: set `DATABASE_URL` in `backend/.env` (point it to Neon dev DB)
- Cloud Run production: set `DATABASE_URL` in Secret Manager (point it to Neon prod DB)

Backend runtime env vars are `DATABASE_URL`, `GEMINI_API_KEY`, and `BACKEND_API_KEY`.

## Current mapping

- `backend/.env` -> `DATABASE_URL`, `GEMINI_API_KEY`, `BACKEND_API_KEY` -> local backend runtime
- Cloud Run env var `DATABASE_URL` -> Secret Manager secret `nomnom-database-url-prod` -> Neon `production` branch database `nomnom_prod`
- Cloud Run env var `GEMINI_API_KEY` -> Secret Manager secret `nomnom-gemini-api-key`
- Cloud Run env var `BACKEND_API_KEY` -> Secret Manager secret `nomnom-backend-api-key`

Secret names are hardcoded in `main.tf` for this project:

- `nomnom-database-url-prod`
- `nomnom-gemini-api-key`
- `nomnom-backend-api-key`

## App environment

The app must include these environment variables:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_BACKEND_API_KEY`

All app backend requests send `x-api-key` using `EXPO_PUBLIC_BACKEND_API_KEY`.
