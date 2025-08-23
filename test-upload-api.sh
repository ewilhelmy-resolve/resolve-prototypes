#!/bin/bash

# Create a test user and get session token
echo "Creating test user..."
RESPONSE=$(curl -s -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Webhook Test",
    "email": "webhooktest'$(date +%s)'@example.com",
    "companyName": "Test Company",
    "password": "test123"
  }')

TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Got token: $TOKEN"

# Upload CSV file
echo "Uploading CSV file..."
curl -X POST http://localhost:5000/api/upload-knowledge \
  -H "Cookie: sessionToken=$TOKEN" \
  -H "x-session-token: $TOKEN" \
  -F "files=@test-knowledge.csv" \
  -v 2>&1 | grep -E "WEBHOOK|webhook|< HTTP"