output "rds_endpoint" {
  description = "RDS instance endpoint (hostname)"
  value       = aws_db_instance.main.address
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "rds_security_group_id" {
  description = "RDS security group ID"
  value       = aws_security_group.rds.id
}
