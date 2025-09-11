# Resolve Onboarding Application - Data Flow Guide

## Overview

This document provides a comprehensive guide to understanding how data flows through the Resolve Onboarding application, where it's stored, and how it's used across different systems. The application consists of multiple interconnected systems that work together to provide user management, knowledge base functionality, and AI-powered chat capabilities.

## System Architecture Overview

```mermaid
graph TB
    A[Frontend Dashboard] --> B[Node.js Application]
    B --> C[PostgreSQL Database]
    B --> D[Redis Session Store]
    B --> E[Resolve AI Platform]
    E --> B
    B --> F[File Storage/Uploads]
    
    subgraph "Database Tables"
        G[User Management]
        H[Knowledge Base]
        I[RAG/Chat System]
        J[Analytics & Monitoring]
    end
    
    C --> G
    C --> H
    C --> I
    C --> J
```

## Core Data Systems

### 1. User Management System
### 2. Knowledge Base System  
### 3. RAG Chat System
### 4. Analytics & Monitoring System

---

## 1. User Management Data Flow

### **Tables Involved:**
- `users` - Core user information
- `sessions` - Authentication tokens
- `tenant_invitations` - Multi-tenant user invitations
- `password_reset_tokens` - Password reset workflow

### **Data Flow: User Registration**

```mermaid
sequenceDiagram
    participant F as Frontend
    participant A as App Server
    participant DB as PostgreSQL
    participant R as Redis
    
    F->>A: POST /api/auth/signup
    A->>A: Hash password (bcrypt)
    A->>DB: INSERT INTO users (email, password, tenant_id)
    DB-->>A: User ID returned
    A->>A: Generate session token
    A->>R: Store session in Redis
    A->>DB: INSERT INTO sessions (token, user_id)
    A-->>F: Set session cookie + user data
```

**Data Stored:**
```sql
-- users table
{
    id: 123,
    email: "user@company.com",
    password: "$2b$10$...", -- Hashed with bcrypt
    full_name: "John Doe",
    company_name: "Acme Corp",
    tenant_id: "550e8400-e29b-41d4-a716-446655440000",
    role: "user", -- or "tenant-admin"
    status: "active",
    created_at: "2024-01-15T10:30:00Z"
}

-- sessions table
{
    token: "abc123...",
    user_id: 123,
    expires_at: "2024-01-16T10:30:00Z"
}
```

**Usage Locations:**
- **Signup Flow**: `src/routes/auth.js` - Creates user and session
- **Login Flow**: `src/routes/auth.js` - Validates credentials, creates session
- **Dashboard**: `src/client/pages/dashboard.html` - Displays user info
- **Admin Panel**: `src/routes/admin.js` - User management operations

### **Data Flow: Multi-Tenant User Invitation**

```mermaid
sequenceDiagram
    participant A as Admin User
    participant App as App Server
    participant DB as PostgreSQL
    participant E as Email Service
    participant I as Invited User
    
    A->>App: POST /api/admin/invite-user
    App->>DB: INSERT INTO tenant_invitations
    App->>E: Send invitation email
    I->>App: Click invitation link
    App->>DB: SELECT invitation by token
    App->>DB: INSERT INTO users (with tenant_id)
    App->>DB: UPDATE invitation (accepted_at)
```

---

## 2. Knowledge Base Data Flow

### **Tables Involved:**
- `tickets` - Knowledge base articles and support tickets
- `integrations` - Data source configurations

### **Data Flow: CSV Knowledge Import**

```mermaid
sequenceDiagram
    participant U as User
    participant A as App Server
    participant DB as PostgreSQL
    participant W as Webhook System
    
    U->>A: POST /api/csv-upload (CSV file)
    A->>A: Parse CSV data
    loop For each row
        A->>DB: INSERT INTO tickets (title, description, metadata)
    end
    A->>DB: INSERT INTO integrations (type: 'csv', config)
    A->>W: Send webhook to Resolve platform
    A-->>U: Import success response
```

**Data Stored:**
```sql
-- tickets table (Knowledge Base Articles)
{
    id: 456,
    user_id: 123,
    external_id: "KB-001",
    title: "How to Reset Password",
    description: "Step-by-step guide for password reset...",
    status: "published",
    priority: "medium",
    metadata: {
        "category": "authentication",
        "tags": ["password", "security"],
        "import_source": "csv",
        "file_name": "kb_articles.csv"
    }
}

-- integrations table
{
    id: 789,
    user_id: 123,
    type: "csv",
    config: {
        "file_name": "kb_articles.csv",
        "import_date": "2024-01-15",
        "total_rows": 150
    },
    enabled: true
}
```

**Usage Locations:**
- **CSV Import**: `src/routes/api.js` - Processes uploaded CSV files
- **Knowledge Display**: Dashboard sidebar shows recent articles
- **Search**: Used as source material for RAG vector search
- **Admin Analytics**: `src/routes/admin.js` - Counts tickets per user

### **Data Flow: Knowledge Base API Access**

```mermaid
sequenceDiagram
    participant D as Dashboard
    participant A as App Server
    participant DB as PostgreSQL
    
    D->>A: GET /api/tickets?limit=5
    A->>DB: SELECT * FROM tickets ORDER BY created_at DESC LIMIT 5
    DB-->>A: Recent articles data
    A-->>D: JSON response with articles
    D->>D: Display in "Recent Articles" sidebar
```

---

## 3. RAG Chat System Data Flow

### **Tables Involved:**
- `rag_documents` - Raw document storage
- `rag_vectors` - Vector embeddings for search
- `rag_conversations` - Chat conversation tracking
- `rag_messages` - Individual chat messages
- `rag_tenant_tokens` - Secure callback authentication

### **Data Flow: Document Upload & Processing**

```mermaid
sequenceDiagram
    participant U as User
    participant A as App Server
    participant DB as PostgreSQL
    participant R as Resolve AI
    participant S as SSE Stream
    
    U->>A: POST /api/rag/upload-document (PDF file)
    A->>A: Store file in uploads/
    A->>DB: INSERT INTO rag_documents (content, status: 'pending')
    A->>R: Send webhook (document processing request)
    A-->>U: Document uploaded, processing...
    
    Note over R: AI processes document
    R->>A: POST /api/rag/document-callback (vectors)
    A->>DB: INSERT INTO rag_vectors (embeddings)
    A->>DB: UPDATE rag_documents (status: 'completed')
    A->>S: SSE broadcast to user
    S-->>U: Document processing complete
```

**Data Stored:**
```sql
-- rag_documents table
{
    id: 101,
    tenant_id: "550e8400-e29b-41d4-a716-446655440000",
    document_id: "doc-uuid-123",
    callback_id: "callback-abc123",
    content: "This is the full text content of the uploaded PDF...",
    metadata: {
        "original_filename": "company_policy.pdf",
        "file_size": 2048576,
        "file_type": "pdf",
        "upload_user": "user@company.com"
    },
    status: "completed",
    created_by: "user@company.com"
}

-- rag_vectors table (Vector Embeddings)
{
    id: 201,
    tenant_id: "550e8400-e29b-41d4-a716-446655440000",
    document_id: "doc-uuid-123",
    chunk_text: "Employee vacation policy allows for 15 days...",
    embedding: [0.1, -0.2, 0.8, ...], -- 1536-dimensional vector
    chunk_index: 0,
    metadata: {
        "chunk_type": "paragraph",
        "source_page": 1
    }
}
```

### **Data Flow: Chat Conversation**

```mermaid
sequenceDiagram
    participant U as User
    participant A as App Server
    participant DB as PostgreSQL
    participant R as Resolve AI
    participant S as SSE Stream
    
    U->>A: POST /api/rag/chat {"message": "What's the vacation policy?"}
    A->>DB: INSERT INTO rag_conversations (if new)
    A->>DB: INSERT INTO rag_messages (role: 'user', message)
    A->>R: Send webhook (chat request + vector search endpoint)
    A-->>U: Processing message...
    
    Note over R: AI searches vectors & generates response
    R->>A: POST /api/rag/chat-callback (AI response)
    A->>DB: UPDATE rag_messages (ai_response)
    A->>S: SSE broadcast response
    S-->>U: AI response displayed in chat
```

**Data Stored:**
```sql
-- rag_conversations table
{
    id: 301,
    conversation_id: "conv-uuid-456",
    tenant_id: "550e8400-e29b-41d4-a716-446655440000",
    user_email: "user@company.com",
    status: "active",
    context: {
        "topic": "hr_policies",
        "last_activity": "2024-01-15T15:30:00Z"
    }
}

-- rag_messages table
{
    id: 401,
    conversation_id: "conv-uuid-456",
    tenant_id: "550e8400-e29b-41d4-a716-446655440000",
    role: "user",
    message: "What's the vacation policy?",
    response_time_ms: null
},
{
    id: 402,
    conversation_id: "conv-uuid-456", 
    tenant_id: "550e8400-e29b-41d4-a716-446655440000",
    role: "assistant",
    message: "Based on your company policy, employees are entitled to 15 vacation days...",
    response_time_ms: 1500
}
```

**Usage Locations:**
- **Chat Interface**: `src/client/components/quikchat-rag.js` - Real-time chat
- **Document Management**: Dashboard document upload section
- **Vector Search**: `src/routes/ragApi.js` - Similarity search operations
- **Conversation History**: Chat history management

### **Data Flow: Vector Search Operation**

```mermaid
sequenceDiagram
    participant R as Resolve AI
    participant A as App Server
    participant DB as PostgreSQL
    participant L as Search Logs
    
    R->>A: POST /api/rag/vector-search (query vector)
    A->>DB: SELECT vectors WHERE cosine_similarity > threshold
    DB-->>A: Matching document chunks
    A->>L: INSERT INTO vector_search_logs (analytics)
    A-->>R: Search results with source documents
```

---

## 4. Analytics & Monitoring Data Flow

### **Tables Involved:**
- `workflow_triggers` - All automation events
- `admin_metrics` - Aggregated daily statistics
- `vector_search_logs` - Search operation analytics
- `webhook_traffic` - API request logging

### **Data Flow: Event Tracking**

```mermaid
sequenceDiagram
    participant E as Event Source
    participant A as App Server
    participant DB as PostgreSQL
    participant M as Metrics System
    
    E->>A: Any user action (chat, upload, etc.)
    A->>DB: INSERT INTO workflow_triggers
    A->>M: Update real-time metrics
    
    Note over M: Daily aggregation job
    M->>DB: SELECT from workflow_triggers WHERE date = today
    M->>DB: INSERT/UPDATE admin_metrics (daily summary)
```

**Data Stored:**
```sql
-- workflow_triggers table
{
    id: 501,
    user_email: "user@company.com",
    trigger_type: "RAG_Chat",
    action: "send-message",
    metadata: {
        "conversation_id": "conv-uuid-456",
        "message_length": 25,
        "response_time_ms": 1500
    },
    success: true,
    triggered_at: "2024-01-15T15:30:00Z"
}

-- admin_metrics table (Daily Aggregation)
{
    id: 601,
    metric_date: "2024-01-15",
    total_triggers: 150,
    unique_users: 25,
    successful_triggers: 147,
    failed_triggers: 3,
    triggers_by_type: {
        "RAG_Chat": 85,
        "document_upload": 25,
        "csv_import": 5
    },
    triggers_by_action: {
        "send-message": 85,
        "upload-document": 25,
        "import-csv": 5
    }
}
```

**Usage Locations:**
- **Admin Dashboard**: `src/routes/admin.js` - System analytics
- **Performance Monitoring**: Response time tracking
- **Usage Analytics**: User engagement metrics

---

## Data Relationships & Dependencies

### **Primary Relationships:**

```mermaid
erDiagram
    users ||--o{ sessions : "has"
    users ||--o{ tickets : "creates"
    users ||--o{ rag_conversations : "participates_in"
    users }o--|| tenant_invitations : "invited_by"
    
    rag_conversations ||--o{ rag_messages : "contains"
    rag_documents ||--o{ rag_vectors : "generates"
    
    users ||--o{ workflow_triggers : "triggers"
    workflow_triggers }o--|| admin_metrics : "aggregated_into"
```

### **Tenant Isolation:**
All major tables include `tenant_id` for multi-tenant data separation:
- `users.tenant_id`
- `rag_conversations.tenant_id`
- `rag_documents.tenant_id`
- `rag_vectors.tenant_id`

### **Cross-System Integration:**
1. **Knowledge Base → RAG System**: Tickets can be vectorized for AI search
2. **User System → All Systems**: User authentication flows through all features
3. **Analytics System**: Monitors all other systems for usage patterns

---

## Error Handling & Reliability

### **Webhook Retry System:**

```mermaid
sequenceDiagram
    participant A as App Server
    participant R as Resolve AI
    participant DB as PostgreSQL
    participant W as Retry Worker
    
    A->>R: Send webhook (fails)
    A->>DB: INSERT INTO rag_webhook_failures
    
    loop Retry Logic
        W->>DB: SELECT pending webhooks
        W->>R: Retry webhook call
        alt Success
            W->>DB: UPDATE status = 'succeeded'
        else Failure
            W->>DB: UPDATE retry_count, next_retry_at
        end
    end
```

**Data Stored:**
```sql
-- rag_webhook_failures table
{
    id: 701,
    tenant_id: "550e8400-e29b-41d4-a716-446655440000",
    webhook_type: "document-processing",
    payload: {
        "document_id": "doc-uuid-123",
        "callback_url": "https://app.com/api/rag/document-callback"
    },
    retry_count: 2,
    max_retries: 3,
    next_retry_at: "2024-01-15T16:00:00Z",
    last_error: "Connection timeout",
    status: "retrying"
}
```

---

## Session & Authentication Flow

### **Session Management:**

```mermaid
sequenceDiagram
    participant F as Frontend
    participant A as App Server
    participant R as Redis
    participant DB as PostgreSQL
    
    F->>A: Request with session cookie
    A->>R: Check session in Redis (fast lookup)
    alt Session in Redis
        R-->>A: Session data
    else Session not in Redis
        A->>DB: SELECT from sessions table
        alt Valid session
            DB-->>A: Session data
            A->>R: Cache session in Redis
        else Invalid/Expired
            A-->>F: 401 Unauthorized
        end
    end
    A-->>F: Continue with authenticated request
```

**Session Data Storage:**
- **Redis**: Fast session lookups, temporary storage
- **PostgreSQL**: Persistent session storage with expiration
- **Cookies**: Secure session tokens sent to frontend

---

## Real-Time Communication (SSE)

### **Server-Sent Events Flow:**

```mermaid
sequenceDiagram
    participant F as Frontend
    participant A as App Server
    participant C as Chat System
    participant D as Document System
    
    F->>A: Open SSE connection (/api/rag/chat-stream/{conversationId})
    A->>A: Store SSE connection by conversation/tenant
    
    Note over C,D: Background processes
    C->>A: New chat message available
    A->>F: SSE: chat-response event
    
    D->>A: Document processing complete
    A->>F: SSE: document-processed event
```

**SSE Event Types:**
- `chat-response` - AI responses to user messages
- `document-processed` - Document upload completion
- `heartbeat` - Connection keep-alive
- `error` - Error notifications

---

## File Storage & Upload Flow

### **Document Upload Process:**

```mermaid
sequenceDiagram
    participant F as Frontend
    participant A as App Server
    participant FS as File System
    participant DB as PostgreSQL
    
    F->>A: POST /api/rag/upload-document (multipart/form-data)
    A->>A: Validate file (size, type)
    A->>FS: Save to uploads/ directory
    A->>DB: INSERT INTO rag_documents (file metadata)
    A->>A: Generate callback ID
    A-->>F: Upload success + document_id
```

**File Storage Locations:**
- **uploads/** directory - Raw uploaded files
- **Database** - File metadata and processing status
- **Vector Database** - Processed embeddings for search

---

## Development vs Production Data Flow

### **Development Environment:**
- **Local PostgreSQL**: All data stored locally
- **Mock AI Services**: Simulated responses for testing
- **Local File Storage**: uploads/ directory in project
- **No External Dependencies**: Self-contained development

### **Production Environment:**
- **Supabase PostgreSQL**: Cloud database with pgvector
- **Resolve AI Platform**: External AI processing
- **Cloud File Storage**: Scalable file management
- **Redis Session Store**: Distributed session management

---

## Common Data Access Patterns

### **1. Tenant-Based Queries:**
```sql
-- All queries filtered by tenant for data isolation
SELECT * FROM rag_conversations WHERE tenant_id = $1;
SELECT * FROM rag_vectors WHERE tenant_id = $1 AND similarity > threshold;
```

### **2. Time-Based Analytics:**
```sql
-- Daily metrics aggregation
SELECT COUNT(*) FROM workflow_triggers 
WHERE triggered_at >= CURRENT_DATE 
AND triggered_at < CURRENT_DATE + INTERVAL '1 day';
```

### **3. Vector Similarity Search:**
```sql
-- Find similar document chunks
SELECT chunk_text, 1 - (embedding <=> $1) as similarity 
FROM rag_vectors 
WHERE tenant_id = $2 
AND 1 - (embedding <=> $1) > $3 
ORDER BY similarity DESC 
LIMIT 10;
```

### **4. Conversation History:**
```sql
-- Load chat history for conversation
SELECT role, message, created_at 
FROM rag_messages 
WHERE conversation_id = $1 
ORDER BY created_at ASC;
```

---

## Data Backup & Recovery

### **Critical Data Tables:**
1. **users** - User accounts and authentication
2. **rag_vectors** - AI embeddings (expensive to recreate)
3. **rag_conversations/messages** - Chat history
4. **rag_documents** - Original document content

### **Recovery Strategies:**
- **Database Backups**: Regular PostgreSQL dumps
- **File Backups**: uploads/ directory synchronization
- **Vector Recreation**: Can rebuild from rag_documents if needed
- **Session Recovery**: Redis data is temporary, can be recreated

---

## Performance Considerations

### **Database Indexes:**
```sql
-- Critical indexes for performance
CREATE INDEX idx_vectors_embedding ON rag_vectors USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_messages_conversation ON rag_messages(conversation_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
```

### **Query Optimization:**
- **Vector Search**: Uses IVFFlat index for fast similarity search
- **Session Lookup**: Redis cache with PostgreSQL fallback
- **Tenant Isolation**: Indexed tenant_id on all queries
- **Time-Based Queries**: Indexed timestamps for analytics

---

## Security & Data Protection

### **Data Encryption:**
- **Passwords**: bcrypt hashed in database
- **Sessions**: Secure random tokens
- **API Callbacks**: Signed tokens for webhook security

### **Access Control:**
- **Tenant Isolation**: All queries filtered by tenant_id
- **Role-Based Access**: Admin vs user permissions
- **Session Validation**: Token-based authentication

### **Data Privacy:**
- **Personal Data**: Stored in users table with proper access controls
- **Chat History**: Tenant-isolated conversation storage
- **File Uploads**: Secure file handling and validation

This comprehensive data flow guide provides a complete understanding of how data moves through the Resolve Onboarding application, enabling developers and administrators to effectively work with the system's data architecture.