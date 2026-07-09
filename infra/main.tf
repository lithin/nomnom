provider "google" {
  project = var.project_id
  region  = var.region
}

data "google_project" "current" {
  project_id = var.project_id
}

locals {
  service_account = var.cloud_run_service_account_email != "" ? var.cloud_run_service_account_email : "${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

resource "google_project_service" "required_apis" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "backend_images" {
  project       = var.project_id
  location      = var.region
  repository_id = "nomnom"
  description   = "Backend container images"
  format        = "DOCKER"

  depends_on = [google_project_service.required_apis]
}

resource "google_cloud_run_v2_service" "backend" {
  name                = var.service_name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = local.service_account

    scaling {
      min_instance_count = var.min_instance_count
      max_instance_count = var.max_instance_count
    }

    containers {
      image = var.container_image

      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
      }

      ports {
        container_port = 8080
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = "nomnom-database-url-prod"
            version = "latest"
          }
        }
      }

      env {
        name = "GEMINI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = "nomnom-gemini-api-key"
            version = "latest"
          }
        }
      }

      env {
        name = "BACKEND_API_KEY"
        value_source {
          secret_key_ref {
            secret  = "nomnom-backend-api-key"
            version = "latest"
          }
        }
      }

      env {
        name = "UNSPLASH_ACCESS_KEY"
        value_source {
          secret_key_ref {
            secret  = "nomnom-unsplash-access-key"
            version = "latest"
          }
        }
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.required_apis,
    google_secret_manager_secret_iam_member.database_url_access,
    google_secret_manager_secret_iam_member.gemini_api_key_access,
    google_secret_manager_secret_iam_member.backend_api_key_access,
    google_secret_manager_secret_iam_member.unsplash_access_key_access,
  ]
}

resource "google_secret_manager_secret_iam_member" "database_url_access" {
  project   = var.project_id
  secret_id = "projects/${var.project_id}/secrets/nomnom-database-url-prod"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.service_account}"

  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_iam_member" "gemini_api_key_access" {
  project   = var.project_id
  secret_id = "projects/${var.project_id}/secrets/nomnom-gemini-api-key"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.service_account}"

  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_iam_member" "backend_api_key_access" {
  project   = var.project_id
  secret_id = "projects/${var.project_id}/secrets/nomnom-backend-api-key"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.service_account}"

  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_iam_member" "unsplash_access_key_access" {
  project   = var.project_id
  secret_id = "projects/${var.project_id}/secrets/nomnom-unsplash-access-key"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.service_account}"

  depends_on = [google_project_service.required_apis]
}

resource "google_cloud_run_v2_service_iam_member" "invoker" {
  count = var.allow_unauthenticated ? 1 : 0

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
