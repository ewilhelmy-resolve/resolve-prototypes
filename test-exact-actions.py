import requests
import json

# Your exact configuration
customer_message = "help me search the actions platform"
callback_token = "4290ff078fa87862fd3100ff03f0b20d88c43591589125c8ec743e4979550b96"
vector_search_url = "http://localhost:5000/api/rag/vector-search"
message_id = "73fb78c2-ceba-41bc-8f80-60b3ddb8b062"
tenant_id = "94c484e8-8536-49ad-8a0a-95a21a148baa"

# Use the actual embedding subset from the Actions platform
# This is part of the real embedding you provided
base_embedding = [-0.037945784628391266, -0.02311217412352562, 0.0009447595803067088, 
                  -0.03028881549835205, -0.015483462251722813, 0.03260568529367447, 
                  -0.0040792422369122505, -0.017150476574897766]

# Pad to 1536 dimensions with small random values (similar to real embeddings)
import random
random.seed(42)  # For consistency
test_embedding = base_embedding + [(random.random() - 0.5) * 0.1 for _ in range(1536 - len(base_embedding))]

# Make the request
headers = {
    "Content-Type": "application/json",
    "X-Callback-Token": callback_token
}

body = {
    "query_embedding": test_embedding,
    "tenant_id": tenant_id,
    "message_id": message_id,
    "limit": 5,
    "threshold": 0.5  # More realistic threshold
}

print(f"Testing vector search...")
print(f"URL: {vector_search_url}")
print(f"Tenant ID: {tenant_id}")
print(f"Embedding length: {len(test_embedding)}")
print(f"Threshold: {body['threshold']}")

try:
    response = requests.post(vector_search_url, headers=headers, json=body)
    result = response.json()
    
    print(f"\nResponse status: {response.status_code}")
    print(f"Response: {json.dumps(result, indent=2)}")
    
    if result.get('success') and result.get('results'):
        print(f"\n✅ Found {len(result['results'])} results!")
    else:
        print("\n⚠️ No results found. This means:")
        print("1. The embedding format might be different")
        print("2. The similarity threshold might be too high")
        print("3. The vectors in the database might use a different embedding model")
        
except Exception as e:
    print(f"Error: {e}")