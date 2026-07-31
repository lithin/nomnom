#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TFVARS_FILE="${SCRIPT_DIR}/terraform.tfvars"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1" >&2
    exit 1
  fi
}

require_cmd gcloud
require_cmd terraform
require_cmd docker
require_cmd openssl
require_cmd npm

if [[ ! -f "${TFVARS_FILE}" ]]; then
  echo "Missing ${TFVARS_FILE}. Copy terraform.tfvars.example and fill required values." >&2
  exit 1
fi

extract_tfvar() {
  local key="$1"
  local value
  value=$(sed -nE "s/^${key}[[:space:]]*=[[:space:]]*\"([^\"]+)\"/\1/p" "${TFVARS_FILE}" | head -n1)
  echo "${value}"
}

PROJECT_ID="$(extract_tfvar project_id)"
REGION="$(extract_tfvar region)"
CONTAINER_IMAGE="$(extract_tfvar container_image)"
BACKEND_API_KEY_SECRET_NAME="nomnom-backend-api-key"
DATABASE_URL_SECRET_NAME="nomnom-database-url-prod"
UNSPLASH_ACCESS_KEY_SECRET_NAME="nomnom-unsplash-access-key"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "project_id must be set in ${TFVARS_FILE}" >&2
  exit 1
fi

if [[ -z "${REGION}" ]]; then
  REGION="us-west2"
fi

if [[ -z "${CONTAINER_IMAGE}" ]]; then
  echo "container_image must be set in ${TFVARS_FILE}" >&2
  exit 1
fi

echo "Configuring Docker auth for Artifact Registry (${REGION})..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

echo "Applying Prisma migrations to production database..."
DATABASE_URL="$(gcloud secrets versions access latest --secret="${DATABASE_URL_SECRET_NAME}" --project "${PROJECT_ID}")"
(
  cd "${REPO_ROOT}/backend"
  DATABASE_URL="${DATABASE_URL}" npm run migrate:deploy
)

echo "Building and pushing backend image: ${CONTAINER_IMAGE}"
docker buildx build --platform linux/amd64 -t "${CONTAINER_IMAGE}" --push -f "${REPO_ROOT}/backend/Dockerfile" "${REPO_ROOT}"

echo "Ensuring backend API key secret exists in Secret Manager..."
if gcloud secrets describe "${BACKEND_API_KEY_SECRET_NAME}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  echo "Secret ${BACKEND_API_KEY_SECRET_NAME} already exists; reusing it."
else
  gcloud secrets create "${BACKEND_API_KEY_SECRET_NAME}" \
    --replication-policy="automatic" \
    --project "${PROJECT_ID}"

  BACKEND_API_KEY="$(openssl rand -hex 32)"
  printf "%s" "${BACKEND_API_KEY}" | gcloud secrets versions add "${BACKEND_API_KEY_SECRET_NAME}" \
    --data-file=- \
    --project "${PROJECT_ID}"

  echo "Created secret ${BACKEND_API_KEY_SECRET_NAME} with initial version."
fi

echo "Ensuring Unsplash access key secret exists in Secret Manager..."
if gcloud secrets describe "${UNSPLASH_ACCESS_KEY_SECRET_NAME}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  echo "Secret ${UNSPLASH_ACCESS_KEY_SECRET_NAME} already exists; reusing it."
else
  echo "Secret ${UNSPLASH_ACCESS_KEY_SECRET_NAME} not found. Please create it manually:"
  echo "  gcloud secrets create ${UNSPLASH_ACCESS_KEY_SECRET_NAME} --replication-policy=automatic --project ${PROJECT_ID}"
  echo "  printf '<your-unsplash-access-key>' | gcloud secrets versions add ${UNSPLASH_ACCESS_KEY_SECRET_NAME} --data-file=- --project ${PROJECT_ID}"
  exit 1
fi

echo "Applying Terraform..."
terraform -chdir="${SCRIPT_DIR}" init
terraform -chdir="${SCRIPT_DIR}" apply -auto-approve

# Terraform's container_image is the immutable ':latest' tag string, so
# `terraform apply` never rolls a new Cloud Run revision just because a new image
# was pushed to that tag — Cloud Run stays pinned to the previously resolved
# digest and silently keeps serving the old image. Force it to re-resolve
# ':latest' into a fresh revision. Using the tag (not a digest) keeps this
# consistent with Terraform state, so it does not introduce drift.
SERVICE_NAME="$(extract_tfvar service_name)"
if [[ -z "${SERVICE_NAME}" ]]; then
  SERVICE_NAME="nomnom-backend"
fi

echo "Rolling Cloud Run service ${SERVICE_NAME} to the freshly pushed ${CONTAINER_IMAGE}..."
gcloud run services update "${SERVICE_NAME}" \
  --image "${CONTAINER_IMAGE}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --quiet

echo "Verifying the live revision is serving the pushed image..."
LATEST_DIGEST="$(gcloud artifacts docker images describe "${CONTAINER_IMAGE}" \
  --project "${PROJECT_ID}" --format='value(image_summary.digest)' 2>/dev/null || true)"
LIVE_REV="$(gcloud run services describe "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" --region "${REGION}" \
  --format='value(status.latestReadyRevisionName)')"
LIVE_DIGEST="$(gcloud run revisions describe "${LIVE_REV}" \
  --project "${PROJECT_ID}" --region "${REGION}" \
  --format='value(status.imageDigest)')"
echo "  pushed :latest digest: ${LATEST_DIGEST:-<unknown>}"
echo "  live revision:         ${LIVE_REV}"
echo "  live revision digest:  ${LIVE_DIGEST}"
if [[ -n "${LATEST_DIGEST}" && "${LIVE_DIGEST}" != *"${LATEST_DIGEST}"* ]]; then
  echo "ERROR: live revision digest does not match the pushed :latest digest." >&2
  echo "The new image is not serving — investigate before trusting this deploy." >&2
  exit 1
fi

echo "Deployment complete."
echo "Set EXPO_PUBLIC_BACKEND_API_KEY in app env to the secret value from ${BACKEND_API_KEY_SECRET_NAME}."
