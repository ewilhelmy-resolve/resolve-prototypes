#!/usr/bin/env python3
"""
Test script to simulate Actions platform sending a callback response
"""
import requests
import json
import time

def test_callback():
    # Configuration
    conversation_id = "4000205c-32c6-49ce-8488-cc8da8089ac9"
    tenant_id = "84fa1dd3-bdb4-44a1-ac76-2c7453ebc1db"
    message_id = f"test-message-{int(time.time())}"
    
    # The callback URL
    callback_url = f"http://localhost:5000/api/rag/chat-callback/{message_id}"
    
    # The response from the Actions platform (simulated)
    ai_response = """To get started with Resolve Onboarding, follow these steps:

1. **Initial Setup**: First, ensure you have access to the Resolve dashboard. You can sign up or sign in at the onboarding portal.

2. **Document Upload**: You can upload documents in various formats (PDF, DOCX, TXT, etc.) through the Knowledge Base section. These documents will be processed and made searchable.

3. **Vector Search Integration**: The platform uses advanced vector search capabilities to find relevant information from your uploaded documents. This enables semantic search across all your knowledge base content.

4. **Actions Platform Integration**: To integrate with the Actions platform, you'll need to:
   - Set up webhooks to receive events
   - Process webhook payloads with callback tokens
   - Send responses back using the provided callback URLs
   - Ensure proper authentication using the callback tokens

5. **Chat Interface**: Use Rita, the AI assistant, to interact with your knowledge base and get answers to your questions.

The onboarding platform supports multi-tenant architecture, document processing, vector search, and real-time chat capabilities. All these features work together to provide a comprehensive automation and knowledge management solution."""
    
    # Prepare the callback payload
    payload = {
        "conversation_id": conversation_id,
        "tenant_id": tenant_id,
        "ai_response": ai_response,
        "processing_time_ms": 1500,
        "sources": [
            "Onboarding Documentation",
            "Integration Guide",
            "Platform Overview"
        ]
    }
    
    print(f"📤 Sending callback to: {callback_url}")
    print(f"   Conversation ID: {conversation_id}")
    print(f"   Tenant ID: {tenant_id}")
    print(f"   Message ID: {message_id}")
    print(f"   Response length: {len(ai_response)} characters")
    
    try:
        # Send the callback
        response = requests.post(
            callback_url,
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"\n📨 Response Status: {response.status_code}")
        print(f"   Response: {response.text}")
        
        if response.status_code == 200:
            print("\n✅ Callback successful!")
            print("   The response should now appear in the chat UI")
            print("   Check the browser to see if Rita's response is displayed")
        else:
            print(f"\n❌ Callback failed with status {response.status_code}")
            
    except Exception as e:
        print(f"\n❌ Error sending callback: {e}")

if __name__ == "__main__":
    test_callback()