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

echo "Building and pushing backend image: ${CONTAINER_IMAGE}"
docker buildx build --platform linux/amd64 -t "${CONTAINER_IMAGE}" --push "${REPO_ROOT}/backend"

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

echo "Applying Terraform..."
terraform -chdir="${SCRIPT_DIR}" init
terraform -chdir="${SCRIPT_DIR}" apply -auto-approve

echo "Deployment complete."
echo "Set EXPO_PUBLIC_BACKEND_API_KEY in app env to the secret value from ${BACKEND_API_KEY_SECRET_NAME}."
