# Platform Feature Flags - Relay Proxy Architecture

## Overview

Platform feature flags enable per-tenant control of features via the Platform Actions API. RITA Go uses a **relay proxy** through the api-server with **in-memory LRU caching** and **SSE real-time broadcasts**.

**Status**: ✅ **IMPLEMENTED**

**Ticket**: RG-491, RG-512

**Last Updated**: 2025-12-18

---

## Architecture Summary

### Two-Tier Flag System

| Layer | Scope | Storage | Purpose |
|-------|-------|---------|---------|
| **Platform Flags** | Per-org/tenant | Platform API + LRU cache | Per-tenant feature control |
| **Local Flags** | Per-browser | localStorage | Dev/experimental features |

### Data Flow

```
┌─────────────┐      ┌─────────────────────────────┐      ┌─────────────────┐
│  RITA Go    │ ──── │  api-server                 │      │ Platform API    │
│  (Client)   │      │  (Relay + LRU Cache)        │      │ (strangler)     │
└─────────────┘      └─────────────────────────────┘      └─────────────────┘
       │                          │                               │
       │  GET /api/               │                               │
       │  feature-flags/X         │                               │
       │ ────────────────────────>│                               │
       │                          │                               │
       │                          │  [cache hit] → return cached  │
       │                          │                               │
       │                          │  [cache miss]                 │
       │                          │ ─────────────────────────────>│
       │                          │    GET /api/features/         │
       │                          │    is-enabled/...             │
       │                          │<─────────────────────────────│
       │                          │  store in LRU (5min TTL)      │
       │<─────────────────────────│                               │
       │    { isEnabled }         │                               │
```

### Real-Time Updates (SSE)

When a flag is updated, the api-server:
1. Updates the Platform API
2. Invalidates LRU cache entry
3. Broadcasts via SSE to all org members

```
┌─────────────┐      ┌─────────────┐      ┌─────────────────┐
│  Admin      │      │  api-server │      │  All Org Users  │
│  (Updates)  │      │             │      │  (SSE clients)  │
└─────────────┘      └─────────────┘      └─────────────────┘
       │                    │                       │
       │  POST /rules       │                       │
       │ ──────────────────>│                       │
       │                    │── Update Platform API │
       │                    │── Invalidate cache    │
       │                    │                       │
       │                    │  SSE: feature_flag_   │
       │                    │       update          │
       │                    │ ─────────────────────>│
       │<───────────────────│                       │
       │    { success }     │                       │
```

---

## Adding a New Platform-Controlled Flag

### Step 1: Register in Client Types

**File:** `packages/client/src/types/featureFlags.ts`

```typescript
export type FeatureFlagKey =
  | 'EXISTING_FLAGS'
  | 'YOUR_NEW_FEATURE'  // Add here

export const FEATURE_FLAGS: Record<FeatureFlagKey, FeatureFlagConfig> = {
  YOUR_NEW_FEATURE: {
    key: 'YOUR_NEW_FEATURE',
    label: 'Your Feature Name',
    description: 'What this feature does',
    defaultValue: false,
    category: 'autopilot',  // or 'experimental'
    platformControlled: true,  // <-- Required for platform flags
  },
}
```

### Step 2: Add Flag Mapping in api-server

**File:** `packages/api-server/src/services/FeatureFlagService.ts`

```typescript
const CLIENT_TO_PLATFORM_FLAG_MAP: Record<string, string> = {
  ENABLE_AUTO_PILOT: 'auto-pilot',
  ENABLE_AUTO_PILOT_SUGGESTIONS: 'auto-pilot-suggestions',
  ENABLE_AUTO_PILOT_ACTIONS: 'auto-pilot-actions',
  YOUR_NEW_FEATURE: 'your-new-feature',  // <-- Add mapping
}
```

### Step 3: Create Flag in Platform Actions

Ensure the flag exists in the Platform Actions backend with matching name (e.g., `your-new-feature`).

### Step 4: Use in Components

```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlags'

function MyComponent() {
  const isEnabled = useFeatureFlag('YOUR_NEW_FEATURE')
  if (!isEnabled) return null
  return <NewFeature />
}
```

---

## API Endpoints

### Client → api-server (Relay)

All requests require authentication (session cookie).

#### Check Single Flag
```
GET /api/feature-flags/:flagName
```
**Response:** `{ flagName, isEnabled }`

#### Batch Check
```
POST /api/feature-flags/batch
Body: { flagNames: ['FLAG_A', 'FLAG_B'] }
```
**Response:** `{ flags: { FLAG_A: true, FLAG_B: false } }`

#### Update Flag (admin/owner only)
```
POST /api/feature-flags/:flagName/rules
Body: { isEnabled: true }
```
**Response:** `{ success, flagName, isEnabled }`

### api-server → Platform API

**Base URL:** `https://strangler-facade.resolve.io` (configurable via `PLATFORM_FLAGS_URL`)

#### Check Feature Enabled
```
GET /api/features/is-enabled/{platformName}/{environment}/{tenant}
```

#### Update Feature Rule
```
POST /api/features/{platformName}/rules
Body: { environment, tenant, isEnabled }
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PLATFORM_FLAGS_URL` | `https://strangler-facade.resolve.io` | Platform API base URL |
| `FEATURE_FLAG_CACHE_TTL` | `300` | LRU cache TTL in seconds (5 min) |
| `NODE_ENV` | `development` | Environment for flag evaluation |

### Environment Detection

Environment is determined **server-side** from `NODE_ENV`:

| NODE_ENV | Platform Environment |
|----------|---------------------|
| `production` | `production` |
| `staging` | `staging` |
| `development` | `development` |

---

## Flag Name Mapping

Client keys → Platform names (defined in `FeatureFlagService.ts`):

| Client Key | Platform Name |
|------------|---------------|
| `ENABLE_AUTO_PILOT` | `auto-pilot` |
| `ENABLE_AUTO_PILOT_SUGGESTIONS` | `auto-pilot-suggestions` |
| `ENABLE_AUTO_PILOT_ACTIONS` | `auto-pilot-actions` |

---

## Current Platform Flags

| Client Key | Platform Name | Description | Default |
|------------|---------------|-------------|---------|
| `ENABLE_AUTO_PILOT` | `auto-pilot` | **Master toggle** | `false` |
| `ENABLE_AUTO_PILOT_SUGGESTIONS` | `auto-pilot-suggestions` | AI suggestions | `false` |
| `ENABLE_AUTO_PILOT_ACTIONS` | `auto-pilot-actions` | Auto actions | `false` |

### Master Toggle Cascade

`ENABLE_AUTO_PILOT` controls dependent flags:
- When **disabled**: Dependents auto-disabled via parallel API calls
- UI shows dependents greyed out when master is OFF

---

## Implementation Files

### Client (packages/client/)

| File | Purpose |
|------|---------|
| `src/types/featureFlags.ts` | Flag registry, `platformControlled` marker |
| `src/services/platformFlags.ts` | API calls to relay proxy |
| `src/stores/feature-flags-store.ts` | Zustand store for flag state |
| `src/hooks/useFeatureFlags.ts` | React hooks for flag access |
| `src/hooks/usePlatformFlags.ts` | Initialization on app load |
| `src/contexts/SSEContext.tsx` | Handles `feature_flag_update` events |

### Server (packages/api-server/)

| File | Purpose |
|------|---------|
| `src/services/FeatureFlagService.ts` | Relay proxy with Valkey caching |
| `src/routes/featureFlags.ts` | REST endpoints |

---

## DevTools UI

Access at `/devtools`. Platform-controlled flags show ☁️ icon:

```
┌─ Experimental Features ────────────────────────┐
│ ☁️ Auto Pilot (Platform-Controlled)            │
│                                                │
│ Auto Pilot                          [toggle]   │
│ Auto Pilot Suggestions              [greyed]   │
│ Auto Pilot Actions                  [greyed]   │
└────────────────────────────────────────────────┘
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Platform API unreachable | Log error, return `false` |
| Cache miss + API fail | Return `false`, no cache update |
| Update fails | Return `false`, cache unchanged |
| SSE disconnect | Flags remain at last known state |

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Relay proxy | api-server | Centralized auth, caching, SSE broadcast |
| Caching | In-memory LRU (5min TTL) | No external deps, reduces Platform API load |
| Real-time updates | SSE broadcast | Instant sync across org |
| Environment detection | Server NODE_ENV | Single source of truth |
| Flag name mapping | Server-side | Client uses readable names |
| Local overrides | None | Platform is source of truth |
