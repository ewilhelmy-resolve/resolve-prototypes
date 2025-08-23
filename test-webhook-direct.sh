#!/bin/bash

# Test direct webhook call to Resolve API
curl --location 'https://actions-api-staging.resolve.io/api/Webhooks/postEvent/00F4F67D-3B92-4FD2-A574-7BE22C6BE796' \
--header 'Authorization: Basic RTE0NzMwRkEtRDFCNS00MDM3LUFDRTMtQ0Y5N0ZCQzY3NkMyOlZaSkQqSSYyWEAkXkQ5Sjk4Rk5PJShGUVpaQ0dRNkEj' \
--header 'Content-Type: application/json' \
--data-raw '{
  "source": "Onboarding",
  "user_email": "test@example.com",
  "user_id": "test-user-123",
  "action": "uploaded-csv",
  "integration_type": "csv",
  "callbackUrl": "http://localhost:5000/api/csv/callback/test123",
  "tenantToken": "default-tenant",
  "metadata": {
    "total_rows": 3,
    "batch_size": 100,
    "total_batches": 1,
    "tickets_imported": 3
  }
}' -v