# ------------------------------------------------------------------------------
# EKS
# ------------------------------------------------------------------------------

output "eks_cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_oidc_provider_arn" {
  description = "EKS OIDC provider ARN"
  value       = module.eks.oidc_provider_arn
}

output "eks_system_node_group" {
  description = "System node group name"
  value       = module.eks.system_node_group_name
}

output "eks_workload_node_group" {
  description = "Workload node group name"
  value       = module.eks.workload_node_group_name
}

# ------------------------------------------------------------------------------
# VPC
# ------------------------------------------------------------------------------

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

# ------------------------------------------------------------------------------
# RDS
# ------------------------------------------------------------------------------

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.rds.rds_endpoint
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = module.rds.rds_port
}

# ------------------------------------------------------------------------------
# IRSA
# ------------------------------------------------------------------------------

output "alb_controller_role_arn" {
  description = "IAM role ARN for AWS Load Balancer Controller"
  value       = module.irsa.alb_controller_role_arn
}

output "route53_role_arn" {
  description = "IAM role ARN for Route53 DNS management"
  value       = module.irsa.route53_role_arn
}
