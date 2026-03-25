variable "cluster_name" {
  description = "Cluster name, used for naming resources"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for DB subnet group"
  type        = list(string)
}

variable "eks_node_sg_id" {
  description = "Security group ID of EKS nodes (allowed to connect)"
  type        = string
}

variable "eks_cluster_sg_id" {
  description = "EKS cluster primary security group ID"
  type        = string
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.medium"
}

variable "engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "rita"
}

variable "username" {
  description = "Master username"
  type        = string
  sensitive   = true
}

variable "password" {
  description = "Master password"
  type        = string
  sensitive   = true
}

variable "allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 100
}

variable "backup_retention_period" {
  description = "Backup retention in days"
  type        = number
  default     = 35
}
