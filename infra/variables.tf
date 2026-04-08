variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "Region for Cloud Run"
  type        = string
  default     = "us-west2"
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "nomnom-backend"
}

variable "container_image" {
  description = "Container image URL in Artifact Registry"
  type        = string
}

variable "cloud_run_service_account_email" {
  description = "Optional service account email for Cloud Run runtime"
  type        = string
  default     = ""
}

variable "allow_unauthenticated" {
  description = "Whether to allow public unauthenticated access"
  type        = bool
  default     = true
}

variable "min_instance_count" {
  description = "Minimum container instances"
  type        = number
  default     = 0
}

variable "max_instance_count" {
  description = "Maximum container instances"
  type        = number
  default     = 1
}

variable "cpu_limit" {
  description = "CPU limit for one Cloud Run instance"
  type        = string
  default     = "1"
}

variable "memory_limit" {
  description = "Memory limit for one Cloud Run instance"
  type        = string
  default     = "512Mi"
}
