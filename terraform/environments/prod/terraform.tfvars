region             = "us-east-1"
cluster_name       = "rita-prod"
vpc_cidr           = "10.0.0.0/16"
environment        = "prod"
rds_instance_class = "db.t4g.medium"
rds_engine_version = "15"
peer_vpc_id        = "" # Fill with existing VPC ID
peer_vpc_cidr      = "" # Fill with existing VPC CIDR
