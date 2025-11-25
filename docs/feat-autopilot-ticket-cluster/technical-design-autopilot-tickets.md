# Technical Design Document: RITA Autopilot & Cluster Dashboard

**Status:** Draft v1.3
**Date:** November 24, 2025
**Feature:** Continuous ITSM Ingestion, Live Dashboard, & Cluster Management

-----

## 1\. Executive Summary

This document outlines the architecture for the RITA Autopilot Dashboard. The system is designed to ingest high volumes of ITSM tickets, group them into AI-driven clusters, and present them in an interactive dashboard that allows IT Analysts to validate data and enable automation.

**Key Architectural Decisions:**

* **Event-Driven Architecture:** Decouples the User Interface (Rita Client) from the heavy AI processing (Workflow Platform).
* **Command-Query Separation:** The App triggers actions, but the Workflow Platform acts as the "Source of Truth" for cluster definitions.
* **Two-Speed UX:** "Core Data" (Tickets) loads immediately to unlock the UI, while "Enrichment" (Knowledge Base analysis) occurs asynchronously in the background.
* **Pre-Aggregated Metrics:** Uses a "Daily Bucket" pattern to ensure dashboard charts render instantly regardless of date range selection.

### Implementation Prerequisites

Before implementing this feature, the following codebase changes are required:

1. **Add `jira` to `ALLOWED_DATA_SOURCE_TYPES`** in `packages/api-server/src/constants/dataSources.ts`
2. **Add `jira` to `DEFAULT_DATA_SOURCES`** array for org seeding
3. **Add system user constant** for auto-generated records (clusters created by Workflow Platform)

-----

## 2\. High-Level Architecture

### 2.1 The Flow

1.  **Command:** User triggers a sync via **Rita Backend**.
2.  **Process:** **Workflow Platform** fetches data from ITSM tools (ServiceNow/Jira), performs AI clustering, and assigns stable Cluster IDs.
3.  **Publish:** Data flows back to Rita Backend via **RabbitMQ** in two distinct phases (Batch Ingest & Async Enrichment).
4.  **Query:** **Rita Client** reads from optimized PostgreSQL tables and receives real-time updates via Server-Sent Events (SSE).

### 2.2 Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant RC as Rita Client
    participant RB as Rita Backend
    participant DB as Postgres DB
    participant MQ as RabbitMQ
    participant WP as Workflow Platform
    participant ITSM as ServiceNow/Jira

    Note over User, RB: PHASE 1: The Trigger (with Auth & Audit)
    User->>RC: Click "Sync Tickets"
    Note right of User: User authenticated via Keycloak JWT
    RC->>RB: POST /api/ingest/trigger<br/>{Authorization: Bearer JWT}

    Note right of RB: Extract user_id & active_organization_id<br/>from JWT + user_profiles table
    RB->>DB: SET LOCAL app.current_organization_id
    RB->>DB: INSERT ingestion_runs<br/>(organization_id, started_by, status='pending')
    Note right of RB: Log audit: trigger_ticket_sync<br/>(user_id, organization_id, ingestion_run_id)

    RB->>WP: POST webhook<br/>source: 'rita-chat'<br/>action: 'sync_tickets'<br/>tenant_id, user_id, user_email<br/>connection_id, connection_type: 'servicenow'|'jira'<br/>ingestion_run_id
    RB->>DB: UPDATE ingestion_runs SET status='running'
    RB-->>RC: 200 OK {ingestion_run_id, status: "SYNCING"}
    RC-->>User: UI shows Progress Bar (Locked)

    Note over WP, ITSM: PHASE 2: Ingestion & Sorting
    WP->>ITSM: Fetch Batch (Mixed Topics)
    ITSM-->>WP: Return Raw Tickets
    WP->>WP: AI Sorts Tickets (Assigns Stable Cluster IDs)

    Note over WP, MQ: PHASE 3: Batch Result Handoff
    WP->>MQ: Publish `ticket_batch_processed`
    Note right of WP: Payload includes:<br/>{organization_id, ingestion_run_id,<br/>groups: [{cluster_id, name, tickets}]}

    MQ->>RB: Consume Message
    activate RB
    Note right of RB: Extract organization_id from payload
    RB->>DB: SET LOCAL app.current_organization_id
    Note right of RB: BEGIN TRANSACTION

    loop For Each Group in Batch
        RB->>DB: UPSERT clusters<br/>(id, organization_id, name, config, created_by)
        RB->>DB: UPSERT tickets<br/>(organization_id, cluster_id, external_id, source_metadata)
        RB->>DB: UPSERT analytics_cluster_daily<br/>(organization_id, cluster_id, day, total_tickets)
    end

    alt Success
        RB->>DB: UPDATE ingestion_runs<br/>SET status='completed', records_processed=N
        Note right of RB: COMMIT TRANSACTION
    else Validation Error (partial failure)
        Note right of RB: COMMIT TRANSACTION (continue with valid records)<br/>Log validation errors to message_processing_failures
        RB->>DB: UPDATE ingestion_runs<br/>SET records_failed=M
    else Critical Error
        Note right of RB: ROLLBACK TRANSACTION<br/>Log to message_processing_failures for retry
        RB->>DB: UPDATE ingestion_runs<br/>SET status='failed', error_message
        RB->>MQ: NACK message (will retry)
    end
    deactivate RB

    critical UX UNLOCK
    RB--)RC: SSE Event: `ingestion_run_update`<br/>{ingestion_run_id, status: 'completed', records_processed}
    RC->>DB: GET /api/dashboard/clusters<br/>(filtered by organization_id via RLS)
    RC-->>User: UI UNLOCKED. Cards appear.<br/>Badge says "Analyzing..."
    end

    Note over WP, MQ: PHASE 4: Async Enrichment
    rect rgb(240, 248, 255)
    Note right of WP: Background Process (Knowledge Base Search)
    WP->>WP: Deep Search Knowledge Base
    WP->>MQ: Publish `ticket_cluster_enrichment`<br/>{organization_id, cluster_id, kb_status, articles[]}

    MQ->>RB: Consume Message
    activate RB
    RB->>DB: SET LOCAL app.current_organization_id
    Note right of RB: BEGIN TRANSACTION

    RB->>DB: UPDATE clusters<br/>SET kb_status='FOUND', updated_at=NOW()
    RB->>DB: UPSERT knowledge_articles<br/>(organization_id, external_id, cluster_id, title, url, relevance_score)

    Note right of RB: COMMIT TRANSACTION
    deactivate RB

    RB--)RC: SSE Event: `cluster_update`<br/>{cluster_id, kb_status: "FOUND"}
    RC-->>User: Card "c1" badge updates to "Knowledge Found"
    end
```

### 2.3 Delegated ITSM Credential Setup

**Use Case:** RITA Autopilot Owner needs to connect ServiceNow or Jira for ticket ingestion, but does not have ITSM administrator credentials.

**Solution:** Secure, ephemeral "magic link" system that allows an external IT Admin to input sensitive credentials without creating a RITA user account.

#### Security Model

* **Zero Credential Storage:** Rita NEVER stores ITSM credentials - they pass through in memory only and are immediately sent to external service
* **Magic Link Pattern:** 64-character hex token (256-bit entropy) with 7-day expiration
* **Single-Use Enforcement:** Atomic database update prevents token reuse (race condition protection)
* **Real-Time Feedback:** SSE events notify both delegator and delegate of verification status
* **Audit Trail:** All delegation and verification actions logged for SOC2 compliance

#### Supported Systems

* **ServiceNow** - Username/password or API token authentication
* **Jira** - API token + email authentication
* **Confluence** - API token + email authentication (optional delegation for private instances)

#### Delegation Flow

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Owner
    participant Client as Rita Client
    participant Backend as Rita Backend
    participant DB as PostgreSQL
    actor Admin as IT Admin (External)
    participant Webhook as Workflow Platform
    participant Queue as RabbitMQ

    Note over Owner,Queue: PHASE 1: Delegation Creation

    Owner->>Client: Navigate to ServiceNow setup<br/>Click "Delegate to IT Admin"
    Client->>Backend: POST /credential-delegations/create<br/>{admin_email, system_type: "servicenow"}

    Backend->>DB: Check no pending delegation exists<br/>(admin_email + org + system_type)
    DB-->>Backend: No duplicate found

    Backend->>Backend: Generate secure token<br/>crypto.randomBytes(32).toString('hex')
    Backend->>DB: INSERT credential_delegation_tokens<br/>(token, status='pending', expires_at=7days)
    Backend->>DB: INSERT audit_logs<br/>(action: 'create_credential_delegation')

    Backend->>Webhook: POST webhook<br/>source: 'rita-credential-delegation'<br/>action: 'send_delegation_email'<br/>tenant_id, user_id, user_email<br/>admin_email, delegation_url, organization_name, itsm_system_type
    Note right of Webhook: Workflow Platform sends email<br/>with magic link to IT Admin

    Backend-->>Client: 200 {delegation_id, expires_at, status: "pending"}
    Client-->>Owner: "Invitation sent to admin@company.com"

    Note over Admin,Client: PHASE 2: IT Admin Receives & Clicks Link

    Note over Admin: IT Admin receives email<br/>and clicks magic link
    Admin->>Client: Click link → /credential-setup?token=xxx

    Client->>Backend: GET /credential-delegations/verify/:token
    Backend->>DB: SELECT * FROM credential_delegation_tokens<br/>WHERE token=$1 AND status='pending'<br/>AND expires_at > NOW()

    alt Token Valid
        DB-->>Backend: Return delegation details
        Backend-->>Client: 200 {valid: true, org_name, system_type, delegated_by}
        Client-->>Admin: Display credential form<br/>(ServiceNow URL, username, password)
    else Token Invalid/Expired
        DB-->>Backend: No match found
        Backend-->>Client: 400 {valid: false, reason: "expired"}
        Client-->>Admin: "This link has expired or been used"
    end

    Note over Admin,Webhook: PHASE 3: Credential Submission

    Admin->>Client: Fill form & click "Verify Credentials"<br/>{url, username, password}

    Client->>Backend: POST /credential-delegations/submit<br/>{token, credentials}

    Backend->>DB: BEGIN TRANSACTION
    Backend->>DB: UPDATE credential_delegation_tokens<br/>SET status='used', credentials_received_at=NOW()<br/>WHERE token=$1 AND status='pending'<br/>RETURNING id

    alt Update Successful (Single-Use Enforcement)
        DB-->>Backend: Row updated, return id

        Backend->>DB: UPSERT data_source_connections<br/>(organization_id, type, status='verifying')<br/>ON CONFLICT (organization_id, type) DO UPDATE<br/>RETURNING id as connection_id
        Note right of Backend: Create/update connection record BEFORE webhook<br/>to get connection_id for webhook payload

        Backend->>DB: UPDATE credential_delegation_tokens<br/>SET connection_id=$1 WHERE id=$2
        Backend->>DB: COMMIT TRANSACTION

        Backend->>Backend: Base64 encode password<br/>(prevent accidental logging)

        Backend->>Webhook: POST webhook<br/>source: 'rita-chat'<br/>action: 'verify_credentials'<br/>tenant_id, user_id, user_email, connection_id<br/>connection_type: 'servicenow'|'jira'<br/>credentials: {username, password (base64)}
        Note right of Webhook: Workflow Platform validates<br/>credentials against ServiceNow API

        Backend-->>Client: 202 {status: "verifying", polling_url: "/status/:token"}
        Client-->>Admin: Show spinner + start polling every 3s

        loop Poll every 3 seconds (max 30s)
            Client->>Backend: GET /credential-delegations/status/:token
            Backend->>DB: SELECT status FROM credential_delegation_tokens<br/>WHERE token=$1
            alt Still Verifying (status='used')
                Backend-->>Client: 200 {status: "verifying"}
                Client-->>Admin: Continue showing spinner
            end
        end

        Note over Client,Admin: Polling continues until status changes<br/>or 30s timeout (see Phase 4)

    else Already Used (Race Condition)
        DB-->>Backend: 0 rows updated
        Backend->>DB: ROLLBACK TRANSACTION
        Backend-->>Client: 409 {error: "Token already used"}
        Client-->>Admin: "This link has already been used"
    end

    Note over Webhook,Queue: PHASE 4: Async Verification Result

    alt Credentials Valid
        Webhook->>Webhook: Test connection to ServiceNow<br/>Store credentials securely<br/>(tenant_id + connection_id + type)

        Webhook->>Queue: Publish data_source_status<br/>{type: "verification", connection_id, tenant_id,<br/>status: "success", options: {tables: "..."}}

        Queue->>Backend: Consume verification message
        Backend->>DB: BEGIN TRANSACTION
        Backend->>DB: UPDATE credential_delegation_tokens<br/>SET status='verified', credentials_verified_at=NOW()
        Backend->>DB: UPDATE data_source_connections<br/>SET status='idle', enabled=true,<br/>latest_options=$options, last_verification_at=NOW()
        Note right of Backend: Connection record already exists<br/>(created during credential submission)
        Backend->>DB: INSERT audit_logs<br/>(action: 'credential_verification_success')
        Backend->>DB: COMMIT TRANSACTION

        Backend--)Client: SSE Event: data_source_update<br/>{connection_id, connection_type: "servicenow", status: "idle"}
        Client-->>Owner: Toast: "ServiceNow credentials verified ✓"

        Note over Client,Admin: Next poll detects status='verified'
        Client->>Backend: GET /credential-delegations/status/:token
        Backend->>DB: SELECT status, connection_id
        Backend-->>Client: 200 {status: "success", connection_id}
        Client-->>Admin: Success: "Credentials verified!<br/>You can close this page."

        Backend->>Webhook: POST webhook (optional)<br/>action: 'send_verification_result_email'<br/>admin_email, verification_status: "success"
        Note right of Webhook: Email notification sent to IT Admin

    else Credentials Invalid
        Webhook->>Queue: Publish data_source_status<br/>{type: "verification", connection_id, tenant_id,<br/>status: "failed", error: "Invalid credentials..."}

        Queue->>Backend: Consume verification message
        Backend->>DB: UPDATE credential_delegation_tokens<br/>SET status='pending',<br/>last_verification_error='Invalid credentials'

        Note over Client,Admin: Next poll detects status='pending'
        Client->>Backend: GET /credential-delegations/status/:token
        Backend->>DB: SELECT status, last_verification_error
        Backend-->>Client: 200 {status: "failed", error, allow_retry: true}
        Client-->>Admin: Error: "Invalid credentials. Please try again."<br/>(Form remains editable, can retry)

        Backend->>Webhook: POST webhook<br/>action: 'send_verification_result_email'<br/>admin_email, verification_status: "failed", error
        Note right of Webhook: Email notification sent to IT Admin
    end

    alt Polling Timeout (30 seconds)
        Note over Client,Admin: Status still 'used' after 10 polls
        Client-->>Admin: "Verification taking longer than expected.<br/>We'll email you at {admin_email} when complete."
        Note right of Admin: IT Admin can close page.<br/>Will receive email when verification completes.
    end

    Note over Owner,Client: PHASE 5: Setup Complete

    Owner->>Client: Refresh data sources page
    Client->>Backend: GET /data-sources
    Backend->>DB: SELECT * FROM data_source_connections<br/>WHERE organization_id=$1
    DB-->>Backend: Return all connections (ServiceNow now enabled=true)
    Backend-->>Client: Return data sources
    Client-->>Owner: ServiceNow card shows:<br/>Status: "Configured ✓"<br/>"Last verified: 2 minutes ago"
```

#### Key Features

**Token Security:**
- Generated using `crypto.randomBytes(32).toString('hex')` (matches invitation system pattern)
- 7-day expiration (configurable)
- Single-use atomic enforcement prevents race conditions
- Rate limiting: 10 delegations per org per day

**Zero Credential Storage:**
- Credentials never persisted to Rita database
- Passed in memory only from frontend → API → webhook → external service
- Base64 encoding prevents accidental logging
- External service stores credentials using composite key: `(tenant_id, connection_id, connection_type)`

**Real-Time Updates:**
- IT Admin sees verification result via SSE (no polling required)
- RITA Owner receives toast notification when setup completes
- Both parties get immediate feedback on success/failure

**Audit Compliance (SOC2):**
- Who created delegation (RITA Owner user_id)
- Who submitted credentials (IT Admin email, IP address)
- When credentials verified (timestamp)
- All logged to `audit_logs` table

**Error Handling:**
- Invalid/expired token → User-friendly error message
- Credentials fail verification → Allow retry (token reverts to 'pending')
- Webhook failure → Logged to `message_processing_failures` with retry logic
- Race conditions → Atomic status updates prevent duplicate submissions

-----

## 3\. Data Architecture (PostgreSQL)

### 3.1 Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    %% Core Multi-Tenancy
    organizations ||--o{ clusters : "owns"
    organizations ||--o{ tickets : "owns"
    organizations ||--o{ analytics_cluster_daily : "owns"
    organizations ||--o{ knowledge_articles : "owns"
    organizations ||--o{ ingestion_runs : "owns"

    %% User Tracking
    user_profiles ||--o{ clusters : "automation_enabled_by"
    user_profiles ||--o{ tickets : "validated_by"
    user_profiles ||--o{ ingestion_runs : "started_by"

    %% Data Relationships
    clusters ||--o{ tickets : "contains"
    clusters ||--o{ analytics_cluster_daily : "aggregates"
    clusters ||--o{ knowledge_articles : "linked_to"

    %% Data Source Integration (optional)
    data_source_connections ||--o{ tickets : "source (optional)"
    data_source_connections ||--o{ ingestion_runs : "data_source"

    %% Error Tracking (existing table)
    message_processing_failures ||--o{ ingestion_runs : "tracks_errors"

    %% Credential Delegation (ITSM setup)
    organizations ||--o{ credential_delegation_tokens : "owns"
    user_profiles ||--o{ credential_delegation_tokens : "created_by"
    credential_delegation_tokens }o--|| data_source_connections : "enables_setup"

    organizations {
        uuid id PK
        text name
        timestamp created_at
        timestamp updated_at
    }

    user_profiles {
        uuid user_id PK "Keycloak-ID"
        uuid active_organization_id FK
        text email
        text first_name
        text last_name
        timestamp created_at
        timestamp updated_at
    }

    data_source_connections {
        uuid id PK
        uuid organization_id FK
        text type "servicenow|jira|confluence|sharepoint"
        text name
        text status "idle|syncing"
        timestamp last_sync_at
        boolean enabled
    }

    message_processing_failures {
        uuid id PK
        uuid tenant_id FK "organization_id"
        uuid message_id
        varchar queue_name "ingest.batch.processed"
        jsonb message_payload
        text error_message
        varchar error_type
        int retry_count
        timestamp created_at
    }

    clusters {
        uuid id PK "Auto-generated internal ID"
        uuid organization_id FK "organizations.id ON DELETE CASCADE"
        text external_cluster_id UK "Stable ID from Workflow Platform"
        string name "Dynamic AI Name"
        jsonb config "{auto_respond: boolean, auto_populate: boolean}"
        int validation_target "TBD - nullable until product spec"
        int validation_current "Current approved samples"
        text kb_status "PENDING|FOUND|GAP"
        uuid automation_enabled_by FK "user_profiles.user_id"
        timestamp automation_enabled_at
        timestamp created_at
        timestamp updated_at "auto-trigger"
    }

    tickets {
        uuid id PK
        uuid organization_id FK "organizations.id ON DELETE CASCADE"
        uuid cluster_id FK "clusters.id ON DELETE CASCADE"
        uuid data_source_connection_id FK "optional - for filtering by connection"
        string external_id "INC-123"
        string subject
        string external_status "Open, Closed, etc"
        text rita_status "NEEDS_RESPONSE|COMPLETED"
        boolean is_validation_sample "Flag for validation UI"
        text validation_result "PENDING|APPROVED|REJECTED"
        uuid validated_by FK "user_profiles.user_id"
        timestamp validated_at
        jsonb source_metadata "Raw ITSM properties from source system"
        timestamp created_at
        timestamp updated_at "auto-trigger"
    }

    analytics_cluster_daily {
        uuid organization_id PK "FK organizations.id"
        uuid cluster_id PK "FK clusters.id ON DELETE CASCADE"
        date day PK
        int total_tickets
        int automated_count
        int kb_gap_count "TBD - computation logic pending"
        timestamp created_at
        timestamp updated_at
    }

    knowledge_articles {
        uuid id PK
        uuid organization_id FK "organizations.id ON DELETE CASCADE"
        uuid cluster_id FK "clusters.id ON DELETE CASCADE"
        text external_id "UNIQUE(org_id, external_id) - from Workflow Platform"
        string title
        string url
        float relevance_score
        text status "active|broken|archived - defer until needed"
        timestamp created_at
        timestamp updated_at "auto-trigger"
    }

    ingestion_runs {
        uuid id PK
        uuid organization_id FK "organizations.id ON DELETE CASCADE"
        uuid data_source_connection_id FK "optional"
        uuid started_by FK "user_profiles.user_id"
        text status "pending|running|completed|failed|cancelled"
        int records_processed
        int records_failed
        jsonb metadata "batch_id, sync params"
        text error_message
        timestamp completed_at
        timestamp created_at "also serves as started_at"
        timestamp updated_at
    }

    credential_delegation_tokens {
        uuid id PK
        uuid organization_id FK "organizations.id ON DELETE CASCADE"
        uuid created_by_user_id FK "user_profiles.user_id"
        text admin_email "IT admin email (not Rita user)"
        text itsm_system_type "servicenow|jira|confluence"
        text delegation_token UK "64-char hex (32 bytes)"
        timestamp token_expires_at "7 days default"
        text status "pending|used|verified|expired|cancelled"
        timestamp credentials_received_at "when IT admin submitted"
        timestamp credentials_verified_at "when external service verified"
        text last_verification_error
        uuid connection_id FK "data_source_connections.id ON DELETE SET NULL"
        timestamp created_at
    }
```

-----

## 4\. Interface Contracts

### 4.1 Webhook Payloads

#### Credential Delegation Email Webhook

**Webhook:** Workflow Platform
**Action:** `send_delegation_email`
**Purpose:** Send magic link email to IT Admin for delegated credential setup

```json
{
  "source": "rita-credential-delegation",
  "action": "send_delegation_email",
  "tenant_id": "org-uuid-123",
  "user_id": "creator-uuid-456",
  "user_email": "owner@company.com",
  "admin_email": "itadmin@company.com",
  "delegation_url": "https://rita.app/credential-setup?token=abc123...",
  "organization_name": "Acme Corp",
  "itsm_system_type": "servicenow",
  "delegation_token_id": "token-uuid-789",
  "expires_at": "2025-12-01T10:00:00Z",
  "timestamp": "2025-11-24T10:00:00Z"
}
```

**Required Fields:**
- `source`, `action`, `tenant_id`, `user_id`, `user_email` - Standard webhook fields
- `admin_email` - IT Admin recipient email (not a Rita user)
- `delegation_url` - Full URL with secure token for credential setup page
- `organization_name` - For email personalization
- `itsm_system_type` - System being configured: `servicenow`, `jira`, or `confluence`
- `timestamp` - ISO 8601 timestamp

**Optional Fields:**
- `delegation_token_id` - For external tracking/logging
- `expires_at` - Token expiry (7 days default)

**Error Handling:**
- Webhook failures logged to `rag_webhook_failures` table
- Retry: 3 attempts with exponential backoff
- Non-retryable errors (4xx) marked as `dead_letter`

---

#### Credential Verification Webhook

**Webhook:** Workflow Platform
**Action:** `verify_credentials`
**Purpose:** Validate ITSM credentials and store securely in external service

```json
{
  "source": "rita-chat",
  "action": "verify_credentials",
  "tenant_id": "org-uuid-123",
  "user_id": "creator-uuid-456",
  "user_email": "owner@company.com",
  "connection_id": "conn-uuid-789",
  "connection_type": "servicenow",
  "credentials": {
    "username": "admin@company.com",
    "password": "YmFzZTY0RW5jb2RlZFBhc3N3b3Jk"
  },
  "settings": {
    "url": "https://company.service-now.com"
  },
  "timestamp": "2025-11-24T10:00:00Z"
}
```

**Connection Types:**
- `servicenow` - Basic auth (username/password)
- `jira` - API token + email
- `confluence` - API token + email

**ServiceNow Credentials:**
```json
{
  "credentials": {
    "username": "admin@company.com",
    "password": "YmFzZTY0RW5jb2RlZA=="
  },
  "settings": {
    "url": "https://company.service-now.com"
  }
}
```

**Jira/Confluence Credentials:**
```json
{
  "credentials": {
    "api_token": "ATATT3xFfGF0...",
    "email": "user@company.com"
  },
  "settings": {
    "url": "https://company.atlassian.net"
  }
}
```

**Security:**
- Password base64 encoded to prevent accidental logging
- Credentials transmitted over HTTPS only
- Rita NEVER stores credentials in database
- External service stores with composite key: `(tenant_id, connection_id, connection_type)`

**Response:** HTTP 200 (synchronous acknowledgment)
**Result:** Arrives asynchronously via RabbitMQ `data_source_status` queue

---

#### Sync Tickets Webhook (Autopilot)

**Webhook:** Workflow Platform
**Action:** `sync_tickets`
**Purpose:** Trigger ITSM ticket sync for autopilot clustering

```json
{
  "source": "rita-chat",
  "action": "sync_tickets",
  "tenant_id": "org-uuid-123",
  "user_id": "user-uuid-456",
  "user_email": "analyst@company.com",
  "ingestion_run_id": "run-uuid-789",
  "connection_id": "conn-uuid-abc",
  "connection_type": "servicenow",
  "settings": {
    "instance_url": "https://company.service-now.com",
    "tables": ["incident", "kb_knowledge"],
    "filters": {
      "state": "open",
      "priority": ["1", "2", "3"]
    }
  },
  "timestamp": "2025-11-24T10:00:00Z"
}
```

**Connection Types:**
- `servicenow` - Tables: incident, problem, change_request, kb_knowledge
- `jira` - Projects from latest_options
- `confluence` - Spaces from latest_options (if KB-only sync)

**Comparison with Data Source Sync:**
- Same `source: "rita-chat"` and `connection_type` pattern
- Different `action: "sync_tickets"` (vs `"trigger_sync"` for data sources)
- Includes `ingestion_run_id` for autopilot tracking
- Workflow Platform uses `connection_type` to determine ITSM-specific behavior

**Workflow Platform Processing:**
1. Looks up credentials using composite key: `(tenant_id, connection_id, connection_type)`
2. Fetches tickets from ITSM system using stored credentials
3. AI clustering engine groups tickets by similarity
4. Publishes `ticket_batch_processed` message to RabbitMQ (see Section 4.2)

**Response:** HTTP 200 (synchronous acknowledgment)
**Result:** Arrives asynchronously via RabbitMQ `ticket_batch_processed` queue

---

### 4.2 RabbitMQ Payloads

**Queue:** `ticket_batch_processed` (Phase 3)
*Purpose: High-throughput core data transfer.*

```json
{
  "batch_id": "b-789",
  "organization_id": "org-uuid-123",
  "ingestion_run_id": "run-uuid-456",
  "groups": [
    {
      "cluster_id": "c-555",
      "name": "Email Signatures",
      "tickets": [
        {
          "ext_id": "INC001",
          "subject": "Fix signature",
          "created_at": "2025-11-20T10:00:00Z",
          "external_status": "open",
          "rita_status": "needs_response",
          "is_validation_sample": true,
          "source_metadata": {
            "source": "servicenow",
            "instance_url": "https://acme.service-now.com",
            "sys_id": "abc123"
          }
        }
      ]
    }
  ]
}
```

**Queue:** `ticket_cluster_enrichment` (Phase 4)
*Purpose: Metadata enrichment (populates the Knowledge Tab).*

```json
{
  "organization_id": "org-uuid-123",
  "cluster_id": "c-555",
  "kb_status": "FOUND",
  "articles": [
    {
      "title": "How to update Outlook Signature",
      "url": "https://service-now.com/kb/123",
      "relevance": 0.95,
      "status": "active"
    }
  ]
}
```

**Error Handling:**
- RabbitMQ message processing failures logged to existing `message_processing_failures` table
- `queue_name` = `ticket_batch_processed`, `ticket_cluster_enrichment`, or `data_source_status`
- Failed messages include full payload for retry/debugging
- Retry logic: max 3 attempts with exponential backoff

**Queue:** `data_source_status` (Delegated Setup & Data Source Verification)
*Purpose: Async credential verification results for all data source types (ServiceNow, Jira, Confluence).*

**Success Message:**
```json
{
  "type": "verification",
  "connection_id": "conn-uuid-789",
  "tenant_id": "org-uuid-123",
  "status": "success",
  "options": {
    "tables": "incident,problem,change_request"
  },
  "error": null
}
```

**Failure Message:**
```json
{
  "type": "verification",
  "connection_id": "conn-uuid-789",
  "tenant_id": "org-uuid-123",
  "status": "failed",
  "options": null,
  "error": "Invalid credentials or insufficient permissions"
}
```

**Options by Connection Type:**
- ServiceNow: `{"tables": "incident,problem,change_request"}` - Comma-separated table names
- Jira: `{"projects": "PROJ1,PROJ2,PROJ3"}` - Comma-separated project keys
- Confluence: `{"spaces": "ENG,PROD,DOCS"}` - Comma-separated space keys

**Consumer:** `DataSourceStatusConsumer` (existing consumer, reused for delegation flow):

**On Success:**
1. Update `data_source_connections`:
   - `status` → `'active'`
   - `latest_options` → options JSONB
   - `last_verification_at` → `NOW()`
   - `enabled` → `true`

2. If triggered by delegation:
   - Lookup `credential_delegation_tokens` by `connection_id`
   - Update `status` → `'verified'`
   - Update `credentials_verified_at` → `NOW()`
   - INSERT `audit_logs` (action: `'credential_verification_success'`)

3. Emit SSE event: `credential_verified` to organization

**On Failure:**
1. Update `data_source_connections.status` → `'failed'`

2. If triggered by delegation:
   - Update `credential_delegation_tokens.status` → `'pending'` (allow retry)
   - Update `last_verification_error` → error message

3. Emit SSE event: `credential_failed` to organization

### 4.2 Frontend API Endpoints

**Authentication & Authorization:**
- All endpoints require Keycloak JWT token in Authorization header
- User's `active_organization_id` from `user_profiles` determines organization context
- All queries filtered by `organization_id` via Row-Level Security (RLS)

#### Dashboard View

* **`GET /api/dashboard/stats?range=30d`**
    * Aggregates `analytics_cluster_daily` for user's active organization
    * Returns: `{ total_tickets, automated_count, kb_gap_count, clusters_total, avg_automation_rate }`
    * Query: `WHERE organization_id = current_user.active_organization_id`

* **`GET /api/dashboard/clusters?range=30d&sort=volume`**
    * Returns cluster list for user's active organization with metrics
    * Supports sorting: `volume` (ticket count), `automation` (auto_respond rate), `recent` (created_at)
    * Query: `WHERE organization_id = current_user.active_organization_id AND created_at >= NOW() - range`

#### Cluster Detail View

* **`GET /api/clusters/:id/details`**
    * Returns cluster metadata for user's active organization
    * Response: `{ id, name, config, validation_target, validation_current, kb_status, trend_data[], created_by, updated_by, automation_enabled_at, automation_enabled_by }`
    * Query: `WHERE id = :id AND organization_id = current_user.active_organization_id`

* **`GET /api/clusters/:id/tickets`**
    * Returns paginated tickets for cluster in user's active organization
    * Supports tabs: `?tab=needs_response|completed|validation_pending`
    * Pagination: cursor-based using `created_at` field
    * Query: `WHERE cluster_id = :id AND organization_id = current_user.active_organization_id AND rita_status = :tab`

* **`GET /api/clusters/:id/knowledge`**
    * Returns linked knowledge articles for cluster
    * Query: `WHERE cluster_id = :id AND organization_id = current_user.active_organization_id AND status = 'active'`
    * Response includes: `{ id, title, url, relevance_score, created_by, created_at }`

#### Actions (Mutation Endpoints)

* **`PATCH /api/clusters/:id/config`**
    * Payload: `{ "auto_respond": true, "auto_populate": false }`
    * Authorization: Requires `admin` or `owner` role in organization
    * Action: Updates `clusters.config`, sets `updated_by = current_user.user_id`, `updated_at = NOW()`
    * If enabling automation: Sets `automation_enabled_by = current_user.user_id`, `automation_enabled_at = NOW()`
    * Triggers: Webhook to Workflow Platform with config change
    * Audit: Logs to `audit_logs` table with action `enable_cluster_automation` or `update_cluster_config`

* **`POST /api/tickets/:id/validate`**
    * Payload: `{ "result": "APPROVED" | "REJECTED" }`
    * Authorization: Requires `member` role or higher
    * Action: Updates `tickets.validation_result`, `validated_by = current_user.user_id`, `validated_at = NOW()`
    * If APPROVED: Increments `clusters.validation_current`
    * If validation_current reaches validation_target: Potentially triggers automation enablement
    * Returns updated ticket and cluster validation progress

* **`POST /api/ingest/trigger`**
    * Payload: `{ "data_source_connection_id": "uuid" }` (optional, defaults to primary ITSM)
    * Authorization: Requires `admin` or `owner` role
    * Action: Creates `ingestion_runs` record with `started_by = current_user.user_id`, status = `pending`
    * Webhook Call: `WebhookService.sendGenericEvent()` or `DataSourceWebhookService.sendSyncTriggerEvent()`
        - source: `'rita-chat'` (same as data source sync)
        - action: `'sync_tickets'` (distinguishes autopilot from regular data source sync)
        - connection_type: Determined by data_source_connections.type (servicenow, jira, confluence)
        - Includes: tenant_id, user_id, user_email, connection_id, ingestion_run_id, settings
        - Credentials NOT sent (Workflow Platform looks them up using composite key)
        - Result arrives async via RabbitMQ `ingest.batch.processed` queue
        - Failures logged to `rag_webhook_failures` table
        - Retry: 3 attempts with exponential backoff
    * Updates: `data_source_connections.status = 'syncing'` if data_source_connection_id provided
    * Audit: Logs to `audit_logs` with action `trigger_ticket_sync`
    * Returns: `202 { ingestion_run_id, status: "SYNCING" }`

#### Credential Delegation Endpoints (ITSM Setup)

* **`POST /api/credential-delegations/create`**
    * Payload: `{ "admin_email": string, "itsm_system_type": "servicenow" | "jira" | "confluence" }`
    * Authorization: Requires `admin` or `owner` role
    * Action: Generate 64-char token, INSERT credential_delegation_tokens, send email via webhook
    * Webhook Call: `WebhookService.sendCredentialDelegationEmail()`
        - source: `'rita-credential-delegation'`, action: `'send_delegation_email'`
        - Includes: tenant_id, user_id, user_email, admin_email, delegation_url, organization_name, itsm_system_type
        - Failures logged to `rag_webhook_failures` table
        - Retry: 3 attempts with exponential backoff
    * Rate limit: 10 delegations per org per day
    * Audit: Logs to `audit_logs` with action `create_credential_delegation`
    * Returns: `{ delegation_id, delegation_url, expires_at, status: "pending" }`

* **`GET /api/credential-delegations/verify/:token`** (Public)
    * Authorization: None (public endpoint)
    * Action: Validate token exists, not expired, status='pending'
    * Returns: `{ valid: boolean, org_name, system_type, delegated_by, expires_at }` or `{ valid: false, reason }`

* **`GET /api/credential-delegations/status/:token`** (Public)
    * Authorization: None (token is auth)
    * Purpose: Poll verification status for IT Admin real-time feedback
    * Action: Check delegation token status
    * Returns based on status:
        - `status='used'`: `{ status: "verifying", message: "Checking credentials..." }`
        - `status='verified'`: `{ status: "success", message: "Credentials verified!", connection_id: "uuid" }`
        - `status='pending'` (after failure): `{ status: "failed", error: "Invalid credentials or insufficient permissions", allow_retry: true }`
        - Token not found / wrong status: `404 { error: "Invalid or expired token" }`
    * Rate limit: 20 requests per minute per token
    * Used by IT Admin page for polling after credential submission
    * Typical polling: Every 3 seconds for max 30 seconds (10 polls)

* **`POST /api/credential-delegations/submit`** (Public)
    * Payload: `{ "token": string, "credentials": { url, username, password, ... } }`
    * Authorization: None (public endpoint)
    * Action: Atomic update status='used', send webhook for verification, credentials NOT stored
    * Webhook Call: `DataSourceWebhookService.sendVerifyEvent()`
        - source: `'rita-chat'`, action: `'verify_credentials'`
        - connection_type: `'servicenow'|'jira'|'confluence'` (identifies system)
        - Includes: tenant_id, user_id, user_email, connection_id, credentials (password base64 encoded), settings
        - Same pattern as Confluence verification
        - Result arrives async via RabbitMQ `data_source_status` queue
    * Returns: `202 { status: "verifying", polling_url: "/api/credential-delegations/status/:token" }` (result via polling)
    * Frontend: Immediately starts polling status endpoint every 3s
    * Error: 409 if token already used (race condition prevention)

* **`GET /api/credential-delegations`**
    * Query: `?status=pending|used|verified&system_type=servicenow|jira`
    * Authorization: Requires `member` role or higher
    * Returns: List of delegations for organization `[{ id, admin_email, system_type, status, created_at, expires_at, verified_at }]`

-----

## 5\. Implementation Strategy

### 5.1 Backend Worker Logic (Node.js)

**Service:** `IngestTriggerService.ts` or within ingest routes

**Sync Trigger Logic:**
1. Validate user has admin/owner role
2. Get user's active_organization_id from JWT
3. Resolve data_source_connection_id:
   - If provided: Use specified connection
   - If not provided: Query primary ITSM connection for organization
4. Create ingestion_run record:
   ```sql
   INSERT INTO ingestion_runs (
     organization_id, started_by, status, data_source_connection_id
   ) VALUES ($1, $2, 'pending', $3)
   RETURNING id;
   ```
5. Update data_source_connections status:
   ```sql
   UPDATE data_source_connections
   SET status = 'syncing', last_sync_at = NOW()
   WHERE id = $1;
   ```
6. Send webhook to Workflow Platform:
   ```typescript
   await webhookService.sendGenericEvent({
     organizationId: user.active_organization_id,
     userId: user.user_id,
     userEmail: user.email,
     source: 'rita-chat',
     action: 'sync_tickets',
     additionalData: {
       ingestion_run_id: run.id,
       connection_id: connection.id,
       connection_type: connection.type, // servicenow, jira, confluence
       settings: connection.latest_options || {}
     }
   });
   ```
7. Return 202 Accepted response immediately

---

**Consumer:** `IngestBatchConsumer.ts` (packages/api-server/src/services/)

1.  **Organization Context Extraction:**
    * Extract `organization_id` from message payload
    * Validate organization exists and is active
    * Set PostgreSQL session variable: `SET LOCAL app.current_organization_id = 'org-uuid'`
    * This enables Row-Level Security (RLS) policies to enforce isolation

2.  **Transaction Scope:**
    * Process entire `ticket_batch_processed` payload in single Postgres transaction
    * BEGIN TRANSACTION at message receipt
    * COMMIT only after all clusters, tickets, and metrics updated
    * ROLLBACK on critical failures (invalid organization, database errors)

3.  **Idempotency Pattern:**
    * **Clusters:** `INSERT ... ON CONFLICT (organization_id, external_cluster_id) DO UPDATE SET name = EXCLUDED.name, kb_status = EXCLUDED.kb_status, updated_at = NOW()`
    * **Tickets:** `INSERT ... ON CONFLICT (organization_id, external_id) DO UPDATE SET cluster_id = EXCLUDED.cluster_id, external_status = EXCLUDED.external_status, updated_at = NOW()`
    * Conflict targets use unique constraints (org + external ID), not internal auto-generated IDs
    * Allows re-syncing/replaying messages without duplication
    * Updated records maintain audit trail via updated_at

4.  **Error Handling:**
    * **RabbitMQ Failures:** Rita Backend logs message processing errors to `message_processing_failures` table (internal error tracking)
      * `queue_name = 'ticket_batch_processed'`
      * `message_payload` = full JSON payload for replay
      * `tenant_id = organization_id`
      * Retry logic: max 3 attempts with exponential backoff (60s, 300s, 900s)
    * **Partial Failures:** If specific ticket validation fails (missing ID, invalid format):
      * Rita Backend logs to `message_processing_failures` with `error_type = 'validation_error'`
      * **Do NOT roll back** valid tickets in same batch
      * Continue processing remaining tickets
      * Update `ingestion_runs.records_failed` counter
    * **Critical Failures:** Invalid organization, DB connection loss → ROLLBACK, requeue message

5.  **Metric Updates:**
    * Update `analytics_cluster_daily` during transaction using UPSERT:
    ```sql
    INSERT INTO analytics_cluster_daily (organization_id, cluster_id, day, total_tickets, automated_count, kb_gap_count)
    VALUES ($1, $2, CURRENT_DATE, $3, $4, $5)
    ON CONFLICT (organization_id, cluster_id, day)
    DO UPDATE SET
      total_tickets = analytics_cluster_daily.total_tickets + EXCLUDED.total_tickets,
      automated_count = analytics_cluster_daily.automated_count + EXCLUDED.automated_count,
      kb_gap_count = analytics_cluster_daily.kb_gap_count + EXCLUDED.kb_gap_count,
      updated_at = NOW();
    ```
    * Incremental updates prevent full recalculation
    * Daily buckets enable fast dashboard queries regardless of date range

6.  **Ingestion Run Tracking:**
    * Update `ingestion_runs` table on completion:
      * `status = 'completed'` or `'failed'`
      * `records_processed` = successful ticket count
      * `records_failed` = validation failure count
      * `completed_at = NOW()`
    * If linked to data source: Update `data_source_connections.status = 'idle'`, `last_sync_status = 'completed'`, `last_sync_at = NOW()`

**Consumer:** `DataSourceStatusConsumer.ts` (packages/api-server/src/services/)
*Reuses existing consumer for both Confluence verification AND delegated ITSM setup*

7.  **Data Source Verification Processing:**
    * **Queue:** `data_source_status`
    * **Message Format:** `{ type: 'verification', connection_id, tenant_id, status: 'success'|'failed', options?, error? }`

    * **Organization Context:**
      * Extract `tenant_id` from message payload (maps to organization_id)
      * Set PostgreSQL session variable: `SET LOCAL app.current_organization_id = 'org-uuid'`

    * **Transaction Scope:**
      * BEGIN TRANSACTION on message receipt
      * COMMIT only after all updates complete
      * ROLLBACK on database errors

    * **Success Flow (status='success'):**
      ```sql
      -- Update data source connection
      UPDATE data_source_connections
      SET status = 'active',
          latest_options = $2,  -- JSONB: {tables: "..."} or {spaces: "..."} or {projects: "..."}
          last_verification_at = NOW(),
          enabled = true,
          updated_at = NOW()
      WHERE id = $1;

      -- If triggered by delegation: lookup token by connection_id
      -- credential_delegation_tokens table should reference connection_id
      UPDATE credential_delegation_tokens
      SET status = 'verified',
          credentials_verified_at = NOW(),
          completed_at = NOW()
      WHERE connection_id = $1 AND status = 'used';

      -- Audit log (if delegation triggered)
      INSERT INTO audit_logs (
        organization_id, user_id, action, resource_type, resource_id, metadata
      )
      SELECT organization_id, created_by_user_id, 'credential_verification_success',
             'credential_delegation', id, jsonb_build_object('connection_id', connection_id)
      FROM credential_delegation_tokens
      WHERE connection_id = $1;
      ```

    * **Failure Flow (status='failed'):**
      ```sql
      -- Update data source connection
      UPDATE data_source_connections
      SET status = 'failed',
          updated_at = NOW()
      WHERE id = $1;

      -- If triggered by delegation: revert to pending (allow retry)
      UPDATE credential_delegation_tokens
      SET status = 'pending',
          last_verification_error = $2
      WHERE connection_id = $1 AND status = 'used';
      ```

    * **SSE Event Emission:**
      * Success: `sendToOrganization(tenant_id, { type: 'credential_verified', connection_type, connection_id })`
      * Failure: `sendToOrganization(tenant_id, { type: 'credential_failed', error })`

    * **Email Notification (Delegation Flow Only):**
      ```typescript
      // After updating credential_delegation_tokens status
      const delegation = await db.query(
        'SELECT admin_email, organization_id FROM credential_delegation_tokens WHERE connection_id = $1',
        [connection_id]
      );

      if (delegation) {
        // Send email notification to IT Admin
        await webhookService.sendGenericEvent({
          organizationId: delegation.organization_id,
          source: 'rita-credential-delegation',
          action: 'send_verification_result_email',
          additionalData: {
            admin_email: delegation.admin_email,
            verification_status: status === 'success' ? 'verified' : 'failed',
            itsm_system_type: connectionType,
            error: status === 'failed' ? errorMessage : null
          }
        });
      }
      ```
      * Email sent on both success and failure
      * Optional: Can be skipped if polling completed successfully (IT Admin already saw result)
      * Always sent on timeout (IT Admin closed page before verification completed)

    * **Detecting Delegation vs Direct Verification:**
      * Query `credential_delegation_tokens` by `connection_id`
      * If found with status='used' → delegation flow (update delegation record)
      * If not found → direct verification (Confluence pattern, no delegation updates needed)

    * **Error Handling:**
      * Invalid organization → Log warning, NACK message (don't requeue)
      * Database errors → Log error, NACK message with requeue (max 3 retries)
      * Connection not found → Log warning, ACK message (idempotent)

### 5.2 Frontend State (React)

1.  **Optimistic UI:** When User clicks "Validate" on a ticket, update the UI immediately. Revert if the API call fails.
2.  **SSE Handling (RITA Owner - Authenticated):**

    **Event Naming Convention:** Follow existing pattern `{resource}_{action}` (e.g., `data_source_update`)

    | Event Type | Payload | Handler |
    |------------|---------|---------|
    | `ingestion_run_update` | `{ingestion_run_id, status, records_processed}` | Refetch dashboard on `status='completed'` |
    | `cluster_update` | `{cluster_id, kb_status, updated_fields[]}` | Update cluster in TanStack Query cache |
    | `ticket_update` | `{ticket_id, cluster_id, validation_result}` | Update validation progress |
    | `data_source_update` | `{connection_id, connection_type, status}` | Existing event - reused for credential verification |

    **Note:** Reuses existing `data_source_update` event type for credential verification (matches current Confluence pattern).
3.  **Status Polling (IT Admin - Public Page):**
    ```typescript
    // After credential submission (POST /credential-delegations/submit)
    const pollVerificationStatus = async (token: string) => {
      const MAX_POLLS = 10; // 30 seconds total (3s interval)
      const POLL_INTERVAL = 3000; // 3 seconds
      let attempts = 0;

      const interval = setInterval(async () => {
        attempts++;

        try {
          const response = await fetch(`/api/credential-delegations/status/${token}`);
          const data = await response.json();

          if (data.status === 'success') {
            clearInterval(interval);
            showSuccessMessage('Credentials verified! You can close this page.');
            // Optionally disable form
          } else if (data.status === 'failed') {
            clearInterval(interval);
            showErrorMessage(data.error);
            // Re-enable form for retry
          } else if (attempts >= MAX_POLLS) {
            // Timeout after 30 seconds
            clearInterval(interval);
            showTimeoutMessage(
              'Verification taking longer than expected. ' +
              'We\'ll email you at {admin_email} when complete.'
            );
          }
          // else status='verifying' → continue polling
        } catch (error) {
          console.error('Polling error:', error);
          // Continue polling on network errors
        }
      }, POLL_INTERVAL);

      // Cleanup on component unmount
      return () => clearInterval(interval);
    };
    ```
    * **Polling Strategy:**
      - Start immediately after submit (202 response)
      - Poll every 3 seconds
      - Max 10 attempts (30 seconds total)
      - Clear interval on success/failure/timeout
    * **UX States:**
      - Verifying: Show spinner + "Checking credentials..."
      - Success: Green checkmark + "Credentials verified!"
      - Failed: Error message + retry button
      - Timeout: Info message + "Check your email"

### 5.3 Audit Integration

**Audit Logging Pattern:** All sensitive operations logged to `audit_logs` table for SOC2 Type II compliance

**Logged Actions:**

1. **`trigger_ticket_sync`** (POST /api/ingest/trigger)
   ```typescript
   await auditLog({
     organization_id: user.active_organization_id,
     user_id: user.user_id,
     action: 'trigger_ticket_sync',
     resource_type: 'ingestion_run',
     resource_id: ingestionRun.id,
     metadata: { data_source_connection_id, batch_id }
   });
   ```

2. **`enable_cluster_automation`** (PATCH /api/clusters/:id/config - when auto_respond enabled)
   ```typescript
   await auditLog({
     organization_id: cluster.organization_id,
     user_id: user.user_id,
     action: 'enable_cluster_automation',
     resource_type: 'cluster',
     resource_id: cluster.id,
     metadata: {
       config_before: cluster.config,
       config_after: newConfig,
       automation_enabled_fields: ['auto_respond', 'auto_populate']
     }
   });
   ```

3. **`update_cluster_config`** (PATCH /api/clusters/:id/config - other config changes)
   ```typescript
   await auditLog({
     organization_id: cluster.organization_id,
     user_id: user.user_id,
     action: 'update_cluster_config',
     resource_type: 'cluster',
     resource_id: cluster.id,
     metadata: { config_changes: diff(oldConfig, newConfig) }
   });
   ```

**Audit Query Endpoints:**
* `GET /api/audit/logs?resource_type=cluster&resource_id=:id` - View cluster change history
* `GET /api/audit/logs?action=enable_cluster_automation` - Track automation enablement across organization

### 5.4 Sync Two-Way Logic

* **Incoming (Read-Only):** ITSM → Workflow Platform → RabbitMQ → Rita Backend → PostgreSQL
  * Workflow Platform is source of truth for cluster definitions and ticket assignments
  * Rita Backend passively receives and stores data
  * No mutations sent back to Workflow Platform during ingestion

* **Outgoing (Commands):** Rita Backend → Webhook → Workflow Platform
  * User actions trigger configuration commands
  * Examples: Enable auto-respond, update validation target, link knowledge article
  * Workflow Platform executes commands and may send updated data back via RabbitMQ

## 6\. Security & Performance

### 6.1 Multi-Tenancy & Data Isolation

**Architecture Pattern:** All tables follow Rita's established multi-tenancy model documented in `docs/database-tables.md`

#### Row-Level Security (RLS) Policies

All autopilot tables enforce organization isolation via PostgreSQL Row-Level Security:

```sql
-- Enable RLS on all autopilot tables
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cluster_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_runs ENABLE ROW LEVEL SECURITY;

-- Policy pattern for all tables
CREATE POLICY "users_access_own_organization_clusters" ON clusters
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY "users_access_own_organization_tickets" ON tickets
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY "users_access_own_organization_analytics" ON analytics_cluster_daily
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY "users_access_own_organization_knowledge" ON knowledge_articles
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY "users_access_own_organization_runs" ON ingestion_runs
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
```

**RLS Activation:** Backend sets session variable on each request:
```typescript
// middleware/auth.ts
await db.query(
  'SET LOCAL app.current_organization_id = $1',
  [user.active_organization_id]
);
```

#### User Tracking Pattern

All mutable tables track user actions following Rita's audit pattern:

* **Creation:** `created_by` UUID → `user_profiles.user_id` (Keycloak user ID)
* **Modification:** `updated_by` UUID → `user_profiles.user_id` (updates on every change)
* **Timestamps:** `created_at`, `updated_at` (auto-updated via trigger `set_timestamp`)
* **Specific Actions:** `validated_by`, `automation_enabled_by`, `started_by` (domain-specific tracking)

**Auto-Update Trigger Pattern:**
```sql
-- Trigger function (shared across tables)
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to each mutable table
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON clusters
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
```

#### Keycloak Integration

* **User Identification:** All `user_id` fields reference Keycloak's auth.users(id) UUID
* **JWT Validation:** API endpoints verify Keycloak JWT token in Authorization header
* **Organization Context:** User's `active_organization_id` from `user_profiles` table determines context
* **Role-Based Access:** Mutation endpoints check `organization_members.role` (owner/admin/member)

### 6.2 SOC2 Type II Compliance

#### Audit Trail Requirements

**Logged Actions (via `audit_logs` table):**
* `trigger_ticket_sync` - User initiates ITSM sync
* `enable_cluster_automation` - User enables auto-respond/auto-populate
* `update_cluster_config` - User modifies cluster settings
* `validate_ticket` - User approves/rejects validation sample (optional, high volume)

**Audit Log Retention:** Minimum 1 year for compliance

**Audit Log Fields:**
```typescript
interface AuditLog {
  id: uuid;
  organization_id: uuid;  // Multi-tenant isolation
  user_id: uuid;          // Who performed action
  action: string;         // Standardized action name
  resource_type: string;  // 'cluster', 'ticket', 'ingestion_run'
  resource_id: uuid;      // Which resource was affected
  metadata: jsonb;        // Context (config changes, validation results, etc.)
  created_at: timestamp;  // When action occurred
}
```

#### Security Controls

* **Authentication:** All endpoints require valid Keycloak JWT
* **Authorization:** Role-based checks for sensitive operations (admin/owner for automation, member for validation)
* **Data Isolation:** RLS enforces database-level tenant separation
* **Audit Logging:** Immutable audit trail for all configuration changes
* **Webhook Signing:** HMAC signatures validate Workflow Platform webhooks
* **Credential Security:** Data source credentials never stored in Rita database (sent to Workflow Platform per-request)

### 6.3 Performance Optimization

#### Database Indexing

**clusters table:**
```sql
CREATE INDEX idx_clusters_organization_id ON clusters(organization_id);
CREATE INDEX idx_clusters_kb_status ON clusters(kb_status);
CREATE INDEX idx_clusters_created_at ON clusters(created_at DESC);
CREATE INDEX idx_clusters_config ON clusters USING GIN (config);
```

**tickets table:**
```sql
CREATE INDEX idx_tickets_organization_id ON tickets(organization_id);
CREATE INDEX idx_tickets_cluster_id ON tickets(cluster_id);
CREATE INDEX idx_tickets_rita_status ON tickets(rita_status);
CREATE INDEX idx_tickets_validation_result ON tickets(validation_result);
CREATE INDEX idx_tickets_data_source ON tickets(data_source_connection_id);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_tickets_validated_by ON tickets(validated_by);
CREATE INDEX idx_tickets_source_metadata ON tickets USING GIN (source_metadata);
```

**analytics_cluster_daily table:**
```sql
CREATE INDEX idx_analytics_cluster_daily_org ON analytics_cluster_daily(organization_id);
CREATE INDEX idx_analytics_cluster_daily_day ON analytics_cluster_daily(day DESC);
-- Compound index for dashboard queries
CREATE INDEX idx_analytics_org_cluster_day ON analytics_cluster_daily(organization_id, cluster_id, day DESC);
```

**knowledge_articles table:**
```sql
CREATE INDEX idx_knowledge_articles_organization_id ON knowledge_articles(organization_id);
CREATE INDEX idx_knowledge_articles_cluster_id ON knowledge_articles(cluster_id);
CREATE INDEX idx_knowledge_articles_status ON knowledge_articles(status);
CREATE INDEX idx_knowledge_articles_relevance ON knowledge_articles(relevance_score DESC);
```

**ingestion_runs table:**
```sql
CREATE INDEX idx_ingestion_runs_organization ON ingestion_runs(organization_id);
CREATE INDEX idx_ingestion_runs_data_source ON ingestion_runs(data_source_connection_id);
CREATE INDEX idx_ingestion_runs_status ON ingestion_runs(status);
CREATE INDEX idx_ingestion_runs_started_at ON ingestion_runs(started_at DESC);
```

#### Query Optimization Patterns

* **Pre-Aggregated Metrics:** Daily bucket pattern in `analytics_cluster_daily` enables O(days) dashboard queries instead of O(tickets)
* **Cursor-Based Pagination:** Ticket lists use `created_at` cursor to avoid OFFSET performance penalties
* **Partial Indexes:** Consider `WHERE status = 'active'` on frequently filtered columns
* **JSONB GIN Indexes:** Enable fast queries on `config`, `source_metadata` JSONB fields

#### Real-Time Updates (SSE)

* **Debouncing:** SSE emitter debounces events (max 1 per second) during bulk imports
* **Event Types:**
  * `sync_completed` - Triggers grid refetch
  * `cluster_updated` - Updates single cluster in cache (TanStack Query)
* **Connection Management:** EventSource auto-reconnects on disconnect
* **Ephemeral Delivery:** Events fire-and-forget (future: persist critical events for replay)

#### Webhook Security

* **HMAC Signing:** All Rita Backend ↔ Workflow Platform webhooks signed with shared secret
* **Signature Verification:** Reject unsigned or invalid signatures
* **Replay Protection:** Include timestamp in signature, reject old requests (>5 min)
* **Rate Limiting:** Enforce webhook rate limits to prevent abuse

-----

## 7\. Database Migration Reference

### 7.1 Migration File

**Location:** `packages/api-server/src/database/migrations/XXX_add_autopilot_tables.sql`

### 7.2 Table Creation Scripts

#### clusters Table

```sql
-- Main autopilot clusters table (system-generated by Workflow Platform)
CREATE TABLE clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- Internal auto-generated ID
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    external_cluster_id TEXT NOT NULL,  -- Stable ID from Workflow Platform
    name TEXT NOT NULL,
    config JSONB DEFAULT '{}'::jsonb,
    validation_target INTEGER,  -- TBD: product spec pending, nullable for now
    validation_current INTEGER NOT NULL DEFAULT 0,
    kb_status TEXT DEFAULT 'PENDING' CHECK (kb_status IN ('PENDING', 'FOUND', 'GAP')),

    -- User tracking (only for user actions, not system creation)
    automation_enabled_by UUID REFERENCES user_profiles(user_id),

    -- Timestamps
    automation_enabled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint: one external_cluster_id per organization
    CONSTRAINT uq_clusters_external_id_org UNIQUE (organization_id, external_cluster_id)
);

-- Indexes
CREATE INDEX idx_clusters_organization_id ON clusters(organization_id);
CREATE INDEX idx_clusters_external_id ON clusters(external_cluster_id);
CREATE INDEX idx_clusters_kb_status ON clusters(kb_status);
CREATE INDEX idx_clusters_created_at ON clusters(created_at DESC);
CREATE INDEX idx_clusters_config ON clusters USING GIN (config);

-- Row-Level Security
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_access_own_organization_clusters" ON clusters
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- Auto-update trigger
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON clusters
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Comments
COMMENT ON TABLE clusters IS 'AI-generated ticket clusters from Workflow Platform (system-generated)';
COMMENT ON COLUMN clusters.id IS 'Internal auto-generated UUID for internal references';
COMMENT ON COLUMN clusters.external_cluster_id IS 'Stable cluster ID provided by Workflow Platform (used for upsert matching)';
COMMENT ON COLUMN clusters.config IS 'JSONB config: {auto_respond: boolean, auto_populate: boolean}';
COMMENT ON COLUMN clusters.validation_current IS 'Current count of approved validation samples (progress toward target)';
COMMENT ON COLUMN clusters.automation_enabled_at IS 'Timestamp when automation was first enabled (audit trail)';
COMMENT ON COLUMN clusters.validation_target IS 'Validation sample target count (TBD - product spec pending)';
```

#### tickets Table

```sql
-- Tickets assigned to clusters
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    data_source_connection_id UUID REFERENCES data_source_connections(id) ON DELETE SET NULL,

    -- Ticket details
    external_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    external_status TEXT NOT NULL,
    rita_status TEXT DEFAULT 'NEEDS_RESPONSE' CHECK (rita_status IN ('NEEDS_RESPONSE', 'COMPLETED')),

    -- Validation tracking
    is_validation_sample BOOLEAN DEFAULT false,
    validation_result TEXT DEFAULT 'PENDING' CHECK (validation_result IN ('PENDING', 'APPROVED', 'REJECTED')),
    validated_by UUID REFERENCES user_profiles(user_id),
    validated_at TIMESTAMP WITH TIME ZONE,

    -- Source metadata
    source_metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT uq_tickets_external_id_org UNIQUE (organization_id, external_id)
);

-- Indexes
CREATE INDEX idx_tickets_organization_id ON tickets(organization_id);
CREATE INDEX idx_tickets_cluster_id ON tickets(cluster_id);
CREATE INDEX idx_tickets_rita_status ON tickets(rita_status);
CREATE INDEX idx_tickets_validation_result ON tickets(validation_result);
CREATE INDEX idx_tickets_data_source ON tickets(data_source_connection_id);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_tickets_validated_by ON tickets(validated_by);
CREATE INDEX idx_tickets_source_metadata ON tickets USING GIN (source_metadata);
CREATE INDEX idx_tickets_validation_samples ON tickets(cluster_id, is_validation_sample) WHERE is_validation_sample = true;

-- Row-Level Security
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_access_own_organization_tickets" ON tickets
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- Auto-update trigger
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Comments
COMMENT ON TABLE tickets IS 'ITSM tickets assigned to autopilot clusters';
COMMENT ON COLUMN tickets.external_id IS 'ITSM ticket ID (e.g., INC-123 from ServiceNow)';
COMMENT ON COLUMN tickets.rita_status IS 'Rita-specific status for workflow tracking';
COMMENT ON COLUMN tickets.is_validation_sample IS 'Flag indicating ticket selected for 0/16 validation UI';
COMMENT ON COLUMN tickets.data_source_connection_id IS 'Optional FK for filtering tickets by connection (NULL if from WP independent connections)';
COMMENT ON COLUMN tickets.source_metadata IS 'Raw ITSM properties from source system for debugging/display';
```

#### analytics_cluster_daily Table

```sql
-- Pre-aggregated daily metrics per cluster
CREATE TABLE analytics_cluster_daily (
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    day DATE NOT NULL,

    -- Metrics
    total_tickets INTEGER DEFAULT 0,
    automated_count INTEGER DEFAULT 0,
    kb_gap_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Composite primary key
    PRIMARY KEY (organization_id, cluster_id, day)
);

-- Indexes
CREATE INDEX idx_analytics_cluster_daily_org ON analytics_cluster_daily(organization_id);
CREATE INDEX idx_analytics_cluster_daily_day ON analytics_cluster_daily(day DESC);
CREATE INDEX idx_analytics_org_cluster_day ON analytics_cluster_daily(organization_id, cluster_id, day DESC);

-- Row-Level Security
ALTER TABLE analytics_cluster_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_access_own_organization_analytics" ON analytics_cluster_daily
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- Comments
COMMENT ON TABLE analytics_cluster_daily IS 'Pre-aggregated daily metrics for fast dashboard queries (retention period TBD)';
COMMENT ON COLUMN analytics_cluster_daily.day IS 'Date bucket for metrics aggregation';
COMMENT ON COLUMN analytics_cluster_daily.automated_count IS 'Count of tickets handled by automation';
COMMENT ON COLUMN analytics_cluster_daily.kb_gap_count IS 'Count of tickets with KB gaps (TBD - computation logic pending)';
```

#### knowledge_articles Table

```sql
-- Knowledge base articles linked to clusters (system-generated from Workflow Platform)
CREATE TABLE knowledge_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,  -- Stable identifier from Workflow Platform for upsert

    -- Article details
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    relevance_score FLOAT NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 1),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'broken', 'archived')),  -- defer until needed

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint for upsert operations
    UNIQUE (organization_id, external_id)
);

-- Indexes
CREATE INDEX idx_knowledge_articles_organization_id ON knowledge_articles(organization_id);
CREATE INDEX idx_knowledge_articles_cluster_id ON knowledge_articles(cluster_id);
CREATE INDEX idx_knowledge_articles_status ON knowledge_articles(status);
CREATE INDEX idx_knowledge_articles_relevance ON knowledge_articles(relevance_score DESC);

-- Row-Level Security
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_access_own_organization_knowledge" ON knowledge_articles
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- Auto-update trigger
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON knowledge_articles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Comments
COMMENT ON TABLE knowledge_articles IS 'KB articles linked to clusters (system-generated from Workflow Platform)';
COMMENT ON COLUMN knowledge_articles.external_id IS 'Stable identifier from Workflow Platform for idempotent upsert operations';
COMMENT ON COLUMN knowledge_articles.relevance_score IS 'AI relevance score (0.0 to 1.0) from Workflow Platform';
COMMENT ON COLUMN knowledge_articles.status IS 'Track article availability - defer until auto-refresh feature needed';
```

#### ingestion_runs Table

**Why This Table Exists (vs `data_source_connections.status`)**

| Aspect | `data_source_connections` | `ingestion_runs` |
|--------|---------------------------|------------------|
| **Purpose** | Connection config state | Individual sync operation |
| **Cardinality** | 1 per org+type | Many per connection |
| **Status values** | `idle`, `syncing` | `pending`, `running`, `completed`, `failed`, `cancelled` |
| **Tracks** | "Is something syncing now?" | "What happened in this specific sync?" |
| **History** | Only `last_sync_status` | Full record per sync |
| **Counters** | None | `records_processed`, `records_failed` |
| **Error detail** | None | `error_message` TEXT |

**Relationship:**
```
data_source_connections (1) ←──── (N) ingestion_runs
         ↓                              ↓
   "Jira is syncing"            "Sync #5: 150 tickets, completed"
                                "Sync #6: failed - timeout"
```

**Usage:**
- `data_source_connections.status` = UI spinner on connection card (denormalized for fast reads)
- `ingestion_runs` = audit trail + detailed metrics per sync attempt

**Lifecycle:**
```
User clicks "Sync" → INSERT (pending) → webhook sent → UPDATE (running) →
RabbitMQ consumed → UPDATE (completed/failed) → SSE event → UI unlocks
```

```sql
-- Track ticket ingestion/sync operations
CREATE TABLE ingestion_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    data_source_connection_id UUID REFERENCES data_source_connections(id) ON DELETE SET NULL,
    started_by UUID NOT NULL REFERENCES user_profiles(user_id),

    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,

    -- Additional context
    metadata JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,

    -- Timestamps (created_at doubles as started_at)
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ingestion_runs_organization ON ingestion_runs(organization_id);
CREATE INDEX idx_ingestion_runs_data_source ON ingestion_runs(data_source_connection_id);
CREATE INDEX idx_ingestion_runs_status ON ingestion_runs(status);
CREATE INDEX idx_ingestion_runs_created_at ON ingestion_runs(created_at DESC);
CREATE INDEX idx_ingestion_runs_started_by ON ingestion_runs(started_by);

-- Row-Level Security
ALTER TABLE ingestion_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_access_own_organization_runs" ON ingestion_runs
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- Comments
COMMENT ON TABLE ingestion_runs IS 'Track ITSM ticket sync operations from Workflow Platform';
COMMENT ON COLUMN ingestion_runs.metadata IS 'JSONB: {batch_id, sync_params, workflow_run_id}';
COMMENT ON COLUMN ingestion_runs.records_processed IS 'Count of successfully processed tickets';
COMMENT ON COLUMN ingestion_runs.records_failed IS 'Count of failed ticket validations';
COMMENT ON COLUMN ingestion_runs.created_at IS 'Doubles as started_at timestamp';
```

#### credential_delegation_tokens Table

```sql
-- Delegated ITSM credential setup tokens
CREATE TABLE credential_delegation_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,

    -- Delegated admin info (not yet authenticated)
    admin_email TEXT NOT NULL,
    itsm_system_type TEXT NOT NULL CHECK (itsm_system_type IN ('servicenow', 'jira', 'confluence')),

    -- Token management
    delegation_token TEXT NOT NULL UNIQUE,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'verified', 'expired', 'cancelled')),

    -- Credential submission tracking
    credentials_received_at TIMESTAMP WITH TIME ZONE,  -- when IT admin submitted
    credentials_verified_at TIMESTAMP WITH TIME ZONE,  -- when external service verified
    last_verification_error TEXT,

    -- Link to data source connection (set after verification webhook sent)
    connection_id UUID REFERENCES data_source_connections(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cred_delegation_email ON credential_delegation_tokens(admin_email);
CREATE INDEX idx_cred_delegation_token ON credential_delegation_tokens(delegation_token);
CREATE INDEX idx_cred_delegation_org_id ON credential_delegation_tokens(organization_id);
CREATE INDEX idx_cred_delegation_status ON credential_delegation_tokens(status);
CREATE INDEX idx_cred_delegation_expires_at ON credential_delegation_tokens(token_expires_at);
CREATE INDEX idx_cred_delegation_created_by ON credential_delegation_tokens(created_by_user_id);
CREATE INDEX idx_cred_delegation_connection_id ON credential_delegation_tokens(connection_id);

-- Unique constraint: prevent duplicate pending tokens
CREATE UNIQUE INDEX idx_cred_delegation_unique
    ON credential_delegation_tokens(admin_email, organization_id, itsm_system_type)
    WHERE status = 'pending';

-- Row-Level Security
ALTER TABLE credential_delegation_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_access_own_organization_delegations" ON credential_delegation_tokens
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- Comments
COMMENT ON TABLE credential_delegation_tokens IS 'Delegated credential setup links for external ITSM admins';
COMMENT ON COLUMN credential_delegation_tokens.delegation_token IS '64-char hex token (32 random bytes) sent via email';
COMMENT ON COLUMN credential_delegation_tokens.admin_email IS 'Email of IT admin (not yet a Rita user)';
COMMENT ON COLUMN credential_delegation_tokens.itsm_system_type IS 'ServiceNow, Jira, or Confluence';
COMMENT ON COLUMN credential_delegation_tokens.status IS 'pending → used → verified (or back to pending on failure)';
COMMENT ON COLUMN credential_delegation_tokens.credentials_received_at IS 'When IT admin submitted credentials (replaces accepted_at)';
COMMENT ON COLUMN credential_delegation_tokens.credentials_verified_at IS 'When external service verified (replaces completed_at)';
```

### 7.3 Migration Checklist

**Pre-Migration:**
- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Verify trigger_set_timestamp() function exists
- [ ] Verify organizations and user_profiles tables exist
- [ ] Verify data_source_connections table exists (for optional FK)

**Post-Migration:**
- [ ] Verify all tables created: `\dt clusters tickets analytics_cluster_daily knowledge_articles ingestion_runs credential_delegation_tokens`
- [ ] Verify all indexes created: `\di idx_clusters_*` `\di idx_cred_delegation_*`
- [ ] Verify RLS policies enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`
- [ ] Verify foreign key constraints: `\d+ clusters` `\d+ credential_delegation_tokens`
- [ ] Verify CHECK constraints: `\d+ credential_delegation_tokens` (status, itsm_system_type)
- [ ] Verify UNIQUE constraint: `\d+ credential_delegation_tokens` (admin_email + org + system_type WHERE status='pending')
- [ ] Test RLS isolation: Set `app.current_organization_id` and query tables
- [ ] Grant appropriate permissions to application database user

### 7.4 Rollback Plan

```sql
-- Rollback script (if needed - DESTRUCTIVE!)
DROP TABLE IF EXISTS credential_delegation_tokens CASCADE;
DROP TABLE IF EXISTS ingestion_runs CASCADE;
DROP TABLE IF EXISTS knowledge_articles CASCADE;
DROP TABLE IF EXISTS analytics_cluster_daily CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS clusters CASCADE;
```

**⚠️ Warning:** Rollback will permanently delete all autopilot data. Only use in emergency situations.

### 7.5 Data Source Integration Notes

**Optional FK to data_source_connections:**
- `tickets.data_source_connection_id` is NULLABLE
- Set when ticket originates from Rita-managed ITSM connection
- NULL when ticket comes from Workflow Platform's independent ITSM connections
- Fallback: `tickets.source_metadata` JSONB always captures source details

**Future Enhancement:**
- Add `clusters.data_source_connection_id` FK if clusters should be scoped to specific ITSM instances
- Add `sync_schedule` JSONB to `data_source_connections` for automated periodic syncs

### 7.6 Not In Scope / To Be Defined

**Features not included in initial implementation:**
- **Cluster Archival:** Soft delete/archival mechanism for inactive clusters (future improvement)
- **Article Auto-Refresh:** Automatic broken link detection and article re-verification (future improvement)

**Values to be defined in product specification:**
- **Validation Target:** Default validation sample count per cluster (currently nullable field)
- **Analytics Retention:** How long to retain daily metric buckets (30d, 90d, 1yr?)
- **Knowledge Article Limits:** Max articles per cluster before truncation/ranking
- **Sync Frequency:** Default/max polling intervals for ITSM connections

**Recommended Next Steps:**
1. Define validation target based on user research/piloting
2. Establish data retention policies (analytics, audit logs)
3. Design cluster lifecycle management (active → archived states)
4. Plan knowledge article verification cron job strategy