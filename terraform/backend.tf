terraform {
  backend "s3" {
    bucket         = "rita-tf-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "rita-tf-locks"
    encrypt        = true
  }
}
