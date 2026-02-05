# Story 3: Split Connection Sources UI - Implementation Plan

**Parent:** `technical-design-autopilot-tickets.md`
**Prerequisite:** Story 2 (ServiceNow UI Configuration)
**Focus:** Split Connection Sources into Knowledge Sources & ITSM Sources

---

## Context

Current state: Single "Connection Sources" menu item showing all data sources.
Target: Split into two sections with different behaviors:
- **Knowledge Sources** - sync KB articles (Confluence, SharePoint, ServiceNow KB)
- **ITSM Sources** - sync tickets for autopilot (ServiceNow ITSM, Jira)

---

## Architecture Decision

### Source Type Mapping

| Source Type | Knowledge Sources | ITSM Sources |
|-------------|-------------------|--------------|
| confluence | Yes | No |
| sharepoint | Yes | No |
| servicenow | Yes (KB tables) | Yes (incident, problem) |
| jira | No | Yes |
| websearch | Yes | No |

**Note:** ServiceNow appears in BOTH lists (dual-purpose). Same connection record, different detail views.

---

## Implementation Steps

### Step 1: Update Sidebar Menu

**File:** `packages/client/src/components/layouts/RitaSettingsLayout.tsx`

Add collapsible submenu under Connection Sources:

```tsx
<SidebarMenuItem>
  <Collapsible defaultOpen={pathname.includes("/connections")}>
    <CollapsibleTrigger asChild>
      <SidebarMenuButton>
        <Database className="h-4 w-4" />
        <span>Connection Sources</span>
        <ChevronDown className="ml-auto h-4 w-4" />
      </SidebarMenuButton>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <SidebarMenuSub>
        <SidebarMenuSubItem>
          <SidebarMenuSubButton asChild isActive={pathname.includes("/knowledge")}>
            <Link to="/settings/connections/knowledge">Knowledge Sources</Link>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
        <SidebarMenuSubItem>
          <SidebarMenuSubButton asChild isActive={pathname.includes("/itsm")}>
            <Link to="/settings/connections/itsm">ITSM Sources</Link>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      </SidebarMenuSub>
    </CollapsibleContent>
  </Collapsible>
</SidebarMenuItem>
```

---

### Step 2: Define Source Constants

**File:** `packages/client/src/constants/connectionSources.ts`

Add source type definitions:

```typescript
export const KNOWLEDGE_SOURCE_TYPES = ["confluence", "sharepoint", "servicenow", "websearch"] as const;
export const ITSM_SOURCE_TYPES = ["servicenow", "jira"] as const;

export const KNOWLEDGE_SOURCES_ORDER = ["confluence", "sharepoint", "servicenow", "websearch"];
export const ITSM_SOURCES_ORDER = ["servicenow", "jira"];
```

---

### Step 3: Create List Pages

**File:** `packages/client/src/pages/settings/KnowledgeSources.tsx` (new)
- Filter sources by `KNOWLEDGE_SOURCE_TYPES`
- Links to `/settings/connections/knowledge/:id`
- Header: "Knowledge Sources" with description

**File:** `packages/client/src/pages/settings/ItsmSources.tsx` (new)
- Filter sources by `ITSM_SOURCE_TYPES`
- Links to `/settings/connections/itsm/:id`
- Header: "ITSM Sources" with description
- Jira shows "Coming Soon" badge

---

### Step 4: Update Routes

**File:** `packages/client/src/router.tsx`

```tsx
// Replace single /settings/connections route
{ path: "connections", element: <Navigate to="knowledge" replace /> },
{ path: "connections/knowledge", element: <KnowledgeSourcesPage /> },
{ path: "connections/knowledge/:id", element: <ConnectionSourceDetailPage mode="knowledge" /> },
{ path: "connections/itsm", element: <ItsmSourcesPage /> },
{ path: "connections/itsm/:id", element: <ConnectionSourceDetailPage mode="itsm" /> },
```

---

### Step 5: Update Detail Page

**File:** `packages/client/src/pages/ConnectionSourceDetailPage.tsx`

Add `mode` prop to control behavior:

```tsx
interface Props {
  mode: "knowledge" | "itsm";
}

// Use mode to determine which Configuration component to show
const configurationRegistry: Record<string, Record<string, ComponentType>> = {
  knowledge: {
    confluence: ConfluenceConfiguration,
    servicenow: ServiceNowKBConfiguration,  // KB sync only
    sharepoint: SharePointConfiguration,
  },
  itsm: {
    servicenow: ServiceNowItsmConfiguration,  // Ticket sync only
    jira: JiraConfiguration,
  }
};
```

---

### Step 6: Split ServiceNow Configuration

Current `ServiceNowConfiguration.tsx` handles both KB and ITSM sync.
Split into two focused components:

**File:** `packages/client/src/components/connection-sources/connection-details/ServiceNowKBConfiguration.tsx` (new)
- Shows KB selector from `latest_options.knowledge_base` (displays title, uses sys_id)
- "Sync" button
- Uses existing `/sync` endpoint

**File:** `packages/client/src/components/connection-sources/connection-details/ServiceNowItsmConfiguration.tsx` (rename existing)
- Shows ITSM table selector from `latest_options.itsm_tables`
- Time range picker (30/60/90 days)
- "Sync Tickets" button
- Uses `/sync-tickets` endpoint

Both share:
- `ConnectionStatusCard`
- `ConnectionActionsMenu`
- Same form for credentials (`ServiceNowForm.tsx`)

---

### Step 7: API Endpoint Filter (Optional)

**File:** `packages/api-server/src/routes/dataSources.ts`

Add query param to filter by capability:

```typescript
// GET /api/data-sources?capability=knowledge|itsm
const { capability } = req.query;

let query = `SELECT * FROM data_source_connections WHERE organization_id = $1`;
if (capability === 'knowledge') {
  query += ` AND (type IN ('confluence', 'sharepoint', 'websearch') OR kb_enabled = true)`;
} else if (capability === 'itsm') {
  query += ` AND (type IN ('jira') OR itsm_enabled = true)`;
}
```

**Alternative:** Filter client-side (simpler, fewer API changes).

---

## Files Summary

| File | Action |
|------|--------|
| `packages/client/src/components/layouts/RitaSettingsLayout.tsx` | Add collapsible submenu |
| `packages/client/src/constants/connectionSources.ts` | Add source type constants |
| `packages/client/src/pages/settings/KnowledgeSources.tsx` | **Create** |
| `packages/client/src/pages/settings/ItsmSources.tsx` | **Create** |
| `packages/client/src/router.tsx` | Update routes |
| `packages/client/src/pages/ConnectionSourceDetailPage.tsx` | Add mode prop |
| `packages/client/src/components/connection-sources/connection-details/ServiceNowKBConfiguration.tsx` | **Create** |
| `packages/client/src/components/connection-sources/connection-details/ServiceNowItsmConfiguration.tsx` | Rename existing |

---

## UI Flow

```
Settings Sidebar
├── Profile
├── Connection Sources (collapsible)
│   ├── Knowledge Sources → /settings/connections/knowledge
│   │   ├── Confluence → /settings/connections/knowledge/:id
│   │   ├── SharePoint → /settings/connections/knowledge/:id
│   │   ├── ServiceNow → /settings/connections/knowledge/:id (KB sync)
│   │   └── Web Search → /settings/connections/knowledge/:id
│   └── ITSM Sources → /settings/connections/itsm
│       ├── ServiceNow → /settings/connections/itsm/:id (ticket sync)
│       └── Jira → /settings/connections/itsm/:id (Coming Soon)
└── Users
```

---

## Breadcrumb Updates

**Knowledge Sources:**
- List: `Settings > Knowledge Sources`
- Detail: `Settings > Knowledge Sources > Confluence`

**ITSM Sources:**
- List: `Settings > ITSM Sources`
- Detail: `Settings > ITSM Sources > ServiceNow`

---

## Decisions

1. **ServiceNow:** Same connection record appears in both lists, different detail views
2. **Jira:** Show "Coming Soon" in ITSM Sources
3. **Web Search:** Keep in Knowledge Sources

---

## Testing Checklist

- [ ] Sidebar shows collapsible Connection Sources with two submenu items
- [ ] `/settings/connections` redirects to `/settings/connections/knowledge`
- [ ] Knowledge Sources page lists Confluence, SharePoint, ServiceNow, Web Search
- [ ] ITSM Sources page lists ServiceNow, Jira (Coming Soon)
- [ ] ServiceNow card clickable in both lists
- [ ] Knowledge detail shows KB sync UI
- [ ] ITSM detail shows ticket sync UI
- [ ] Breadcrumbs update correctly per section
- [ ] Active state highlights correct submenu item
