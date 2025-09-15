Of course. This is a crucial update to ensure the application's architecture is robust and scalable.

Here is the complete, final Technical Design Document for "Rita," fully updated to include a flexible multi-tenancy model based on organizations, while preserving all previously discussed features.

-----

# Rita: Technical Design Document

* **Author:** Gemini
* **Date:** September 11, 2025
* **Status:** Final

## 1\. Overview

Rita is a real-time, **multi-tenant** chat application designed to interact with an external, webhook-based service for message processing. A user, acting within the context of an **organization**, can send messages or upload documents to support a **Retrieval-Augmented Generation (RAG)** pipeline. The external service processes these inputs asynchronously and sends responses back via a RabbitMQ queue.

This document outlines a **two-phase architectural approach**. Phase 1 (MVP) prioritizes speed of development by building a monolithic backend with integrated, organization-aware authentication and file handling. Phase 2 outlines the clear path to a scalable, decoupled microservices architecture.

-----

## 2\. Goals and Non-Goals

### Goals

* Implement a real-time, single-page chat interface for **authenticated users within an organization**.
* Provide a secure UI for users to upload documents, scoped to their active organization.
* Ensure reliable, asynchronous, and **tenant-isolated** message and document processing.
* Support a flexible tenancy model where users can belong to multiple organizations and switch between them.
* Design the MVP codebase in a modular way that directly facilitates future migration to a microservices model.

### Non-Goals

* Complex role-based access control (RBAC) within an organization (initial roles will be simple, e.g., 'owner', 'member').
* End-to-end message encryption.
* A production-grade container orchestration setup (the focus is on `docker-compose` for development).

-----

## 3\. System Architecture (MVP)

The initial version of Rita will be built with a monolithic backend. All data and operations will be isolated by an `organization_id`.

### Components

1.  **Client (React + TypeScript):** A single-page application that manages user sessions, organization context switching, and direct-to-storage file uploads.
2.  **API Server (Node.js + TypeScript):** A single, monolithic service that:
    * Exposes a REST API, protected by JWT authentication that includes an `organization_id`.
    * Manages real-time updates to the client via Server-Sent Events (SSE).
    * Contains the embedded consumer logic to listen for tenant-aware responses from the external RabbitMQ queue.
3.  **Database (PostgreSQL):** A single database with a shared schema, using Row Level Security (RLS) for tenant data isolation.
4.  **Authentication (Supabase):** Manages user identity, session management, and JWT issuance with custom claims for `organization_id`.
5.  **Storage (Supabase Storage):** Securely stores user-uploaded documents in a private bucket, with paths prefixed by `organization_id`.
6.  **External Service & RabbitMQ:** The third-party systems that Rita communicates with. Message payloads will be tagged with the `organization_id`.

-----

## 4\. Multi-Tenancy and Data Isolation

### 4.1. Tenancy Model: The "Implicit Organization"

To ensure a consistent experience, every user belongs to an organization.

* **For Single Users:** Upon signup, a Supabase trigger automatically creates a "personal" organization for the user, making them the owner. This means the application logic never needs to differentiate between a single user and a user in a team.
* **For Invited Users:** A user can be a member of multiple organizations.
* **The Active Context:** A user's session token (JWT) contains the `organization_id` of their currently **active** organization. All their actions (sending messages, uploading files) are performed within this context.

### 4.2. Switching Organizations

A UI element (e.g., a dropdown) will allow users to switch between the organizations they are members of.

1.  The user selects a new organization in the UI.
2.  The client calls a backend endpoint (`POST /api/session/switch-organization`).
3.  The backend verifies membership, then uses the Supabase Admin SDK to update the `organization_id` in the user's `app_metadata`.
4.  The client refreshes its session, receiving a new JWT with the updated `organization_id`. The application then reloads data for the new organizational context.

### 4.3. Database Schema

The schema is designed to enforce tenant isolation via foreign keys.

* **Table: `organizations`**
    * `id` (UUID, Primary Key)
    * `name` (TEXT, not null)
* **Table: `organization_members`**
    * `organization_id` (Foreign Key to `organizations.id`)
    * `user_id` (Foreign Key to Supabase `auth.users`)
    * `role` (TEXT, e.g., 'owner', 'member')
* **Table: `messages`**
    * `id` (UUID, Primary Key)
    * `organization_id` (UUID, not null, FK to `organizations.id`)
    * `user_id` (UUID, not null, FK to `auth.users`)
    * `original_content` (TEXT)
* **Table: `documents`**
    * `id` (UUID, Primary Key)
    * `organization_id` (UUID, not null, FK to `organizations.id`)
    * `user_id` (UUID, not null, FK to `auth.users`)
    * `file_path` (TEXT, not null)
    * `status` (TEXT, e.g., 'uploaded', 'processing', 'ready')

-----

## 5\. Authentication and Secure Storage

### 5.1. Authentication Strategy

The JWT issued by Supabase is the source of truth for both user identity and the active organizational context.

* **JWT Custom Claims:** The user's JWT will contain `app_metadata: { organization_id: "..." }`.
* **Middleware:** An Express middleware on the `api-server` will verify the token and extract both `user_id` and `organization_id`, making them available for every request.

### 5.2. Secure File Handling Strategy

Documents are stored in a private Supabase Storage bucket. The folder structure is tenant-isolated: **`<organization_id>/<file_name>`**. Access is granted exclusively via short-lived signed URLs. The external service **does not** need a JWT.

-----

## 6\. Project Structure

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

## 7\. Code Implementation Details

### 7.1. API Server: Tenant-Aware JWT Middleware (`authMiddleware.ts`)

```typescript
// ... imports
export interface AuthenticatedRequest extends Request {
  user?: any;
  organizationId?: string;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // ... token extraction logic ...
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error) { return res.status(401).send(`Unauthorized: ${error.message}`); }

  // Extract the organization_id from the token's custom claims
  const organizationId = user.app_metadata?.organization_id;
  if (!organizationId) {
    return res.status(403).send('Forbidden: No active organization in session');
  }

  req.user = user;
  req.organizationId = organizationId;
  next();
}
```

### 7.2. API Server: Tenant-Scoped File Upload Route (`server.ts`)

```typescript
app.post('/api/files/request-upload-url', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { fileName } = req.body;
  const organizationId = req.organizationId; // Provided by middleware

  // The file path is now prefixed with the organizationId
  const filePath = `${organizationId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUploadUrl(filePath);
  
  // ... error handling and response ...
});
```

### 7.3. API Server: Tenant-Aware RabbitMQ Consumer (`consumer.ts`)

```typescript
// ... imports
channel.consume(QUEUE_NAME, (msg) => {
  if (msg !== null) {
    try {
      // The message payload MUST contain the organizationId
      const { userId, organizationId, responsePayload } = JSON.parse(msg.content.toString());
      
      // All subsequent DB operations must use this organizationId
      // e.g., db.documents.update({ where: { ..., organizationId: organizationId } });
      
      notifier.notify(userId, responsePayload);
      channel.ack(msg);
    } catch (e) {
      channel.nack(msg, false, false);
    }
  }
});
```

*(Other code examples for the client, SSE, Notifiers, etc., remain largely the same but will now operate with the `organizationId` provided by the authentication context.)*

-----

## 8\. API Specification

* **`POST /api/messages`**
    * **Description:** Submits a chat message within the active organization's context.
    * **Auth:** Required. `organization_id` is derived from the JWT.
* **`GET /api/stream/:userId`**
    * **Description:** Opens an SSE stream.
    * **Auth:** Required.
* **`POST /api/files/request-upload-url`**
    * **Description:** Requests a signed URL for uploading a file into the active organization's storage.
    * **Auth:** Required.
* **`POST /api/files/upload-complete`**
    * **Description:** Notifies the server that a file upload is finished.
    * **Auth:** Required.
* **`POST /api/session/switch-organization`**
    * **Description:** Updates the user's active organization in their session token.
    * **Auth:** Required.
    * **Request Body:** `{ "organizationId": "string" }`
    * **Success Response:** `200 OK` with instructions for the client to refresh its session.

-----

## 9\. Future Scalability Path

The modular design and the consistent use of `organization_id` directly enable a smooth transition to a decoupled microservices architecture. This involves extracting the `consumer` module into its own service and introducing **Redis Pub/Sub** for internal communication.

-----

## 10\. Development and Deployment

* **Development:** The entire stack will be orchestrated using `docker-compose`.
* **Production:** The architecture will transition to using a container orchestrator (like Kubernetes) with managed cloud services for PostgreSQL, RabbitMQ, and Redis.