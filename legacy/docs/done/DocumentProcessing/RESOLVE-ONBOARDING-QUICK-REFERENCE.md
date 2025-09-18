# Actions Platform Quick Reference Guide

> **🔑 Token Update**: Document callback tokens are now **PERMANENT** and never expire. Once you receive a token in the webhook, it can be used indefinitely to interact with that document.

## Quick Start: Processing Document Webhook

When you receive this webhook from Onboarding platform:

```json
{
  "source": "onboarding",
  "action": "document-processing",
  "tenant_id": "a1e73f85-a1ff-4cea-b279-2e93ce64df82",
  "document_id": "d5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "document_url": "https://platform.resolve.com/api/documents/d5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "markdown_callback_url": "https://platform.resolve.com/api/rag/document-callback/d5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "vector_callback_url": "https://platform.resolve.com/api/rag/callback/abc123def456",
  "callback_token": "64-char-hex-token",
  "file_type": "pdf",
  "file_size": 2097152,
  "original_filename": "company-handbook.pdf"
}
```

## Step-by-Step Processing

### 1️⃣ Download the Document

```python
import requests

# Download the document binary
response = requests.get(
    webhook_data["document_url"],
    headers={"Authorization": f"Bearer {webhook_data['callback_token']}"}
)
document_binary = response.content
```

### 2️⃣ Process Document to Markdown

```python
# Your document processing logic
markdown_content = process_document_to_markdown(
    document_binary, 
    file_type=webhook_data["file_type"]
)
```

### 3️⃣ Send Markdown Callback

```python
# Callback with processed markdown
markdown_response = requests.post(
    webhook_data["markdown_callback_url"],
    headers={
        "Authorization": f"Bearer {webhook_data['callback_token']}",
        "Content-Type": "application/json"
    },
    json={
        "tenant_id": webhook_data["tenant_id"],
        "document_id": webhook_data["document_id"],
        "markdown": markdown_content,
        "metadata": {
            "page_count": 45,
            "word_count": 12500,
            "processing_time_ms": 3200,
            "extraction_method": "text"
        }
    }
)
```

### 4️⃣ Create Chunks and Embeddings

```python
# Chunk the content
chunks = create_chunks(
    markdown_content,
    chunk_size=500,
    chunk_overlap=50
)

# Generate embeddings (must be 1536 dimensions)
import openai
vectors = []
for index, chunk_text in enumerate(chunks):
    embedding = openai.Embedding.create(
        input=chunk_text,
        model="text-embedding-ada-002"  # Returns 1536 dimensions
    )["data"][0]["embedding"]
    
    vectors.append({
        "chunk_text": chunk_text,
        "embedding": embedding,  # List of 1536 floats
        "chunk_index": index,
        "metadata": {
            "page_number": get_page_number(chunk_text),
            "section": get_section(chunk_text)
        }
    })
```

### 5️⃣ Send Vector Callback

```python
# Callback with vectors
vector_response = requests.post(
    webhook_data["vector_callback_url"],
    headers={
        "X-Callback-Token": webhook_data["callback_token"],
        "Content-Type": "application/json"
    },
    json={
        "document_id": webhook_data["document_id"],
        "tenant_id": webhook_data["tenant_id"],
        "vectors": vectors,
        "processing_metadata": {
            "total_chunks": len(vectors),
            "chunk_size": 500,
            "chunk_overlap": 50,
            "embedding_model": "text-embedding-ada-002",
            "embedding_dimension": 1536
        }
    }
)
```

## Critical Requirements

### ⚠️ MUST HAVE

1. **Embedding Dimensions**: MUST be exactly 1536 floats (OpenAI format)
2. **Callback Token**: Use the EXACT token from the webhook (permanent, never expires)
3. **Tenant ID**: MUST match in all callbacks
4. **Document ID**: MUST match in all callbacks
5. **Both Callbacks**: MUST send both markdown AND vectors

**📌 Important**: Document tokens are **permanent** - they never expire and can be used indefinitely for processing and reprocessing.

### 🔴 Common Mistakes to Avoid

```python
# ❌ WRONG: Different embedding dimensions
embedding = model.encode(text)  # Returns 768 dimensions
vectors.append({"embedding": embedding})  # Will fail!

# ✅ CORRECT: Use OpenAI embeddings (1536 dimensions)
embedding = openai.Embedding.create(
    input=text,
    model="text-embedding-ada-002"
)["data"][0]["embedding"]  # Returns 1536 dimensions

# ❌ WRONG: Missing tenant_id in callback
callback_data = {
    "document_id": doc_id,
    "markdown": content  # Missing tenant_id!
}

# ✅ CORRECT: Include tenant_id
callback_data = {
    "tenant_id": webhook_data["tenant_id"],  # Required!
    "document_id": webhook_data["document_id"],
    "markdown": content
}

# ❌ WRONG: Wrong header for vector callback
headers = {"Authorization": f"Bearer {token}"}  # Wrong header!

# ✅ CORRECT: Use X-Callback-Token for vectors
headers = {"X-Callback-Token": token}  # Correct for vector callback
```

## Callback Response Handling

### Success Response
```json
{
  "success": true,
  "message": "Document processed successfully"
}
```

### Error Responses

| Status | Meaning | Action Required |
|--------|---------|-----------------|
| 401 | Invalid token | Check token matches webhook |
| 404 | Document not found | Verify document_id |
| 400 | Invalid data (wrong dimensions, etc.) | Fix data format |
| 500 | Server error | Retry with exponential backoff |

## Retry Strategy

```python
import time

def send_callback_with_retry(url, headers, data, max_retries=3):
    delays = [60, 300, 900]  # 1min, 5min, 15min
    
    for attempt in range(max_retries + 1):
        try:
            response = requests.post(url, headers=headers, json=data, timeout=30)
            if response.status_code == 200:
                return response
            elif response.status_code in [401, 404]:
                # Don't retry on auth/not found errors
                return response
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
        
        if attempt < max_retries:
            time.sleep(delays[attempt])
    
    return None  # Failed after all retries
```

## Testing Your Integration

### 1. Test Authentication
```bash
curl -X POST https://platform.resolve.com/api/rag/callback/test \
  -H "X-Callback-Token: your-test-token" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 2. Test Markdown Callback
```bash
curl -X POST https://platform.resolve.com/api/rag/document-callback/{document_id} \
  -H "Authorization: Bearer {callback_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "test-tenant-id",
    "document_id": "test-doc-id",
    "markdown": "# Test Document\nTest content"
  }'
```

### 3. Test Vector Callback
```bash
# Generate test embedding (1536 zeros)
EMBEDDING=$(python -c "import json; print(json.dumps([0.0] * 1536))")

curl -X POST https://platform.resolve.com/api/rag/callback/{callback_id} \
  -H "X-Callback-Token: {callback_token}" \
  -H "Content-Type: application/json" \
  -d "{
    \"tenant_id\": \"test-tenant-id\",
    \"document_id\": \"test-doc-id\",
    \"vectors\": [{
      \"chunk_text\": \"Test chunk\",
      \"embedding\": $EMBEDDING,
      \"chunk_index\": 0
    }]
  }"
```

## Complete Python Example

```python
import requests
import openai
from typing import List, Dict
import time

class OnboardingDocumentProcessor:
    def __init__(self, openai_api_key: str):
        openai.api_key = openai_api_key
    
    def process_webhook(self, webhook_data: Dict):
        """Process document from Onboarding platform webhook"""
        
        # 1. Download document
        doc_response = requests.get(
            webhook_data["document_url"],
            headers={"Authorization": f"Bearer {webhook_data['callback_token']}"}
        )
        
        # 2. Process to markdown (your implementation)
        markdown = self.extract_text(doc_response.content, webhook_data["file_type"])
        
        # 3. Send markdown callback
        self.send_markdown_callback(webhook_data, markdown)
        
        # 4. Create chunks
        chunks = self.create_chunks(markdown)
        
        # 5. Generate embeddings and send vectors
        vectors = self.create_vectors(chunks)
        self.send_vector_callback(webhook_data, vectors)
    
    def extract_text(self, binary_content: bytes, file_type: str) -> str:
        """Extract text from document - implement your logic here"""
        # Your document processing logic
        return "# Extracted Document\n\nContent here..."
    
    def create_chunks(self, text: str, chunk_size: int = 500) -> List[str]:
        """Split text into chunks"""
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i:i + chunk_size])
            chunks.append(chunk)
        
        return chunks
    
    def create_vectors(self, chunks: List[str]) -> List[Dict]:
        """Generate embeddings for chunks"""
        vectors = []
        
        for index, chunk_text in enumerate(chunks):
            # Generate OpenAI embedding (1536 dimensions)
            response = openai.Embedding.create(
                input=chunk_text,
                model="text-embedding-ada-002"
            )
            embedding = response["data"][0]["embedding"]
            
            vectors.append({
                "chunk_text": chunk_text,
                "embedding": embedding,
                "chunk_index": index,
                "metadata": {}
            })
        
        return vectors
    
    def send_markdown_callback(self, webhook_data: Dict, markdown: str):
        """Send processed markdown back"""
        response = requests.post(
            webhook_data["markdown_callback_url"],
            headers={
                "Authorization": f"Bearer {webhook_data['callback_token']}",
                "Content-Type": "application/json"
            },
            json={
                "tenant_id": webhook_data["tenant_id"],
                "document_id": webhook_data["document_id"],
                "markdown": markdown
            },
            timeout=30
        )
        response.raise_for_status()
    
    def send_vector_callback(self, webhook_data: Dict, vectors: List[Dict]):
        """Send vectors back"""
        response = requests.post(
            webhook_data["vector_callback_url"],
            headers={
                "X-Callback-Token": webhook_data["callback_token"],
                "Content-Type": "application/json"
            },
            json={
                "tenant_id": webhook_data["tenant_id"],
                "document_id": webhook_data["document_id"],
                "vectors": vectors
            },
            timeout=30
        )
        response.raise_for_status()

# Usage
processor = OnboardingDocumentProcessor(openai_api_key="your-key")
processor.process_webhook(webhook_payload)
```

## Support

- Integration Issues: https://github.com/resolve/onboarding-platform/issues
- Webhook Documentation: `/docs/ACTIONS-PLATFORM-INTEGRATION.md`
- Test Environment: https://platform-staging.resolve.com

---

*Quick Reference v1.1 - 2025-08-29*
*Updated: Tokens are now permanent (no expiry)*