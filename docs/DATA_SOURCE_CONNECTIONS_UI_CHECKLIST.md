# Data Source Connections - Frontend UI Implementation Checklist

**Status**: Ready for Implementation
**Related Docs**:
- [Architecture](./DATA_SOURCE_CONNECTIONS.md)
- [Backend Implementation](./DATA_SOURCE_CONNECTIONS_IMPLEMENTATION.md)

---

## Overview

This document outlines the complete frontend implementation checklist for integrating the Data Source Connections UI with the backend API. The implementation follows the **Rita Go → Actions → Rabbit → Rita Go** pattern with SSE for real-time updates.

### What's Already Implemented ✅

**SSE Infrastructure** (`packages/client/src/contexts/SSEContext.tsx`):
- ✅ SSE connection handling with auto-reconnect
- ✅ `data_source_update` event handler (lines 82-129)
- ✅ Toast notifications for sync completion/failure
- ✅ Navigation actions to connections page
- ⚠️ **Needs**: TanStack Query invalidation (1 line change)

**UI Components** (static/mock data):
- ✅ `ConnectionSources.tsx` - List view with cards
- ✅ `ConnectionSourceDetailPage.tsx` - Detail page with routing
- ✅ Connection forms (Confluence, ServiceNow, SharePoint, WebSearch)
- ✅ `connectionSources.ts` constants with static metadata
- ⚠️ **Needs**: API integration, dynamic data fetching

**What Needs to Be Built**:
- TypeScript types matching backend schema
- API client functions
- TanStack Query hooks
- Status mapping logic
- View/Edit mode switching
- Real-time updates integration

---

## Current UI Components Analysis

### Existing Components
- ✅ `ConnectionSources.tsx` - List view of all connection sources
- ✅ `ConnectionSourceDetailPage.tsx` - Detail page with forms for each source type
- ✅ Constants in `connectionSources.ts` - Static mock data structure

### Issues to Resolve
1. **Static Data**: Currently using hardcoded `CONNECTION_SOURCES` array - needs to fetch from API
2. **No API Integration**: Components don't call backend endpoints
3. **No SSE Integration**: Real-time updates not implemented
4. **Status Mapping**: Current `Status` type doesn't match backend schema
5. **No Seeding Flow**: Seed endpoint not called on page load
6. **URL Routing**: Detail routes don't use backend `id` (UUID) - currently using source type string

---

## Phase 1: API Layer & Types

### 1.1 TypeScript Types
**File**: `packages/client/src/types/dataSource.ts`

**Tasks**:
- [ ] Create `DataSourceConnection` interface matching backend schema:
  ```typescript
  interface DataSourceConnection {
    id: string; // UUID from backend
    organization_id: string;
    type: 'confluence' | 'servicenow' | 'sharepoint' | 'websearch';
    name: string;
    description: string | null;
    config: Record<string, any>; // JSON config (spaces, tables, etc.)
    status: 'idle' | 'verifying' | 'syncing';
    last_sync_status: 'completed' | 'failed' | null;

    // IMPORTANT: latest_options contains available options from verification
    // Format: { [key: string]: string } where value is comma-separated string
    // Examples:
    //   Confluence: { "spaces": "ENG,PROD,DOCS" }
    //   ServiceNow: { "tables": "incident,kb_knowledge,sc_cat_item" }
    //   SharePoint: { "sites": "site1,site2,site3" }
    latest_options: Record<string, string> | null;

    enabled: boolean;
    last_verification_at: string | null; // ISO timestamp (null = never configured)
    last_verification_error: string | null;
    last_sync_at: string | null; // ISO timestamp
    last_sync_error: string | null;
    created_by: string;
    updated_by: string;
    created_at: string; // ISO timestamp
    updated_at: string; // ISO timestamp
  }
  ```

- [ ] Create request/response types:
  ```typescript
  interface ListDataSourcesResponse {
    data: DataSourceConnection[];
  }

  interface GetDataSourceResponse {
    data: DataSourceConnection;
  }

  interface SeedDataSourcesResponse {
    success: boolean;
    created: number;
    existing: number;
    message: string;
  }

  interface VerifyDataSourceRequest {
    config: Record<string, any>; // e.g., { url: "https://..." }
    credentials: Record<string, any>; // e.g., { api_token: "...", email: "..." }
  }

  interface VerifyDataSourceResponse {
    status: 'verifying';
    message: string;
  }

  interface TriggerSyncResponse {
    data: {
      id: string;
      status: 'syncing';
      triggeredAt: string;
    };
  }

  interface UpdateDataSourceRequest {
    name?: string;
    description?: string;
    config?: Record<string, any>;
    enabled?: boolean;
  }
  ```

- [ ] ~~Create SSE event types~~ **ALREADY EXISTS** - SSE infrastructure is already implemented in `SSEContext.tsx` with `data_source_update` handler (lines 82-129)

**Dependencies**: Architecture doc (completed)

---

### 1.2 API Client Functions
**File**: `packages/client/src/services/api.ts` (add to existing file)

**Tasks**:
- [ ] Add Data Sources API to existing `api.ts` using the established pattern:
  ```typescript
  // Data Sources API (add after fileApi)
  export const dataSourcesApi = {
    // List all data sources
    list: () =>
      apiRequest<{ data: DataSourceConnection[] }>('/api/data-sources'),

    // Get single data source by ID
    get: (id: string) =>
      apiRequest<{ data: DataSourceConnection }>(`/api/data-sources/${id}`),

    // Seed default data sources (idempotent)
    seed: () =>
      apiRequest<SeedDataSourcesResponse>('/api/data-sources/seed', {
        method: 'POST',
      }),

    // Update data source
    update: (id: string, data: UpdateDataSourceRequest) =>
      apiRequest<{ data: DataSourceConnection }>(`/api/data-sources/${id}`, {
        method: 'PUT',
        body: data,
      }),

    // Verify credentials (async - result via SSE)
    verify: (id: string, payload: VerifyDataSourceRequest) =>
      apiRequest<VerifyDataSourceResponse>(`/api/data-sources/${id}/verify`, {
        method: 'POST',
        body: payload,
      }),

    // Trigger sync
    sync: (id: string) =>
      apiRequest<TriggerSyncResponse>(`/api/data-sources/${id}/sync`, {
        method: 'POST',
      }),
  };
  ```

**Why This Pattern?**
- ✅ Uses existing `apiRequest()` helper (handles auth, errors, token refresh)
- ✅ Cookie-based authentication with `credentials: 'include'`
- ✅ Automatic Keycloak token refresh if needed
- ✅ Consistent error handling with `ApiError`
- ✅ Follows same pattern as `conversationApi`, `organizationApi`, `fileApi`

**Dependencies**: Types (1.1)

---

## Phase 2: State Management & Hooks

### 2.1 TanStack Query Hooks
**File**: `packages/client/src/hooks/useDataSources.ts`

**Tasks**:
- [ ] Create query hooks:
  ```typescript
  import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
  import { dataSourcesApi } from '@/services/api';
  import type { DataSourceConnection, UpdateDataSourceRequest, VerifyDataSourceRequest } from '@/types/dataSource';

  // Query Keys
  export const dataSourceKeys = {
    all: ['dataSources'] as const,
    lists: () => [...dataSourceKeys.all, 'list'] as const,
    list: () => [...dataSourceKeys.lists()] as const,
    details: () => [...dataSourceKeys.all, 'detail'] as const,
    detail: (id: string) => [...dataSourceKeys.details(), id] as const,
  };

  // List all data sources
  export function useDataSources() {
    return useQuery({
      queryKey: dataSourceKeys.list(),
      queryFn: async () => {
        const response = await dataSourcesApi.list();
        return response.data; // Unwrap { data: DataSourceConnection[] }
      },
      staleTime: 30000, // 30 seconds
    });
  }

  // Get single data source
  export function useDataSource(id: string | undefined) {
    return useQuery({
      queryKey: dataSourceKeys.detail(id!),
      queryFn: async () => {
        const response = await dataSourcesApi.get(id!);
        return response.data; // Unwrap { data: DataSourceConnection }
      },
      enabled: !!id,
      staleTime: 30000,
    });
  }

  // Seed data sources (called once on page load)
  export function useSeedDataSources() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: dataSourcesApi.seed,
      onSuccess: () => {
        // Invalidate list query to refetch with seeded data
        queryClient.invalidateQueries({ queryKey: dataSourceKeys.list() });
      },
    });
  }

  // Update data source
  export function useUpdateDataSource() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: ({ id, data }: { id: string; data: UpdateDataSourceRequest }) =>
        dataSourcesApi.update(id, data),
      onSuccess: (response) => {
        // Update both list and detail queries
        queryClient.invalidateQueries({ queryKey: dataSourceKeys.list() });
        queryClient.invalidateQueries({ queryKey: dataSourceKeys.detail(response.data.id) });
      },
    });
  }

  // Verify credentials (async - result via SSE)
  export function useVerifyDataSource() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: VerifyDataSourceRequest }) =>
        dataSourcesApi.verify(id, payload),
      onMutate: async ({ id }) => {
        // Optimistic update: set status to 'verifying'
        await queryClient.cancelQueries({ queryKey: dataSourceKeys.detail(id) });
        const previousData = queryClient.getQueryData<DataSourceConnection>(dataSourceKeys.detail(id));

        queryClient.setQueryData<DataSourceConnection>(dataSourceKeys.detail(id), (old) => {
          if (!old) return old;
          return { ...old, status: 'verifying' as const };
        });

        return { previousData };
      },
      onError: (err, { id }, context) => {
        // Rollback optimistic update on error
        if (context?.previousData) {
          queryClient.setQueryData(dataSourceKeys.detail(id), context.previousData);
        }
      },
      // Note: Success status update will come via SSE event
    });
  }

  // Trigger sync
  export function useTriggerSync() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (id: string) => dataSourcesApi.sync(id),
      onSuccess: (response) => {
        // Invalidate queries to show 'syncing' status
        queryClient.invalidateQueries({ queryKey: dataSourceKeys.detail(response.data.id) });
        queryClient.invalidateQueries({ queryKey: dataSourceKeys.list() });
      },
    });
  }
  ```

**Dependencies**: API client (1.2)

---

### 2.2 SSE Integration
**File**: `packages/client/src/contexts/SSEContext.tsx` ✅ **ALREADY IMPLEMENTED**

**Current Status**:
- ✅ `data_source_update` event handler already exists (lines 82-129)
- ✅ Toast notifications implemented for sync events
- ✅ Navigation to connections page on toast action click

**Required Changes**:
- [ ] Add TanStack Query invalidation to trigger automatic refetch:
  ```typescript
  // In SSEContext.tsx, line ~106 (replace TODO comment)
  import { useQueryClient } from '@tanstack/react-query';

  export const SSEProvider: React.FC<SSEProviderProps> = ({ ... }) => {
    const queryClient = useQueryClient(); // Add this

    const handleMessage = useCallback((event: SSEEvent) => {
      // ... existing code ...

      } else if (event.type === 'data_source_update') {
        // ... existing logging ...

        // NEW: Invalidate TanStack Query cache
        queryClient.invalidateQueries({ queryKey: ['dataSources'] });
        queryClient.invalidateQueries({
          queryKey: ['dataSource', event.data.connectionId]
        });

        // ... existing toast notifications ...
      }
    }, [navigate, queryClient]); // Add queryClient to dependencies
  ```

**Dependencies**: Query hooks (2.1)

---

## Phase 3: UI Component Updates

### 3.1 Update Constants for Backend Mapping
**File**: `packages/client/src/constants/connectionSources.ts`

**Tasks**:
- [ ] Update `Status` type to match backend schema:
  ```typescript
  // OLD
  export type Status = 'Not connected' | 'Connected' | 'Syncing' | 'Error';

  // NEW (map backend status to UI-friendly labels)
  export type BackendStatus = 'idle' | 'verifying' | 'syncing';
  export type BackendLastSyncStatus = 'completed' | 'failed' | null;

  export function getDisplayStatus(
    status: BackendStatus,
    last_sync_status: BackendLastSyncStatus,
    enabled: boolean,
    last_verification_at: string | null
  ): Status {
    // Not configured yet
    if (!last_verification_at) {
      return STATUS.NOT_CONNECTED;
    }

    // Currently verifying
    if (status === 'verifying') {
      return STATUS.SYNCING; // Or add new 'Verifying' status
    }

    // Currently syncing
    if (status === 'syncing') {
      return STATUS.SYNCING;
    }

    // Idle - check last sync result
    if (status === 'idle') {
      if (!enabled) {
        return STATUS.NOT_CONNECTED;
      }

      if (last_sync_status === 'failed') {
        return STATUS.ERROR;
      }

      if (last_sync_status === 'completed') {
        return STATUS.CONNECTED;
      }

      // Never synced but verified
      return STATUS.CONNECTED;
    }

    return STATUS.NOT_CONNECTED;
  }
  ```

- [ ] Create static UI metadata mapping (icons and titles only):
  ```typescript
  // Static metadata for each source type (icons, titles, descriptions)
  export const SOURCE_METADATA: Record<string, {
    title: string;
    description?: string;
  }> = {
    confluence: {
      title: 'Confluence',
    },
    servicenow: {
      title: 'ServiceNow',
    },
    sharepoint: {
      title: 'SharePoint',
    },
    websearch: {
      title: 'Web Search (LGA)',
      description: 'Use web results to supplement answers when knowledge isn\'t found.',
    },
  };

  // Helper to extract dynamic badges from config
  function getConfigBadges(source: DataSourceConnection): string[] {
    const badges: string[] = [];

    switch (source.type) {
      case 'confluence':
        // Confluence: Show comma-separated spaces from config
        if (source.config?.spaces) {
          const spaces = typeof source.config.spaces === 'string'
            ? source.config.spaces.split(',').map(s => s.trim())
            : source.config.spaces;
          badges.push(...spaces);
        }
        break;

      case 'servicenow':
        // ServiceNow: TODO - define when backend config structure is known
        // Possible: tables, categories, etc.
        break;

      case 'sharepoint':
        // SharePoint: TODO - define when backend config structure is known
        // Possible: sites, document libraries, etc.
        break;

      case 'websearch':
        // WebSearch: No dynamic badges needed
        break;
    }

    return badges;
  }

  // Helper to merge backend data with UI metadata
  export function mapDataSourceToUI(
    source: DataSourceConnection
  ): ConnectionSource {
    const metadata = SOURCE_METADATA[source.type] || { title: source.type };

    return {
      id: source.id, // Use backend UUID
      type: source.type,
      title: metadata.title,
      status: getDisplayStatus(
        source.status,
        source.last_sync_status,
        source.enabled,
        source.last_verification_at
      ),
      lastSync: source.last_sync_at
        ? formatRelativeTime(source.last_sync_at)
        : '—',
      description: metadata.description,
      badges: getConfigBadges(source), // Dynamic badges from config
      config: source.config,
      backendData: source, // Keep full backend data for detail view
    };
  }
  ```

**Dependencies**: Types (1.1)

---

### 3.2 Update ConnectionSources List Component
**File**: `packages/client/src/components/settings/ConnectionSources.tsx`

**Tasks**:
- [ ] Replace static data with API query:
  ```typescript
  import { useDataSources, useSeedDataSources } from '@/hooks/useDataSources';
  import { mapDataSourceToUI } from '@/constants/connectionSources';

  export default function ConnectionSources() {
    const { mutate: seedSources, isPending: isSeeding } = useSeedDataSources();
    const { data: dataSources, isLoading, error } = useDataSources();

    // Seed on mount (idempotent - safe to call multiple times)
    useEffect(() => {
      seedSources();
    }, [seedSources]);

    // Map backend data to UI format
    const uiSources = useMemo(() => {
      if (!dataSources) return [];
      return dataSources.map(mapDataSourceToUI);
    }, [dataSources]);

    if (isLoading || isSeeding) {
      return <LoadingSpinner />;
    }

    if (error) {
      return <ErrorMessage message="Failed to load data sources" />;
    }

    return (
      <div className="w-full">
        {/* ... existing JSX, but use uiSources instead of CONNECTION_SOURCES */}
        {uiSources.map((source) => (
          <Link
            key={source.id} // Now uses backend UUID
            to={`/settings/connections/${source.id}`} // Route with UUID
            className="block"
          >
            {/* ... rest of card JSX */}
          </Link>
        ))}
      </div>
    );
  }
  ```

- [ ] Add loading states (skeleton cards)
- [ ] Add error handling UI
- [ ] Add empty state UI (if no sources exist)

**Dependencies**: Query hooks (2.1), Constants update (3.1)

---

### 3.3 Update ConnectionSourceDetailPage
**File**: `packages/client/src/pages/ConnectionSourceDetailPage.tsx`

**Tasks**:
- [ ] Update route parameter to use UUID and implement view/edit mode logic:
  ```typescript
  export default function ConnectionSourceDetailPage() {
    const { id } = useParams<{ id: string }>(); // UUID from backend
    const { data: source, isLoading, error } = useDataSource(id);
    const [isEditMode, setIsEditMode] = useState(false);

    if (isLoading) {
      return <LoadingSpinner />;
    }

    if (error || !source) {
      return <Navigate to="/404" replace />;
    }

    // Determine if source has been configured before
    // If last_verification_at is null, it has NEVER been configured
    const isConfigured = source.last_verification_at !== null;

    // Render logic:
    // - NOT configured (last_verification_at === null) → Always show form (edit mode)
    // - IS configured (last_verification_at !== null) → Show view mode by default
    //   - User can click "Edit Configuration" button to enter edit mode
    const renderContent = () => {
      if (!isConfigured) {
        // Never configured before → Show configuration form
        return renderForm(source);
      }

      // Already configured → Show view mode or edit mode
      if (isEditMode) {
        return (
          <>
            {renderForm(source)}
            <Button
              variant="outline"
              onClick={() => setIsEditMode(false)}
            >
              Cancel
            </Button>
          </>
        );
      }

      // Default: Show view mode with "Edit Configuration" button
      return (
        <DataSourceViewMode
          source={source}
          onEdit={() => setIsEditMode(true)}
        />
      );
    };

    return (
      <ConnectionSourceProvider source={source}>
        <RitaSettingsLayout>
          <div className="flex-1 inline-flex flex-col items-center gap-8 w-full">
            <Header
              breadcrumbs={[
                { label: "Connections", href: "/settings/connections" },
                { label: SOURCE_METADATA[source.type]?.title || source.name },
              ]}
              title={SOURCE_METADATA[source.type]?.title || source.name}
              icon={renderIcon(source.type)}
              description={`Connect your ${source.name} instance to build context for Rita.`}
            />

            <div className="w-full max-w-2xl mx-auto flex flex-col gap-8">
              {renderContent()}
            </div>
          </div>
        </RitaSettingsLayout>
      </ConnectionSourceProvider>
    );
  }

  // Helper to render form based on source type
  function renderForm(source: DataSourceConnection) {
    switch (source.type) {
      case 'confluence':
        return <ConfluenceForm source={source} />;
      case 'sharepoint':
        return <SharePointForm source={source} />;
      case 'servicenow':
        return <ServiceNowForm source={source} />;
      case 'websearch':
        return <WebSearchForm source={source} />;
      default:
        return <div>Unknown source type</div>;
    }
  }
  ```

- [ ] Update router to use UUID parameter:
  ```typescript
  // In router.tsx
  {
    path: '/settings/connections/:id', // Changed from :sourceId to :id (UUID)
    element: <ConnectionSourceDetailPage />,
  }
  ```

**View Mode Logic Summary**:

| Condition | Display Mode | Reason |
|-----------|-------------|---------|
| `last_verification_at === null` | **Form (Edit Mode)** | Never configured - needs initial setup |
| `last_verification_at !== null` && `!isEditMode` | **View Mode** | Already configured - show read-only details |
| `last_verification_at !== null` && `isEditMode` | **Form (Edit Mode)** | User clicked "Edit Configuration" button |

**Dependencies**: Query hooks (2.1), Constants update (3.1)

---

### 3.4 Update Connection Forms
**Files**:
- `packages/client/src/components/connection-sources/connection-forms/ConfluenceForm.tsx`
- `packages/client/src/components/connection-sources/connection-forms/ServiceNowForm.tsx`
- `packages/client/src/components/connection-sources/connection-forms/SharePointForm.tsx`
- `packages/client/src/components/connection-sources/connection-forms/WebSearchForm.tsx`

**Tasks** (Example for Confluence):
- [ ] Integrate verify and save flow:
  ```typescript
  import { useVerifyDataSource, useUpdateDataSource } from '@/hooks/useDataSources';
  import { useForm } from 'react-hook-form';
  import { zodResolver } from '@hookform/resolvers/zod';
  import { z } from 'zod';

  const confluenceSchema = z.object({
    url: z.string().url('Must be a valid URL'),
    email: z.string().email('Must be a valid email'),
    apiToken: z.string().min(1, 'API token is required'),
    spaces: z.array(z.string()).optional(),
  });

  type ConfluenceFormData = z.infer<typeof confluenceSchema>;

  export function ConfluenceForm({ source }: { source: DataSourceConnection }) {
    const { mutate: verify, isPending: isVerifying } = useVerifyDataSource();
    const { mutate: update, isPending: isUpdating } = useUpdateDataSource();

    const form = useForm<ConfluenceFormData>({
      resolver: zodResolver(confluenceSchema),
      defaultValues: {
        url: source.config?.url || '',
        email: source.config?.email || '',
        apiToken: '',
        spaces: source.config?.spaces || [],
      },
    });

    // Show available spaces ONLY if latest_options.spaces exists (comes from SSE after verification)
    // latest_options.spaces is a comma-separated string: "ENG,PROD,DOCS"
    const availableSpaces = source.latest_options?.spaces
      ? source.latest_options.spaces.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    // Determine if spaces section should be shown
    const showSpacesSection = availableSpaces.length > 0;

    // Step 1: Verify credentials (sends credentials to external service)
    const onVerify = (data: ConfluenceFormData) => {
      verify({
        id: source.id,
        payload: {
          config: { url: data.url },
          credentials: {
            email: data.email,
            api_token: data.apiToken,
          },
        },
      });
      // Result will come via SSE → latest_options.spaces updated → spaces multiselect appears
    };

    // Step 2: Save configuration (after verification, with selected spaces)
    const onSave = (data: ConfluenceFormData) => {
      // Validation: Don't allow save if no spaces selected
      if (!data.spaces || data.spaces.length === 0) {
        toast.error('Please select at least one space to sync');
        return;
      }

      // IMPORTANT: Also call verify endpoint again to update credentials
      // Because user might have changed URL, email, or token in edit mode
      verify({
        id: source.id,
        payload: {
          config: { url: data.url },
          credentials: {
            email: data.email,
            api_token: data.apiToken,
          },
        },
      });

      // Then save the configuration with selected spaces
      update({
        id: source.id,
        data: {
          config: {
            url: data.url,
            spaces: data.spaces.join(','), // Save as comma-separated string: "ENG,PROD"
          },
          enabled: true,
        },
      });
    };

    // Render spaces multiselect ONLY if latest_options.spaces exists and is not empty
    const renderSpacesSection = () => {
      if (!showSpacesSection) {
        return null; // Don't show until verification succeeds
      }

      return (
        <div className="space-y-2">
          <Label htmlFor="spaces">Select Spaces to Sync *</Label>
          <p className="text-sm text-muted-foreground">
            Choose which Confluence spaces Rita should sync
          </p>
          {/* Use multiselect component (checkboxes or dropdown) */}
          <div className="space-y-2">
            {availableSpaces.map((space) => (
              <div key={space} className="flex items-center space-x-2">
                <Checkbox
                  id={`space-${space}`}
                  value={space}
                  {...form.register('spaces')}
                />
                <Label htmlFor={`space-${space}`} className="font-normal">
                  {space}
                </Label>
              </div>
            ))}
          </div>
        </div>
      );
    };

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onVerify)}>
          <Input
            label="Confluence URL"
            {...form.register('url')}
            error={form.formState.errors.url?.message}
          />

          <Input
            label="Email"
            type="email"
            {...form.register('email')}
            error={form.formState.errors.email?.message}
          />

          <Input
            label="API Token"
            type="password"
            {...form.register('apiToken')}
            error={form.formState.errors.apiToken?.message}
            placeholder={source.last_verification_at ? '••••••••' : 'Enter API token'}
          />

          {/* Step 1: Verify credentials button */}
          <Button
            type="submit"
            disabled={isVerifying || isUpdating}
            loading={isVerifying}
          >
            {isVerifying ? 'Verifying...' : 'Verify Credentials'}
          </Button>

          {/* Step 2: Show spaces multiselect ONLY after successful verification */}
          {/* Spaces section appears when latest_options.spaces is populated via SSE */}
          {renderSpacesSection()}

          {/* Step 3: Save button (appears ONLY after spaces are available) */}
          {showSpacesSection && (
            <Button
              type="button"
              onClick={form.handleSubmit(onSave)}
              disabled={isUpdating || isVerifying}
              loading={isUpdating}
            >
              {isUpdating ? 'Saving...' : 'Save Configuration'}
            </Button>
          )}
        </form>
      </Form>
    );
  }
  ```

- [ ] Add real-time status updates (SSE):
  ```typescript
  // Show loading state while status === 'verifying'
  useEffect(() => {
    if (source.status === 'verifying') {
      // Show loading spinner or skeleton on spaces section
    }
  }, [source.status]);

  // Show success message when latest_options updates
  useEffect(() => {
    if (source.latest_options?.spaces) {
      toast.success('Credentials verified! Select spaces to sync.');
    }
  }, [source.latest_options]);
  ```

- [ ] Repeat for other forms (ServiceNow, SharePoint, WebSearch)

**Save Flow Summary**:
1. **User clicks "Verify Credentials"** → POST `/verify` with credentials
2. **SSE updates `latest_options`** → Spaces section appears
3. **User selects spaces** → Checks boxes
4. **User clicks "Save Configuration"**:
   - Calls POST `/verify` again (updates credentials in external service)
   - Calls PUT `/data-sources/:id` (saves config with selected spaces)
5. **Returns to view mode** (if editing existing connection)

**Visual Save Flow**:
```
[User fills form: URL, Email, API Token]
              |
              v
    Click "Verify Credentials"
              |
              v
    POST /api/data-sources/:id/verify
    { config: { url }, credentials: { email, api_token } }
              |
              v
    Backend → External Service → RabbitMQ → SSE
              |
              v
    SSE Event: data_source_update
    { latest_options: { spaces: "ENG,PROD,DOCS" } }
              |
              v
    [Spaces checkboxes appear: ☐ ENG  ☐ PROD  ☐ DOCS]
              |
              v
    User selects: [☑ ENG  ☑ PROD  ☐ DOCS]
              |
              v
    Click "Save Configuration"
              |
              v
    1️⃣ POST /verify (update credentials)
    2️⃣ PUT /data-sources/:id (save config)
       { config: { url, spaces: "ENG,PROD" }, enabled: true }
              |
              v
    ✅ Configuration saved
    → Return to view mode (if editing)
```

**Why call `/verify` again on save?**
- User might have changed credentials (URL, email, or token) in edit mode
- External service needs updated credentials before sync
- Ensures credentials are always up-to-date in external service

**Critical Rule: Spaces Multiselect Visibility**
```typescript
// ✅ CORRECT: Only show spaces multiselect if latest_options.spaces exists
const availableSpaces = source.latest_options?.spaces
  ? source.latest_options.spaces.split(',').map(s => s.trim()).filter(Boolean)
  : [];

const showSpacesSection = availableSpaces.length > 0;

// Spaces section only renders when showSpacesSection === true
{showSpacesSection && <SpacesMultiselect />}
{showSpacesSection && <SaveButton />}

// ❌ INCORRECT: Don't show empty multiselect or hardcoded spaces
// ❌ INCORRECT: Don't show "Save" button before verification succeeds
```

**Data Flow**:
- Backend returns: `latest_options: { spaces: "ENG,PROD,DOCS" }` (comma-separated string)
- Frontend parses: `["ENG", "PROD", "DOCS"]` (array for checkboxes)
- User selects: `["ENG", "PROD"]` (checked items)
- Frontend saves: `config: { spaces: "ENG,PROD" }` (comma-separated string)

**Dependencies**: Query hooks (2.1), SSE integration (2.2)

---

### 3.5 Create View Mode Component
**File**: `packages/client/src/components/connection-sources/DataSourceViewMode.tsx` (NEW)

**Tasks**:
- [ ] Create read-only view for configured connections:
  ```typescript
  interface DataSourceViewModeProps {
    source: DataSourceConnection;
    onEdit: () => void; // Callback to switch to edit mode
  }

  export function DataSourceViewMode({ source, onEdit }: DataSourceViewModeProps) {
    const { mutate: triggerSync, isPending: isSyncing } = useTriggerSync();

    const handleSync = () => {
      triggerSync(source.id);
    };

    return (
      <div className="space-y-6">
        {/* Configuration Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="font-medium">Status</dt>
                <dd>
                  <ConnectionStatusBadge
                    status={getDisplayStatus(
                      source.status,
                      source.last_sync_status,
                      source.enabled,
                      source.last_verification_at
                    )}
                  />
                </dd>
              </div>

              <div>
                <dt className="font-medium">Last Verified</dt>
                <dd>{formatRelativeTime(source.last_verification_at!)}</dd>
              </div>

              {source.last_sync_at && (
                <div>
                  <dt className="font-medium">Last Sync</dt>
                  <dd>{formatRelativeTime(source.last_sync_at)}</dd>
                </div>
              )}

              {/* Show configured spaces/tables (if available) */}
              {source.config?.spaceKeys && (
                <div>
                  <dt className="font-medium">Synced Spaces</dt>
                  <dd>{source.config.spaceKeys.join(', ')}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Sync Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Sync Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSync}
              disabled={isSyncing || source.status === 'syncing'}
              loading={isSyncing || source.status === 'syncing'}
            >
              {source.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </Button>

            {source.last_sync_error && (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>Last Sync Failed</AlertTitle>
                <AlertDescription>{source.last_sync_error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Edit Configuration Button */}
        <Button variant="outline" onClick={onEdit}>
          Edit Configuration
        </Button>
      </div>
    );
  }
  ```

**Dependencies**: Query hooks (2.1)

---

## Phase 4: Implementation Verification

**Purpose**: Each phase must be verified before moving to the next. This ensures a solid foundation and catches issues early.

---

### 4.1 Verification: Types & API Client (Phase 1)

**What to Verify**:
- [ ] **TypeScript Types** (`packages/client/src/types/dataSource.ts`):
  - [ ] `DataSourceConnection` interface matches backend schema exactly
  - [ ] `latest_options` type is `Record<string, string> | null`
  - [ ] All request/response types compile without errors
  - [ ] Run `npm run type-check` - no TypeScript errors

- [ ] **API Client** (`packages/client/src/services/api.ts`):
  - [ ] `dataSourcesApi` object exported and available
  - [ ] All 6 methods exist: `list`, `get`, `seed`, `update`, `verify`, `sync`
  - [ ] Uses existing `apiRequest()` helper (cookie auth)
  - [ ] Test API calls manually with curl/Postman:
    ```bash
    # Test seed endpoint (should return 200)
    curl -X POST http://localhost:3000/api/data-sources/seed \
      -H "Cookie: connect.sid=..." \
      --cookie-jar cookies.txt

    # Test list endpoint (should return 4 seeded sources)
    curl http://localhost:3000/api/data-sources \
      --cookie cookies.txt
    ```

**Success Criteria**:
- ✅ No TypeScript compilation errors
- ✅ API client compiles and exports correctly
- ✅ Manual API calls return expected responses
- ✅ Cookie authentication works

---

### 4.2 Verification: Hooks & SSE (Phase 2)

**What to Verify**:
- [ ] **TanStack Query Hooks** (`packages/client/src/hooks/useDataSources.ts`):
  - [ ] All hooks export correctly:
    - `useDataSources()`, `useDataSource(id)`, `useSeedDataSources()`
    - `useUpdateDataSource()`, `useVerifyDataSource()`, `useTriggerSync()`
  - [ ] Query keys defined correctly in `dataSourceKeys`
  - [ ] Test hooks in isolation (React Testing Library):
    ```typescript
    const { result } = renderHook(() => useDataSources(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.data).toBeDefined());
    ```

- [ ] **SSE Integration** (`packages/client/src/contexts/SSEContext.tsx`):
  - [ ] `useQueryClient()` hook added to SSEProvider
  - [ ] Query invalidation added in `data_source_update` handler:
    ```typescript
    queryClient.invalidateQueries({ queryKey: ['dataSources'] });
    queryClient.invalidateQueries({ queryKey: ['dataSource', connectionId] });
    ```
  - [ ] Test SSE manually:
    ```bash
    # In one terminal: trigger verification
    curl -X POST http://localhost:3000/api/data-sources/:id/verify \
      -H "Content-Type: application/json" \
      -d '{"config": {...}, "credentials": {...}}'

    # In browser DevTools: watch Network tab (EventSource)
    # Should see SSE event with type: "data_source_update"
    ```

**Success Criteria**:
- ✅ All hooks return expected structure (`data`, `isLoading`, `error`, etc.)
- ✅ Queries fetch data from API correctly
- ✅ SSE events trigger query invalidation
- ✅ UI updates automatically when SSE event received

---

### 4.3 Verification: Constants & Mapping (Phase 3.1)

**What to Verify**:
- [ ] **Status Mapping** (`packages/client/src/constants/connectionSources.ts`):
  - [ ] `getDisplayStatus()` function exists and handles all cases:
    ```typescript
    // Test cases
    getDisplayStatus('idle', null, false, null) === 'Not connected' // Never configured
    getDisplayStatus('idle', 'completed', true, '2025-01-01') === 'Connected'
    getDisplayStatus('syncing', null, true, '2025-01-01') === 'Syncing'
    getDisplayStatus('idle', 'failed', true, '2025-01-01') === 'Error'
    ```
  - [ ] Test with console.log or unit tests

- [ ] **Dynamic Badges** (`getConfigBadges()` function):
  - [ ] Confluence: Extracts spaces from `config.spaces` (comma-separated string)
    ```typescript
    const source = { type: 'confluence', config: { spaces: 'ENG,PROD,DOCS' } };
    const badges = getConfigBadges(source); // Should be ['ENG', 'PROD', 'DOCS']
    ```
  - [ ] Other types return empty array (ServiceNow, SharePoint, WebSearch)

- [ ] **UI Mapping** (`mapDataSourceToUI()` function):
  - [ ] Merges backend data with static metadata correctly
  - [ ] Test with mock data:
    ```typescript
    const backendSource = { /* full DataSourceConnection */ };
    const uiSource = mapDataSourceToUI(backendSource);
    // Verify: id, title, status, badges, lastSync all correct
    ```

**Success Criteria**:
- ✅ Status mapping handles all backend state combinations
- ✅ Badges extracted correctly from Confluence config
- ✅ UI mapping produces correct ConnectionSource structure

---

### 4.4 Verification: List Page (Phase 3.2)

**What to Verify**:
- [ ] **ConnectionSources Component**:
  - [ ] Seed mutation called on mount (check Network tab)
  - [ ] List query fetches data after seed completes
  - [ ] Loading state shows skeleton loaders (not empty page)
  - [ ] Error state shows user-friendly message
  - [ ] Cards display correctly with:
    - [ ] Correct icon (SVG or Globe icon)
    - [ ] Title from `SOURCE_METADATA`
    - [ ] Status badge (matches `getDisplayStatus()` logic)
    - [ ] Dynamic badges from config (Confluence spaces)
    - [ ] "Configure" button for unconfigured (`last_verification_at === null`)
    - [ ] "Manage" button for configured (`last_verification_at !== null`)
  - [ ] Clicking card navigates to `/settings/connections/:id` (UUID, not type)

**Manual Test**:
1. Navigate to `/settings/connections`
2. Open Network tab → should see POST `/seed` and GET `/data-sources`
3. Verify 4 cards appear (Confluence, ServiceNow, SharePoint, WebSearch)
4. Check status badges match backend state
5. Click a card → URL should be `/settings/connections/{uuid}`

**Success Criteria**:
- ✅ Seed endpoint called exactly once on mount
- ✅ List displays all 4 data sources
- ✅ UI updates from backend data (not static mock)
- ✅ Navigation uses UUID in URL

---

### 4.5 Verification: Detail Page - View/Edit Mode (Phase 3.3)

**What to Verify**:
- [ ] **Route Parameter**:
  - [ ] Router updated to use `:id` (not `:sourceId`)
  - [ ] `useParams()` extracts UUID correctly
  - [ ] `useDataSource(id)` fetches single source

- [ ] **View Mode Logic**:
  - [ ] `isConfigured = source.last_verification_at !== null`
  - [ ] **Never configured** (`last_verification_at === null`):
    - Shows form (edit mode)
    - No "Cancel" button
  - [ ] **Already configured** (`last_verification_at !== null`):
    - Shows view mode by default
    - "Edit Configuration" button present
    - Clicking "Edit" switches to form + "Cancel" button
    - Clicking "Cancel" returns to view mode

- [ ] **Component Rendering**:
  - [ ] Header shows breadcrumbs: "Connections" > "{Source Title}"
  - [ ] Icon displays correctly (SVG or Globe)
  - [ ] Description displays correctly
  - [ ] Form or view mode renders based on state

**Manual Test**:
1. Navigate to unconfigured source → should show form
2. Configure source (verify + save)
3. Navigate away and back → should show view mode
4. Click "Edit Configuration" → form appears with "Cancel" button
5. Click "Cancel" → returns to view mode

**Success Criteria**:
- ✅ URL uses UUID (e.g., `/settings/connections/123e4567-e89b-12d3-a456-426614174000`)
- ✅ View/edit mode switching works correctly
- ✅ `isConfigured` logic based on `last_verification_at` only

---

### 4.6 Verification: Forms - Verify & Save Flow (Phase 3.4)

**What to Verify** (Using Confluence as example):

- [ ] **Form Validation**:
  - [ ] URL field requires valid URL format
  - [ ] Email field requires valid email format
  - [ ] API Token field required
  - [ ] Form shows Zod validation errors on invalid input

- [ ] **Step 1: Verify Credentials**:
  - [ ] Click "Verify Credentials" button
  - [ ] Network tab shows: POST `/data-sources/:id/verify` with payload:
    ```json
    {
      "config": { "url": "https://..." },
      "credentials": { "email": "...", "api_token": "..." }
    }
    ```
  - [ ] Button shows loading state: "Verifying..."
  - [ ] SSE event received with `data_source_update` type
  - [ ] `source.latest_options.spaces` updates (e.g., `"ENG,PROD,DOCS"`)
  - [ ] Spaces multiselect appears with checkboxes

- [ ] **Step 2: Spaces Multiselect Visibility**:
  - [ ] **BEFORE verification**: Spaces section NOT visible
  - [ ] **AFTER verification**: Spaces section visible with parsed options:
    ```typescript
    // Backend: latest_options.spaces = "ENG,PROD,DOCS"
    // Frontend: checkboxes for ["ENG", "PROD", "DOCS"]
    ```
  - [ ] User can check/uncheck spaces
  - [ ] "Save Configuration" button appears ONLY after spaces available

- [ ] **Step 3: Save Configuration**:
  - [ ] Select at least one space (required validation)
  - [ ] Click "Save Configuration"
  - [ ] Network tab shows TWO requests:
    1. POST `/verify` (updates credentials in external service)
    2. PUT `/data-sources/:id` with payload:
       ```json
       {
         "config": { "url": "...", "spaces": "ENG,PROD" },
         "enabled": true
       }
       ```
  - [ ] Button shows loading state: "Saving..."
  - [ ] Success: Returns to view mode (if editing)
  - [ ] Success toast notification appears

- [ ] **Error Handling**:
  - [ ] Invalid credentials → Show error message (from `last_verification_error`)
  - [ ] No spaces selected → Show validation error: "Please select at least one space"
  - [ ] Network error → Show friendly error message

**Manual Test Flow**:
1. Navigate to unconfigured Confluence connection
2. Enter URL, email, API token
3. Click "Verify" → wait for spaces to appear (watch SSE in Network tab)
4. Select 2 spaces
5. Click "Save" → verify both POST and PUT requests sent
6. Should return to view mode (or stay in form if first-time config)

**Success Criteria**:
- ✅ Verify endpoint called with credentials
- ✅ SSE event updates `latest_options.spaces`
- ✅ Spaces multiselect appears ONLY when `latest_options.spaces` exists
- ✅ Save calls both `/verify` and PUT `/data-sources/:id`
- ✅ Config saved with comma-separated spaces string

---

### 4.7 Verification: View Mode (Phase 3.5)

**What to Verify**:
- [ ] **DataSourceViewMode Component**:
  - [ ] Configuration summary shows:
    - [ ] Status badge (correct based on `getDisplayStatus()`)
    - [ ] Last Verified date (formatted with `formatRelativeTime()`)
    - [ ] Last Sync date (if exists)
    - [ ] Configured spaces (e.g., "ENG, PROD")
  - [ ] "Sync Now" button present and functional
  - [ ] "Edit Configuration" button calls `onEdit()` callback
  - [ ] Sync error alert shows if `last_sync_error` exists

- [ ] **Sync Functionality**:
  - [ ] Click "Sync Now"
  - [ ] Network tab shows: POST `/data-sources/:id/sync`
  - [ ] Button shows loading state: "Syncing..."
  - [ ] Status updates to `'syncing'` (via SSE or optimistic update)
  - [ ] SSE event received when sync completes:
    ```json
    {
      "type": "data_source_update",
      "data": {
        "connectionId": "...",
        "status": "idle",
        "last_sync_status": "completed",
        "last_sync_at": "2025-10-07T12:00:00Z",
        "documentsProcessed": 42
      }
    }
    ```
  - [ ] Success toast notification appears
  - [ ] UI updates to show new `last_sync_at` timestamp

**Manual Test**:
1. Navigate to configured connection (view mode)
2. Verify all fields display correctly
3. Click "Sync Now" → watch Network tab for POST request
4. Wait for SSE event → verify UI updates automatically
5. Click "Edit Configuration" → form appears

**Success Criteria**:
- ✅ View mode displays all configuration details
- ✅ Sync triggers POST request
- ✅ SSE updates UI in real-time
- ✅ "Edit Configuration" switches to edit mode

---

### 4.8 Verification: Real-Time Updates (SSE Integration)

**What to Verify**:
- [ ] **SSE Connection**:
  - [ ] Open DevTools Network tab → filter by "EventSource"
  - [ ] Should see active SSE connection to `/api/sse/events`
  - [ ] Connection status: `(pending)` or `200` (active)

- [ ] **Verification Events**:
  - [ ] Trigger verification in one browser tab
  - [ ] Open same page in another tab
  - [ ] Both tabs should update when SSE event received
  - [ ] Verify query invalidation happens (check React Query DevTools)

- [ ] **Sync Events**:
  - [ ] Trigger sync in one tab
  - [ ] Other tabs should see status change to "Syncing"
  - [ ] All tabs should update when sync completes
  - [ ] Toast notification appears in tab that triggered sync

- [ ] **Multiple Connections**:
  - [ ] Trigger sync on Confluence connection
  - [ ] Should NOT update ServiceNow connection (isolated by `connectionId`)

**Manual Test**:
1. Open `/settings/connections` in 2 browser tabs
2. In Tab 1: Click a connection → Click "Sync Now"
3. In Tab 2: Watch for UI update (status badge changes)
4. In Tab 1: Wait for toast notification
5. Both tabs should show updated "Last Sync" timestamp

**Success Criteria**:
- ✅ SSE connection active and stable
- ✅ Events trigger query invalidation
- ✅ Multiple tabs stay in sync
- ✅ Updates isolated to correct connection

---

### 4.9 Verification: Accessibility (WCAG 2.1 AA)

**What to Verify**:
- [ ] **Keyboard Navigation**:
  - [ ] Tab through all interactive elements (cards, buttons, inputs)
  - [ ] Enter key activates buttons and links
  - [ ] Escape key closes modals/cancels edit mode
  - [ ] Focus indicators visible (blue outline or custom styling)

- [ ] **Screen Reader Support**:
  - [ ] All form inputs have associated labels (`<Label htmlFor="...">`)
  - [ ] Status badges have `aria-label` describing state
  - [ ] Loading states announced (use `aria-live` regions)
  - [ ] Error messages associated with inputs (`aria-describedby`)

- [ ] **ARIA Attributes**:
  - [ ] Buttons have descriptive `aria-label` when icon-only
  - [ ] Form sections have `role="group"` or `<fieldset>`
  - [ ] Required fields marked with `aria-required="true"`

- [ ] **Color Contrast**:
  - [ ] Run axe DevTools audit → should pass all contrast checks
  - [ ] Status badges readable (4.5:1 contrast ratio minimum)

**Manual Test**:
1. Unplug mouse, navigate entire UI with keyboard only
2. Enable screen reader (NVDA, JAWS, VoiceOver)
3. Navigate through form and verify announcements
4. Run axe DevTools extension → fix all issues

**Success Criteria**:
- ✅ All functionality accessible via keyboard
- ✅ Screen reader announces all content correctly
- ✅ axe DevTools reports 0 accessibility violations
- ✅ Color contrast passes WCAG 2.1 AA

---

### 4.10 Verification: Error Handling & Edge Cases

**What to Verify**:
- [ ] **Network Errors**:
  - [ ] Disconnect network → should show error message (not crash)
  - [ ] Reconnect → should allow retry

- [ ] **Invalid Credentials**:
  - [ ] Enter wrong credentials → verify endpoint returns error
  - [ ] Error message displayed: `last_verification_error`
  - [ ] User can correct and retry

- [ ] **Failed Sync**:
  - [ ] Trigger sync that fails (mock or actual)
  - [ ] Error alert appears in view mode
  - [ ] `last_sync_error` message displayed
  - [ ] User can retry sync

- [ ] **Empty States**:
  - [ ] No spaces available after verification → should show message
  - [ ] No configured connections → should show empty state

- [ ] **Concurrent Actions**:
  - [ ] Click "Verify" twice rapidly → should debounce/disable button
  - [ ] Verify + Save simultaneously → should handle gracefully

- [ ] **SSE Disconnection**:
  - [ ] Kill SSE connection → should auto-reconnect (check SSE service)
  - [ ] Missed events → should still work (queries refetch on invalidation)

**Manual Test**:
1. Test with invalid credentials → verify error shown
2. Disconnect WiFi mid-verification → verify error handling
3. Trigger sync failure (mock backend error) → verify error display
4. Spam-click buttons → verify debouncing/disabled states

**Success Criteria**:
- ✅ All errors display user-friendly messages
- ✅ No crashes or unhandled exceptions
- ✅ User can recover from all error states
- ✅ Loading states prevent duplicate requests

---

### 4.11 Verification: End-to-End Flow (Complete User Journey)

**Full Test Scenario** (Confluence):

1. **Fresh Start** (Never configured):
   - [ ] Navigate to `/settings/connections`
   - [ ] Verify seed endpoint called (Network tab)
   - [ ] 4 connections displayed (Confluence, ServiceNow, SharePoint, WebSearch)
   - [ ] Confluence shows "Configure" button (not "Manage")

2. **Initial Configuration**:
   - [ ] Click Confluence card
   - [ ] URL changes to `/settings/connections/{uuid}`
   - [ ] Form displays (not view mode)
   - [ ] Enter URL: `https://acme.atlassian.net/wiki`
   - [ ] Enter email: `test@acme.com`
   - [ ] Enter API token: `ATATT...`
   - [ ] Click "Verify Credentials"
   - [ ] Watch Network tab: POST `/verify` sent
   - [ ] Wait 2-5 seconds for SSE event
   - [ ] Spaces checkboxes appear: ☐ ENG  ☐ PROD  ☐ DOCS
   - [ ] Select 2 spaces: ☑ ENG  ☑ PROD
   - [ ] Click "Save Configuration"
   - [ ] Watch Network tab: POST `/verify` + PUT `/data-sources/:id`
   - [ ] Success: View mode displays (or redirect to list)

3. **Return to List**:
   - [ ] Navigate back to `/settings/connections`
   - [ ] Confluence now shows "Manage" button (not "Configure")
   - [ ] Status badge shows "Connected" (green)
   - [ ] Badges show: "ENG", "PROD" (dynamic from config)

4. **View Mode**:
   - [ ] Click Confluence card again
   - [ ] View mode displays (not form)
   - [ ] Configuration summary shows:
     - Status: Connected
     - Last Verified: "2 minutes ago"
     - Synced Spaces: "ENG, PROD"
   - [ ] "Sync Now" button present
   - [ ] "Edit Configuration" button present

5. **Trigger Sync**:
   - [ ] Click "Sync Now"
   - [ ] Button shows "Syncing..." loading state
   - [ ] Status badge changes to "Syncing" (yellow)
   - [ ] Wait for SSE event (sync complete)
   - [ ] Toast notification: "Confluence sync complete"
   - [ ] Status badge changes to "Connected" (green)
   - [ ] Last Sync updates: "Just now"

6. **Edit Configuration**:
   - [ ] Click "Edit Configuration"
   - [ ] Form displays with pre-filled values
   - [ ] "Cancel" button appears
   - [ ] Change URL, verify again → spaces update
   - [ ] Select different spaces
   - [ ] Click "Save Configuration"
   - [ ] Returns to view mode with updated config

7. **Multi-Tab Sync**:
   - [ ] Open 2nd browser tab with same connection
   - [ ] In Tab 1: Click "Sync Now"
   - [ ] In Tab 2: Watch status badge update in real-time
   - [ ] Both tabs show "Last Sync" timestamp

8. **Error Handling**:
   - [ ] Edit configuration with invalid credentials
   - [ ] Verify → error message appears
   - [ ] Correct credentials → verify succeeds
   - [ ] Mock sync failure → error alert in view mode

**Success Criteria**:
- ✅ Complete flow works end-to-end without errors
- ✅ All UI updates happen in real-time via SSE
- ✅ Data persists across page refreshes
- ✅ Multiple tabs stay synchronized

---

## Phase 5: Testing & Validation

### 5.1 Unit Tests
**Files**:
- `packages/client/src/api/dataSources.test.ts`
- `packages/client/src/hooks/useDataSources.test.ts`

**Tasks**:
- [ ] Test API client functions with mocked fetch
- [ ] Test query hooks with TanStack Query testing utilities
- [ ] Test SSE event handlers

---

### 5.2 Component Tests
**Files**:
- `packages/client/src/components/settings/ConnectionSources.test.tsx`
- `packages/client/src/pages/ConnectionSourceDetailPage.test.tsx`

**Tasks**:
- [ ] Test list view rendering with mocked query data
- [ ] Test detail page view/edit mode switching
- [ ] Test form validation and submission
- [ ] Test SSE real-time updates

---

### 5.3 Accessibility Tests
**Tasks**:
- [ ] Verify keyboard navigation works (Tab, Enter, Escape)
- [ ] Verify screen reader announcements (ARIA labels)
- [ ] Test loading states and error messages for accessibility
- [ ] Run axe DevTools audit

---

### 5.4 E2E Tests (Playwright)
**File**: `tests/e2e/data-sources.spec.ts`

**Tasks**:
- [ ] Automated E2E test covering full flow (see 4.11)
- [ ] Test edge cases and error scenarios
- [ ] Test multi-tab synchronization
- [ ] Test SSE reconnection

---

## Phase 5: Edge Cases & Error Handling

### 5.1 Error Scenarios
**Tasks**:
- [ ] Handle failed verification (show error, allow retry)
- [ ] Handle failed sync (show error, allow retry)
- [ ] Handle network errors (show offline message)
- [ ] Handle unauthorized errors (redirect to login)
- [ ] Handle missing data source (404 page)

---

### 5.2 Loading States
**Tasks**:
- [ ] Show skeleton loaders for list and detail views
- [ ] Show inline spinners for verify/sync actions
- [ ] Show optimistic updates (status changes immediately, revert on error)

---

### 5.3 Real-Time Updates
**Tasks**:
- [ ] Test verification SSE events update UI correctly
- [ ] Test sync SSE events update UI correctly
- [ ] Test multiple tabs syncing state correctly
- [ ] Test SSE reconnection on disconnect

---

## Summary of Key Changes

### 1. Data Flow Architecture
**OLD**: Static mock data → UI
**NEW**: API → TanStack Query → SSE → UI (real-time)

### 2. Routing Changes
**OLD**: `/settings/connections/:sourceId` (string like 'confluence')
**NEW**: `/settings/connections/:id` (UUID from backend)

### 3. Status Mapping
**OLD**: UI-only status strings
**NEW**: Backend status + last_sync_status + enabled → UI status

### 4. Configuration Flow
**OLD**: Single-step save
**NEW**: Two-step flow:
1. Verify credentials → SSE updates latest_options
2. Select spaces/tables → Save configuration

### 5. View Modes
**OLD**: Always show form
**NEW**: Toggle between:
- **Edit Mode (Initial Configuration)**: `last_verification_at === null` (never configured)
- **View Mode (Default)**: `last_verification_at !== null` (configured) - shows read-only details
- **Edit Mode (Reconfiguration)**: User clicks "Edit Configuration" button in view mode

**Visual Flow**:
```
User lands on detail page
         |
         v
last_verification_at === null?
         |
    Yes  |  No
         |
    [FORM MODE]  →  [VIEW MODE]
    (Configure)      (Read-only)
                          |
                     Click "Edit Configuration"
                          |
                     [FORM MODE]
                     (Reconfigure)
                          |
                     Click "Cancel"
                          |
                     [VIEW MODE]
```

---

## Open Questions

1. **Session-based seeding**: Should seed endpoint be called once per session (using sessionStorage) or every time the page loads?
   - **Recommendation**: Call on every page load (idempotent, ensures fresh data)

2. **Optimistic updates**: Should we optimistically update status during verify/sync, or wait for SSE?
   - **Recommendation**: Optimistic update to `verifying`/`syncing`, revert on error

3. **Error recovery**: Should we retry failed verifications/syncs automatically?
   - **Recommendation**: Manual retry only (show "Retry" button)

4. **Spaces UI**: Should available spaces be checkboxes or multi-select dropdown?
   - **Recommendation**: Checkboxes for better accessibility

5. **View mode editing**: Should users be able to edit configuration after initial setup?
   - **Recommendation**: Yes, add "Edit Configuration" button in view mode

---

## Timeline Estimate

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: API Layer & Types | 2-3 hours |
| Phase 2: State Management & Hooks | 3-4 hours |
| Phase 3: UI Component Updates | 6-8 hours |
| Phase 4: Testing & Validation | 4-6 hours |
| Phase 5: Edge Cases & Error Handling | 2-3 hours |
| **Total** | **17-24 hours** |

---

## Next Steps

1. **Review this checklist** with the team
2. **Create GitHub issues** for each phase
3. **Start with Phase 1** (API layer and types)
4. **Implement Phase 2** (state management)
5. **Update UI components** (Phase 3)
6. **Test thoroughly** (Phases 4-5)
7. **Deploy and monitor** SSE events in production

---

## Notes

- **SSE Integration**: Critical for real-time status updates - test thoroughly
- **Type Safety**: Ensure frontend types match backend schema exactly
- **Accessibility**: All components must follow WCAG 2.1 AA standards
- **Error Handling**: Always show user-friendly error messages
- **Loading States**: Prevent UI jank with proper skeleton loaders
- **Security**: Never log credentials, follow SOC2 compliance
