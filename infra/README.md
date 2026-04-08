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

## Backend build and push

From repo root:

```bash
gcloud auth configure-docker us-west2-docker.pkg.dev

docker build -t us-west2-docker.pkg.dev/<PROJECT_ID>/nomnom/backend:latest ./backend
docker push us-west2-docker.pkg.dev/<PROJECT_ID>/nomnom/backend:latest
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

The backend uses only `DATABASE_URL`.

## Current mapping

- `backend/.env` -> `DATABASE_URL` -> Neon `development` branch database `nomnom_dev`
- Cloud Run env var `DATABASE_URL` -> Secret Manager secret `nomnom-database-url-prod` -> Neon `production` branch database `nomnom_prod`

Secret names are hardcoded in `main.tf` for this project:

- `nomnom-database-url-prod`
- `nomnom-gemini-api-key`
