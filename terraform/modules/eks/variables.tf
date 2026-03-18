variable "cluster_name" {
  description = "EKS cluster name"
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
  description = "Private subnet IDs for EKS node groups"
  type        = list(string)
}

variable "eks_node_sg_id" {
  description = "Security group ID for EKS nodes"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.29"
}

variable "system_node_instance_types" {
  description = "Instance types for system node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "workload_node_instance_types" {
  description = "Instance types for workload node group"
  type        = list(string)
  default     = ["t3.large"]
}

variable "workload_min_size" {
  description = "Minimum number of workload nodes"
  type        = number
  default     = 2
}

variable "workload_max_size" {
  description = "Maximum number of workload nodes"
  type        = number
  default     = 6
}

variable "workload_desired_size" {
  description = "Desired number of workload nodes"
  type        = number
  default     = 2
}
