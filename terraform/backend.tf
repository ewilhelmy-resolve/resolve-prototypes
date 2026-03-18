terraform {
  backend "s3" {
    bucket         = "rita-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "rita-terraform-locks"
    encrypt        = true
  }
}
