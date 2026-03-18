variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "rita-prod"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.medium"
}

variable "rds_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15"
}

variable "rds_db_name" {
  description = "RDS database name"
  type        = string
  default     = "rita"
}

variable "rds_username" {
  description = "RDS master username"
  type        = string
  default     = "rita_admin"
  sensitive   = true
}

variable "rds_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "peer_vpc_id" {
  description = "VPC ID for peering (manually configured)"
  type        = string
  default     = ""
}

variable "peer_vpc_cidr" {
  description = "CIDR block of the peered VPC"
  type        = string
  default     = ""
}

variable "route53_hosted_zone_id" {
  description = "Route53 hosted zone ID"
  type        = string
  default     = "Z00550801QTKF8OAESP4"
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for TLS"
  type        = string
  default     = "arn:aws:acm:us-east-1:432993365903:certificate/f6df4a9a-bcf8-4078-ae1d-f7eeb1307ed7"
}
