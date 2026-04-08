output "cloud_run_service_name" {
  description = "Deployed Cloud Run service name"
  value       = google_cloud_run_v2_service.backend.name
}

output "cloud_run_service_url" {
  description = "Public Cloud Run URL"
  value       = google_cloud_run_v2_service.backend.uri
}
