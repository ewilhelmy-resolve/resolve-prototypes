import requests
import json

# Your configuration for admin@resolve.io tenant
customer_message = "help me search the actions platform"
callback_token = "4290ff078fa87862fd3100ff03f0b20d88c43591589125c8ec743e4979550b96"
vector_search_url = "http://localhost:5000/api/rag/vector-search"
message_id = "73fb78c2-ceba-41bc-8f80-60b3ddb8b062"
tenant_id = "94c484e8-8536-49ad-8a0a-95a21a148baa"  # admin@resolve.io

# YOUR ACTUAL EMBEDDING SHOULD GO HERE
# Replace this with the actual embedding from your Actions platform
query_embedding = [0.0] * 1536  # Placeholder - use your real embedding

headers = {
    "Content-Type": "application/json",
    "X-Callback-Token": callback_token
}

# Try with threshold 0 to get ANY results
body = {
    "query_embedding": query_embedding,
    "tenant_id": tenant_id,
    "message_id": message_id,
    "limit": 10,
    "threshold": 0.0  # Set to 0 to get all results regardless of similarity
}

print("=" * 60)
print("ACTIONS PLATFORM VECTOR SEARCH TEST")
print("=" * 60)
print(f"Tenant: admin@resolve.io ({tenant_id})")
print(f"URL: {vector_search_url}")
print(f"Threshold: {body['threshold']} (will return all vectors)")
print("=" * 60)

try:
    response = requests.post(vector_search_url, headers=headers, json=body)
    result = response.json()
    
    if response.status_code == 200 and result.get('success'):
        results = result.get('results', [])
        print(f"\n✅ SUCCESS! Found {len(results)} results")
        
        if results:
            print("\nSearch Results:")
            for i, res in enumerate(results, 1):
                print(f"\n{i}. Document: {res['document_id'][:8]}...")
                print(f"   Similarity: {res.get('similarity', 'N/A')}")
                print(f"   Content: \"{res['chunk_text'][:100]}...\"")
                if res.get('metadata'):
                    print(f"   Metadata: {res['metadata']}")
        else:
            print("\n⚠️ No vectors found. This means:")
            print("1. Documents haven't been vectorized yet")
            print("2. The tenant has no vectors stored")
            print("\nTo fix this, you need to:")
            print("1. Send documents through /api/rag/upload")
            print("2. Process them to generate embeddings")
            print("3. Send embeddings back via /api/rag/vectorization-callback")
    else:
        print(f"\n❌ ERROR: {result}")
        
except Exception as e:
    print(f"\n❌ Request failed: {e}")

print("\n" + "=" * 60)
print("IMPORTANT NOTES:")
print("=" * 60)
print("1. If you're getting empty results with threshold > 0, it means")
print("   the similarity between your embedding and stored vectors is too low.")
print("2. The vectors I added are test vectors with synthetic embeddings.")
print("3. For real search to work, you need:")
print("   - Real documents vectorized with the same embedding model")
print("   - Query embeddings from the same model (e.g., OpenAI)")
print("=" * 60)