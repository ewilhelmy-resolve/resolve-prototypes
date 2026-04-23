variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
}

variable "cluster_name" {
  description = "EKS cluster name, used for subnet tagging"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
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
