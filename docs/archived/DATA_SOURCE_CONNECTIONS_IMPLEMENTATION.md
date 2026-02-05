# Data Source Connections - Implementation Plan

**Status**: In Progress
**Started**: 2025-10-03
**Architecture Doc**: [DATA_SOURCE_CONNECTIONS.md](./DATA_SOURCE_CONNECTIONS.md)

---

## Overview

Implementing data source connections feature that allows organizations to configure external data sources (Confluence, ServiceNow, SharePoint, Web Search) without storing credentials in Rita.

---

## Backend Implementation (api-server)

### 1. Database Migration
**Status**: ✅ Complete
**File**: `packages/api-server/src/database/migrations/117_add_data_source_connections.sql`

- [x] Create `data_source_connections` table
  - Columns: `id`, `organization_id`, `type`, `name`, `description`, `settings`, `status`, `last_sync_status`, `last_sync_at`, `enabled`, `created_by`, `updated_by`, `created_at`, `updated_at`
  - UNIQUE constraint: `(organization_id, type)`
  - Indexes: `organization_id`, `type`, `enabled`, `status`
- [x] ~~Create `data_source_sync_history` table (audit log)~~ (Not needed per user feedback)
- [x] Migration ready for deployment

**Dependencies**: None

---

### 2. TypeScript Types & Constants
**Status**: ✅ Complete
**Files**:
- `packages/api-server/src/constants/dataSources.ts`
- `packages/api-server/src/types/dataSource.ts`

- [x] Create `ALLOWED_DATA_SOURCE_TYPES` constant
- [x] Create `DataSourceType` type
- [x] Create `isValidDataSourceType()` function
- [x] Create `DEFAULT_DATA_SOURCES` constant for seeding
- [x] Create interfaces:
  - `DataSourceConnection`
  - `CreateDataSourceRequest`
  - `UpdateDataSourceRequest`
  - `VerifyWebhookPayload`
  - `SyncTriggerWebhookPayload`
  - `SyncStatusMessage` (RabbitMQ)

**Dependencies**: None

---

### 3. Data Sources Service
**Status**: ✅ Complete
**File**: `packages/api-server/src/services/DataSourceService.ts`

- [x] `getDataSources(organization_id)` - List all connections
- [x] `getDataSource(id, organization_id)` - Get single connection
- [x] `createDataSource(params)` - Create new connection
- [x] `updateDataSource(id, organization_id, params)` - Update connection
- [x] `deleteDataSource(id, organization_id)` - Delete connection
- [x] `seedDefaultDataSources(organization_id, userId)` - Idempotent seeding
- [x] `updateDataSourceStatus()` - Update status (used by RabbitMQ consumer)

**Dependencies**: Step 2 (types)

---

### 4. Data Sources API Routes
**Status**: ✅ Complete
**File**: `packages/api-server/src/routes/dataSources.ts`

- [x] `GET /api/data-sources` - List connections
- [x] `GET /api/data-sources/:id` - Get single connection
- [x] `POST /api/data-sources` - Create connection
- [x] `PUT /api/data-sources/:id` - Update connection
- [x] `DELETE /api/data-sources/:id` - Delete connection
- [x] `POST /api/data-sources/seed` - Seed default sources
- [x] Add authentication middleware
- [x] Add input validation (Zod schemas)
- [x] Register routes in `index.ts`

**Dependencies**: Step 3 (service)

---

### 5. Webhook Handlers
**Status**: 🔄 Needs Update (Verification flow changed)
**Files**:
- `packages/api-server/src/services/DataSourceWebhookService.ts`
- `packages/api-server/src/routes/dataSourceWebhooks.ts`

- [x] Create `DataSourceWebhookService` class
  - `sendVerifyEvent()` - Send credentials to external service for verification
  - `sendSyncTriggerEvent()` - Trigger sync job
- [x] Create webhook routes:
  - `POST /api/data-sources/:id/verify` - ⚠️ **NEEDS UPDATE**: Now returns immediately with `status='verifying'` instead of waiting for response
  - `POST /api/data-sources/:id/sync` - Trigger sync
- [x] Add retry logic (3 attempts with exponential backoff)
- [x] Add status validation (prevent sync when already syncing)
- [x] Mount webhook routes in main data sources router

**Required Changes**:
- Update `/verify` endpoint to set `status='verifying'` and return immediately
- Frontend receives verification result via SSE (not HTTP response)

**Dependencies**: Step 3 (service), existing `WebhookService.ts`

---

### 6. Unified RabbitMQ Consumer for Data Source Status
**Status**: ✅ Complete
**File**: `packages/api-server/src/consumers/DataSourceStatusConsumer.ts`

- [x] Create unified consumer for `data_source_status` queue (single queue for all events)
- [x] Handle sync messages (`type: 'sync'`):
  - `sync_started` → Update `status='syncing'`
  - `sync_completed` → Update `status='idle'`, `last_sync_status='completed'`, `last_sync_at=NOW()`, clear `last_sync_error`
  - `sync_failed` → Update `status='idle'`, `last_sync_status='failed'`, `last_sync_error=message`
- [x] Handle verification messages (`type: 'verification'`):
  - `status='success'` → Update `status='idle'`, `latest_options={...}`, clear `last_verification_error`
  - `status='failed'` → Update `status='idle'`, `last_verification_error=error`
- [x] Discriminate message types via `type` field
- [x] Send unified SSE events (`data_source_update`) to organization
- [x] Add error handling and structured logging
- [x] Register consumer in `RabbitMQService.startConsumer()`

**Dependencies**: Step 3 (service)

---

## Frontend Implementation (client)

### 7. Data Sources Types & API Client
**Status**: ⏳ Pending
**Files**:
- `packages/client/src/types/dataSource.ts`
- `packages/client/src/api/dataSources.ts`

- [ ] Create frontend types matching backend
- [ ] Create API client functions:
  - `fetchDataSources()`
  - `fetchDataSource(id)`
  - `createDataSource(params)`
  - `updateDataSource(id, params)`
  - `deleteDataSource(id)`
  - `seedDataSources()`
  - `verifyDataSource(id, credentials)`
  - `triggerSync(id)`

**Dependencies**: Backend Step 4 (API routes)

---

### 8. Data Sources Hooks
**Status**: ⏳ Pending
**File**: `packages/client/src/hooks/useDataSourcesSeed.ts`

- [ ] Create `useDataSourcesSeed()` hook
  - Session-based seeding (only once per session)
  - Uses `sessionStorage` for tracking
  - Returns mutation status
- [ ] Create TanStack Query hooks:
  - `useDataSources()` - Query all connections
  - `useDataSource(id)` - Query single connection
  - `useCreateDataSource()` - Mutation
  - `useUpdateDataSource()` - Mutation
  - `useDeleteDataSource()` - Mutation
  - `useVerifyDataSource()` - Mutation
  - `useTriggerSync()` - Mutation

**Dependencies**: Step 7 (API client)

---

### 9. Data Sources Page Component
**Status**: ⏳ Pending
**Files**:
- `packages/client/src/pages/DataSourcesPage.tsx`
- `packages/client/src/components/DataSourceCard.tsx`
- `packages/client/src/components/DataSourceConfigModal.tsx`

- [ ] Create `DataSourcesPage` component
  - Call `useDataSourcesSeed()` on mount
  - Display grid of data source cards
  - Show status indicators (idle, syncing, last_sync_status)
- [ ] Create `DataSourceCard` component
  - Show connection details
  - "Configure" button for `enabled=false`
  - "Edit" / "Sync" buttons for `enabled=true`
- [ ] Create `DataSourceConfigModal` component
  - Form with React Hook Form + Zod validation
  - Credential input fields (not saved in Rita)
  - Settings configuration
  - Call verify webhook on save
- [ ] Add to routing in `router.tsx`

**Dependencies**: Step 8 (hooks)

---

### 10. Server-Sent Events (SSE) Integration
**Status**: ⏳ Pending
**File**: `packages/client/src/hooks/useDataSourceSSE.ts`

- [ ] Create SSE hook for real-time sync status updates
- [ ] Subscribe to `data_source_sync_status` events
- [ ] Invalidate TanStack Query cache on status change
- [ ] Update UI in real-time (syncing → completed/failed)

**Dependencies**: Step 9 (page component), existing SSE infrastructure

---

## Testing & Validation

### 11. API Tests
**Status**: ⏳ Pending

- [ ] Unit tests for `DataSourceService`
- [ ] Integration tests for API endpoints
- [ ] Webhook handler tests
- [ ] RabbitMQ consumer tests

**Dependencies**: Backend steps 3-6

---

### 12. Frontend Tests
**Status**: ⏳ Pending

- [ ] Component tests (DataSourcesPage, DataSourceCard, Modal)
- [ ] Hook tests (useDataSourcesSeed, TanStack Query hooks)
- [ ] Accessibility tests (WCAG 2.1 AA compliance)

**Dependencies**: Frontend steps 7-10

---

### 13. E2E Testing
**Status**: ⏳ Pending

- [ ] Test full flow:
  1. Navigate to data sources page → seed endpoint called
  2. Click "Configure" → modal opens
  3. Enter credentials → verify webhook called
  4. Save settings → connection enabled
  5. Click "Sync" → sync trigger webhook called
  6. RabbitMQ message received → status updated in UI
- [ ] Test error scenarios (verify failed, sync failed)

**Dependencies**: All previous steps

---

### 14. Docker Validation
**Status**: ⏳ Pending

- [ ] `docker compose build --pull`
- [ ] `docker compose up -d`
- [ ] Verify all services healthy
- [ ] Run full test suite
- [ ] Manual smoke testing

**Dependencies**: All previous steps

---

## Deployment Checklist

- [ ] Database migration tested on staging
- [ ] Environment variables documented
- [ ] RabbitMQ queue configuration verified
- [ ] Webhook endpoints secured (auth headers)
- [ ] SOC2 audit logging confirmed
- [ ] Accessibility compliance verified
- [ ] Performance testing completed
- [ ] Documentation updated

---

## Summary of Required Code Changes

### Database Changes
1. **Migration Update** (if not already deployed):
   - Add `latest_options JSONB DEFAULT NULL` column to `data_source_connections`
   - Add `last_verification_at TIMESTAMP WITH TIME ZONE` column
   - Add `last_verification_error TEXT` column
   - Update `status` column to support `'verifying'` state: `'idle' | 'verifying' | 'syncing'`
   - Update `last_sync_error` comment to note it's shared between verification and sync failures

**Field Cleanup Rules:**
- `last_verification_error` - Cleared when verification succeeds
- `last_sync_error` - Cleared when sync succeeds
- `latest_options` - Updated on successful verification, never cleared
- `last_verification_at` - Updated on every verification attempt, never cleared
- All other timestamp fields - Never cleared, only updated

### TypeScript Type Updates
2. **`packages/api-server/src/types/dataSource.ts`**:
   - Update `DataSourceConnection` interface:
     - Change `status: 'idle' | 'syncing'` → `status: 'idle' | 'verifying' | 'syncing'`
     - Add `latest_options: Record<string, string> | null` field
   - Add new interface `VerificationStatusMessage`:
     ```typescript
     interface VerificationStatusMessage {
       connection_id: string;
       tenant_id: string;
       status: 'success' | 'failed';
       options: Record<string, string> | null;
       error: string | null;
     }
     ```

### Service Updates
3. **`packages/api-server/src/services/DataSourceService.ts`**:
   - Add method to handle verification status updates:
     ```typescript
     async updateVerificationStatus(
       connectionId: string,
       organization_id: string,
       status: 'success' | 'failed',
       options?: Record<string, string>,
       error?: string
     ): Promise<DataSourceConnection>
     ```

### Webhook Handler Updates
4. **`packages/api-server/src/routes/dataSourceWebhooks.ts`**:
   - Update `POST /api/data-sources/:id/verify` endpoint:
     - Set connection `status='verifying'` before sending webhook
     - Return immediately with `{ status: 'verifying', message: 'Verification in progress' }`
     - Frontend will receive result via SSE

### Unified Consumer Implementation (Refactored)
5. **Rename and merge consumers** → `packages/api-server/src/consumers/DataSourceStatusConsumer.ts`:
   - Unified consumer for single queue: `data_source_status`
   - Handles both sync and verification messages via `type` discriminator
   - `processSyncStatus()` method for `type: 'sync'` messages
   - `processVerificationStatus()` method for `type: 'verification'` messages
   - Single SSE event type: `data_source_update` for consistency

6. **Update `packages/api-server/src/services/rabbitmq.ts`**:
   - Replace separate consumers with single `DataSourceStatusConsumer`:
     ```typescript
     import { DataSourceStatusConsumer } from '../consumers/DataSourceStatusConsumer.js';

     constructor() {
       this.dataSourceStatusConsumer = new DataSourceStatusConsumer();
     }

     async startConsumer() {
       await this.dataSourceStatusConsumer.startConsumer(this.channel);
     }
     ```

7. **Update TypeScript types** → `packages/api-server/src/types/dataSource.ts`:
   - Add `type` discriminator to `SyncStatusMessage`: `type: 'sync'`
   - Add `type` discriminator to `VerificationStatusMessage`: `type: 'verification'`
   - Create union type: `DataSourceStatusMessage = SyncStatusMessage | VerificationStatusMessage`

### Frontend Updates (Future)
8. **SSE Event Handling**:
   - Subscribe to unified `data_source_update` SSE events
   - Handle both sync and verification updates in single listener
   - Show loading state while `status='verifying'` or `status='syncing'`
   - Display available options from `latest_options` when verification succeeds
   - Show sync progress when `documentsProcessed` is present
   - Show error messages from either `last_sync_error` or `last_verification_error`

## Notes & Decisions

### Key Architectural Decisions
1. **No credential storage** - Rita only stores settings, external service handles credentials
2. **Application-level validation** - Data source types validated in code, not DB constraints
3. **Lazy seeding** - Default data sources created on-demand via idempotent endpoint
4. **Status architecture** - Split into `status` (current), `last_sync_status` (historical), `enabled` (control)
5. **Webhook-based flow** - All external interactions via webhooks + RabbitMQ
6. **Async verification** - Verification now follows same RabbitMQ pattern as sync operations
7. **Unified queue architecture** - Single `data_source_status` queue with type discriminator for both sync and verification events

### Open Questions
- None currently

### Blockers
- None currently

---

## Timeline

- **Phase 1** (Backend): Steps 1-6
- **Phase 2** (Frontend): Steps 7-10
- **Phase 3** (Testing): Steps 11-14

**Target Completion**: TBD

---

## Post-Implementation Fixes & Updates

### API Route Corrections (Completed 2025-10-07)

#### Issue 1: Route Order Bug
**Problem**: The `/seed` endpoint was returning 404 errors because it was defined AFTER the `/:id` parameterized route in `packages/api-server/src/routes/dataSources.ts`.

**Root Cause**: Express.js matches routes in order of definition. When `/seed` came after `/:id`, Express treated "seed" as an ID parameter.

**Fix Applied**:
```typescript
// BEFORE (broken):
router.get('/:id', ...);        // Line 76
router.post('/seed', ...);      // Line 168 - TOO LATE!

// AFTER (fixed):
router.post('/seed', ...);      // Line 51 - BEFORE /:id
router.get('/:id', ...);        // Line 76 - AFTER /seed
```

**Files Changed**: `packages/api-server/src/routes/dataSources.ts`

---

#### Issue 2: API Path Mismatch
**Problem**: Frontend was calling `/api/v1/data-sources/*` but backend routes were mounted at `/api/data-sources/*` (no v1 prefix).

**Root Cause**: Initial design included v1 versioning but it was not implemented consistently. No other API routes in Rita use the v1 prefix.

**Fix Applied**: Removed `/v1/` prefix from all frontend API calls:
```typescript
// BEFORE:
list: () => apiRequest('/api/v1/data-sources'),
seed: () => apiRequest('/api/v1/data-sources/seed', { method: 'POST' }),

// AFTER:
list: () => apiRequest('/api/data-sources'),
seed: () => apiRequest('/api/data-sources/seed', { method: 'POST' }),
```

**Files Changed**:
- `packages/client/src/services/api.ts` (lines 186-220)
- All documentation files (removed v1 references)

---

### Field Name Standardization (Completed 2025-10-07)

#### Issue 1: config vs settings
**Problem**: Frontend code used `config` field name but backend database and validation schemas use `settings`.

**Fix Applied**: Global rename from `config` to `settings` throughout frontend:
- Updated `packages/client/src/types/dataSource.ts` interfaces
- Updated all connection form components
- Updated `packages/client/src/constants/connectionSources.ts`
- Updated component prop names and default values

**Files Changed**:
- `packages/client/src/types/dataSource.ts`
- `packages/client/src/constants/connectionSources.ts`
- `packages/client/src/components/connection-sources/connection-forms/*.tsx` (all forms)

#### Issue 2: camelCase vs snake_case
**Problem**: Frontend TypeScript interfaces used camelCase field names (e.g., `lastVerificationAt`, `organizationId`) but backend API returns snake_case (e.g., `last_verification_at`, `organization_id`) matching the PostgreSQL database schema.

**Root Cause**: Backend routes directly return database rows without field name transformation. This is consistent with other API routes in the codebase (e.g., conversations API also returns snake_case `created_at`).

**Fix Applied**: Updated all frontend TypeScript interfaces and code to use snake_case matching backend:

| Old (camelCase) | New (snake_case) |
|----------------|------------------|
| `organizationId` | `organization_id` |
| `lastSyncStatus` | `last_sync_status` |
| `latestOptions` | `latest_options` |
| `lastVerificationAt` | `last_verification_at` |
| `lastVerificationError` | `last_verification_error` |
| `lastSyncAt` | `last_sync_at` |
| `lastSyncError` | `last_sync_error` |
| `createdBy` | `created_by` |
| `updatedBy` | `updated_by` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |

**Files Changed**:
- `packages/client/src/types/dataSource.ts` - Interface definitions
- `packages/client/src/constants/connectionSources.ts` - Mapping functions
- `packages/client/src/contexts/SSEContext.tsx` - SSE event handling
- `packages/client/src/components/connection-sources/connection-forms/ConfluenceForm.tsx` - Form logic
- `packages/client/src/pages/ConnectionSourceDetailPage.tsx` - View logic
- All documentation files (using sed bulk replacement)

**Why Not Transform in Frontend?**
- Maintains consistency with existing codebase patterns
- Reduces complexity (no transformation layer needed)
- TypeScript provides type safety regardless of naming convention
- Backend directly returns Postgres schema (no ORM mapping)

---

### UI Enhancements (Completed 2025-10-07)

#### ConnectionStatusCard Integration
**Enhancement**: Added `ConnectionStatusCard` component to detail page view mode with Edit dropdown menu.

**Implementation**:
- View mode now shows `ConnectionStatusCard` with connection details (URL, email, API key masked)
- Added `DropdownMenu` with `MoreVertical` icon for actions
- Edit menu item triggers edit mode to show configuration form
- Cancel button returns to view mode

**Files Changed**: `packages/client/src/pages/ConnectionSourceDetailPage.tsx`

---

### Current Implementation Status

#### Completed (Phase 1 - Backend):
- ✅ Database migration (`data_source_connections` table)
- ✅ TypeScript types and constants
- ✅ DataSourceService (all CRUD operations)
- ✅ API routes with authentication and validation
- ✅ Webhook handlers for verify and sync operations
- ✅ Unified RabbitMQ consumer for sync and verification status
- ✅ Route order fix (seed before :id)
- ✅ API path correction (removed v1 prefix)

#### Completed (Phase 2 - Frontend):
- ✅ Frontend types matching backend
- ✅ API client functions in `services/api.ts`
- ✅ TanStack Query hooks (`useDataSources`, `useDataSource`, `useVerifyDataSource`, `useUpdateDataSource`)
- ✅ SSE context integration for real-time updates
- ✅ Constants and UI mapping functions
- ✅ Connection forms with verify & save flow (Confluence, ServiceNow, SharePoint, WebSearch)
- ✅ ConnectionStatusCard component
- ✅ ConnectionSourceDetailPage with view/edit modes
- ✅ Field name standardization (config → settings)
- ✅ ConnectionStatusCard integration with Edit dropdown

#### In Progress:
- 🔄 Testing and validation

#### Pending (Phase 3 - Testing):
- ⏳ Unit tests for backend services
- ⏳ Integration tests for API endpoints
- ⏳ Frontend component tests
- ⏳ E2E testing
- ⏳ Docker validation

---