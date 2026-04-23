output "alb_controller_role_arn" {
  description = "IAM role ARN for AWS Load Balancer Controller"
  value       = aws_iam_role.alb_controller.arn
}

output "route53_role_arn" {
  description = "IAM role ARN for Route53 DNS management"
  value       = aws_iam_role.route53.arn
}
