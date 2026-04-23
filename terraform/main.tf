# ------------------------------------------------------------------------------
# Providers
# ------------------------------------------------------------------------------

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "rita"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

# ------------------------------------------------------------------------------
# Data Sources
# ------------------------------------------------------------------------------

data "aws_caller_identity" "current" {}

# ------------------------------------------------------------------------------
# VPC
# ------------------------------------------------------------------------------

module "vpc" {
  source = "./modules/vpc"

  vpc_cidr      = var.vpc_cidr
  cluster_name  = var.cluster_name
  environment   = var.environment
  peer_vpc_id   = var.peer_vpc_id
  peer_vpc_cidr = var.peer_vpc_cidr
}

# ------------------------------------------------------------------------------
# EKS
# ------------------------------------------------------------------------------

module "eks" {
  source = "./modules/eks"

  cluster_name       = var.cluster_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  eks_node_sg_id     = module.vpc.eks_node_sg_id
}

# ------------------------------------------------------------------------------
# RDS
# ------------------------------------------------------------------------------

module "rds" {
  source = "./modules/rds"

  cluster_name       = var.cluster_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  eks_node_sg_id     = module.vpc.eks_node_sg_id
  eks_cluster_sg_id  = module.eks.node_security_group_id
  instance_class     = var.rds_instance_class
  engine_version     = var.rds_engine_version
  db_name            = var.rds_db_name
  username           = var.rds_username
  password           = var.rds_password
}

# ------------------------------------------------------------------------------
# IRSA
# ------------------------------------------------------------------------------

module "irsa" {
  source = "./modules/irsa"

  cluster_name           = var.cluster_name
  environment            = var.environment
  oidc_provider_arn      = module.eks.oidc_provider_arn
  oidc_provider_url      = module.eks.oidc_provider_url
  route53_hosted_zone_id = var.route53_hosted_zone_id
}

# ------------------------------------------------------------------------------
# Helm: AWS Load Balancer Controller
# ------------------------------------------------------------------------------

resource "helm_release" "aws_load_balancer_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"
  version    = "1.7.2"

  set {
    name  = "clusterName"
    value = module.eks.cluster_name
  }

  set {
    name  = "serviceAccount.create"
    value = "true"
  }

  set {
    name  = "serviceAccount.name"
    value = "aws-load-balancer-controller"
  }

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = module.irsa.alb_controller_role_arn
  }

  set {
    name  = "region"
    value = var.region
  }

  set {
    name  = "vpcId"
    value = module.vpc.vpc_id
  }

  depends_on = [
    module.eks,
    module.irsa,
  ]
}

# ------------------------------------------------------------------------------
# Helm: Metrics Server
# ------------------------------------------------------------------------------

resource "helm_release" "metrics_server" {
  name       = "metrics-server"
  repository = "https://kubernetes-sigs.github.io/metrics-server/"
  chart      = "metrics-server"
  namespace  = "kube-system"
  version    = "3.12.0"

  set {
    name  = "replicas"
    value = "2"
  }

  depends_on = [module.eks]
}
