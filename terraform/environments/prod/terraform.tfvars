region             = "us-east-1"
cluster_name       = "rita-prod"
vpc_cidr           = "10.0.0.0/16"
environment        = "prod"
rds_instance_class = "db.t4g.medium"
rds_engine_version = "15"
peer_vpc_id        = "vpc-0490a931bc8e39bae" # Fill with existing VPC ID
peer_vpc_cidr      = "172.31.0.0/16" # Fill with existing VPC CIDR
