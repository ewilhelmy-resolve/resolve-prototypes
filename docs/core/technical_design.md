# Rita: Technical Design Document

  * **Author:** Gemini
  * **Date:** September 12, 2025
  * **Status:** Final (Updated for Conversation Model)

## 1\. Overview

Rita is a real-time, **multi-tenant** chat application designed to interact with an external, webhook-based service for message processing. A user, acting within the context of an **organization**, can send messages or upload documents to support a **Retrieval-Augmented Generation (RAG)** pipeline. The external service processes these inputs asynchronously and sends responses back via a RabbitMQ queue.

This document outlines an architecture that prioritizes speed of development for the MVP while establishing a clear path for future scalability.

-----

## 2\. MVP Scope

### In Scope (MVP)

  * Multi-tenant architecture with organization context
  * User authentication and organization switching
  * **Personal conversation-based chat history** (private to each user)
  * Send messages to external service via webhook
  * Receive responses via RabbitMQ
  * Real-time updates via SSE
  * Document upload support
  * Basic error handling and retry logic
  * Simple audit logging

### Out of Scope (Moved to v2)

  * Rate limiting
  * Advanced monitoring and metrics
  * Data retention policies
  * Compliance features (GDPR/CCPA)
  * Advanced analytics
  * Billing integration

-----

## 3\. System Architecture (MVP)

The initial version of Rita will be built with a monolithic backend where all data and operations are isolated by an `organization_id`.

### Components

1.  **Client (React + TypeScript):** A single-page application that manages user sessions, organization context switching, and direct-to-storage file uploads.
2.  **API Server (Node.js + TypeScript):** A single, monolithic service that:
      * Exposes a REST API, protected by JWT authentication. A middleware layer resolves the user's active organization on each request.
      * Manages real-time updates to the client via Server-Sent Events (SSE).
      * Contains the **embedded consumer logic** to listen for tenant-aware responses from the external RabbitMQ queue.
3.  **Database (PostgreSQL):** A single database with a shared schema, using **Row Level Security (RLS)** for tenant data isolation.
4.  **Authentication (Supabase):** Manages user identity, session management, and JWT issuance.
5.  **Storage (Supabase Storage):** Securely stores user-uploaded documents in a private bucket, with paths prefixed by `organization_id`.
6.  **External Service & RabbitMQ:** The third-party systems that Rita communicates with. Message payloads will be tagged with the `organization_id`.

-----

## 4\. Multi-Tenancy and Data Isolation

### 4.1. Tenancy Model: The "Implicit Organization"

To ensure a consistent experience, every user belongs to an organization.

  * **For Single Users:** Upon signup, a Supabase trigger automatically creates a "personal" organization for the user, making them the owner. This means the application logic never needs to differentiate between a single user and a user in a team.
  * **For Invited Users:** A user can be a member of multiple organizations.
  * **The Active Context:** A user's active organization is stored in the database. For each request, a middleware looks up this active `organization_id` to ensure all actions are performed in the correct context.

### 4.2. Switching Organizations

A UI element will allow users to switch between the organizations they are members of.

1.  The user selects a new organization in the UI.
2.  The client calls a backend endpoint (`POST /api/organizations/switch`).
3.  The backend verifies the user is a member of the target organization.
4.  It then updates the `active_organization_id` for that user in the `user_profiles` table. Subsequent API calls will use this new organization context.

-----

## 5\. Database Schema

The schema is designed to enforce tenant isolation via foreign keys and will be secured with RLS policies.

```sql
-- Core tables for MVP
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE organization_members (
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id)
);

-- Stores user-specific settings, including their active organization
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL
);

-- NEW: Table to group messages into conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- References auth.users(id)
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, -- ADDED
  user_id UUID NOT NULL,
  original_content TEXT,
  response_content TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  status TEXT DEFAULT 'uploaded',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for many-to-many relationship between messages and documents
CREATE TABLE message_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, document_id)
);

-- Simple audit log for MVP
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

-----

## 6\. Authentication and Secure Storage

The JWT issued by Supabase is the source of truth for user identity. The active organizational context is determined by a server-side lookup.

  * **Active Organization Lookup:** The user's currently active organization is stored in the database (see `user_profiles` table).
  * **Middleware:** An Express middleware on the `api-server` will verify the token to get the `user_id`. It then queries the database to find the user's `active_organization_id`, making both available for every request.
  * **Secure File Handling:** Documents are stored in a private Supabase Storage bucket. The folder structure is tenant-isolated: **`<organization_id>/<file_name>`**. Access is granted exclusively via short-lived signed URLs.

-----

## 7\. Project Structure

```plaintext
rita-chat/
├── docker-compose.yml
├── .env.example
└── packages/
    ├── client/
    │   └── src/
    │       ├── components/     # UI Components (Chat, FileUploader, OrgSwitcher)
    │       ├── hooks/          # Custom hooks (e.g., useSseStream.ts)
    │       └── services/       # API calls and Supabase client setup
    │
    └── api-server/
        └── src/
            ├── web/
            │   ├── server.ts
            │   ├── SseManager.ts
            │   └── authMiddleware.ts
            │
            ├── consumer/
            │   └── consumer.ts
            │
            ├── notifications/
            │   ├── Notifier.ts
            │   └── DirectNotifier.ts
            │
            └── index.ts        # Main entrypoint
```

-----

## 8\. API Specification (Conversation-Centric Design)

### Conversation Management
  * **`GET /api/conversations`**
      * **Description:** Retrieves a list of personal conversations for the authenticated user.
      * **Auth:** Required.
      * **Security:** Only returns conversations owned by the current user.
  * **`POST /api/conversations`**
      * **Description:** Creates a new conversation for the authenticated user.
      * **Auth:** Required.
      * **Request Body:** `{ "title": "string" }`.
  * **`GET /api/conversations/:id/messages`**
      * **Description:** Retrieves all messages for a specific conversation.
      * **Auth:** Required.
      * **Security:** Only accessible if user owns the conversation.
  * **`POST /api/conversations/:id/messages`**
      * **Description:** Adds a message to a specific conversation.
      * **Auth:** Required.
      * **Request Body:** `{ "content": "string", "document_ids": ["string"] (optional) }`.
      * **Security:** Only accessible if user owns the conversation.

### Legacy Endpoints
  * **`GET /api/messages/:id`**
      * **Description:** Retrieves a specific message by ID.
      * **Auth:** Required.
      * **Security:** Only accessible if user owns the conversation containing the message.

### Real-time & File Management
  * **`GET /api/sse/events`**
      * **Description:** Opens an SSE stream for real-time updates.
      * **Auth:** Required.
  * **`POST /api/files/request-upload-url`**
      * **Description:** Requests a signed URL for uploading a file into the active organization's storage.
      * **Auth:** Required.

### Organization Management
  * **`POST /api/organizations/switch`**
      * **Description:** Sets the user's active organization for subsequent requests.
      * **Auth:** Required.
      * **Request Body:** `{ "organization_id": "string" }`.

-----

## 9\. Development and Deployment

### 9.1 Environment Variables (.env.example)

```bash
# App
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://rita:rita@postgres:5432/rita

# Supabase (New API Keys 2025+)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
SUPABASE_SECRET_KEY=sb_secret_your-key

# External Service
AUTOMATION_WEBHOOK_URL=https://external-service.com/webhook
AUTOMATION_AUTH=your-secret-token

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
QUEUE_NAME=rita_responses

# Redis (optional but recommended for SSE)
REDIS_URL=redis://redis:6379
```

### 9.2 Docker Compose

For local development, the stack will be orchestrated using `docker-compose`.

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: rita
      POSTGRES_USER: rita
      POSTGRES_PASSWORD: rita
    ports:
      - "5432:5432"

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build: ./packages/api-server
    command: npm run dev
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://rita:rita@postgres:5432/rita
      RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - rabbitmq
      - redis
```