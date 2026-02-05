# Feature Flags System

RITA Go uses a **two-tier feature flag system**:

1. **Platform Flags** - Per-tenant control via Platform Actions API (relay proxy)
2. **Local Flags** - Per-browser localStorage for dev/experimental features

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Feature Flags                        │
├─────────────────────────┬───────────────────────────────┤
│     Platform Flags      │        Local Flags            │
├─────────────────────────┼───────────────────────────────┤
│ Per-org/tenant          │ Per-browser                   │
│ api-server → Platform   │ localStorage                  │
│ LRU cached (5min)       │ Instant                       │
│ SSE real-time sync      │ No sync                       │
│ platformControlled:true │ platformControlled:false/omit │
└─────────────────────────┴───────────────────────────────┘
```

**For platform-controlled flags**, see [Platform Feature Flags](./platform-feature-flags.md).

## Files

| File | Purpose |
|------|---------|
| `src/types/featureFlags.ts` | Flag registry and types |
| `src/services/platformFlags.ts` | Platform API calls |
| `src/stores/feature-flags-store.ts` | Zustand store |
| `src/hooks/useFeatureFlags.ts` | React hooks |
| `src/hooks/usePlatformFlags.ts` | Init platform flags |
| `src/components/devtools/FeatureFlagsPanel.tsx` | DevTools UI |

## Adding a New Local Flag

For dev/experimental features stored in localStorage:

### Step 1: Register the flag

**File:** `src/types/featureFlags.ts`

```typescript
export type FeatureFlagKey =
  | 'EXISTING_FLAGS'
  | 'YOUR_NEW_FEATURE'  // Add here

export const FEATURE_FLAGS: Record<FeatureFlagKey, FeatureFlagConfig> = {
  YOUR_NEW_FEATURE: {
    key: 'YOUR_NEW_FEATURE',
    label: 'Your New Feature',
    description: 'Enable the new feature you are building',
    defaultValue: false,
    category: 'experimental',  // general | debug | experimental
    // omit platformControlled for local flags
  },
}
```

### Step 2: Use the flag

```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlags'

function MyComponent() {
  const showNewFeature = useFeatureFlag('YOUR_NEW_FEATURE')
  if (!showNewFeature) return <OldFeature />
  return <NewFeature />
}
```

---

## Adding a Platform-Controlled Flag

For per-tenant flags managed via Platform Actions API:

### Step 1: Register in client

**File:** `src/types/featureFlags.ts`

```typescript
YOUR_NEW_FEATURE: {
  key: 'YOUR_NEW_FEATURE',
  label: 'Your Feature',
  description: 'Description',
  defaultValue: false,
  category: 'autopilot',  // or 'experimental'
  platformControlled: true,  // <-- Required
},
```

### Step 2: Add server mapping

**File:** `packages/api-server/src/services/FeatureFlagService.ts`

```typescript
const CLIENT_TO_PLATFORM_FLAG_MAP: Record<string, string> = {
  // existing mappings...
  YOUR_NEW_FEATURE: 'your-new-feature',  // <-- Add
}
```

### Step 3: Create in Platform Actions

Ensure flag exists in Platform Actions backend with matching name.

See [Platform Feature Flags](./platform-feature-flags.md) for full details.

## Developer APIs

**Hook-based (Recommended):**
```typescript
// Single flag - returns boolean
const enabled = useFeatureFlag('NEW_FEATURE')

// All flags with management functions
const { flags, setFlag, toggleFlag, resetAll } = useFeatureFlags()
```

**Component-based (Future):**
```typescript
// Conditional rendering wrapper
<FeatureFlag flag="NEW_FEATURE">
  <NewFeature />
</FeatureFlag>

// With fallback
<FeatureFlag flag="NEW_FEATURE" fallback={<OldFeature />}>
  <NewFeature />
</FeatureFlag>
```

## Developer Tools Access

Navigate to `/devtools` to:
- View all registered feature flags
- Toggle flags on/off for local development
- See flag descriptions and categories
- Reset flags to defaults

**Example:** `http://localhost:5173/devtools`

## Testing with Feature Flags

```typescript
// Mock feature flags in tests (future utility)
import { renderWithFlags } from '@/features/feature-flags/utils/flag-testing'

describe('MyComponent', () => {
  it('shows new feature when flag enabled', () => {
    const { getByText } = renderWithFlags(
      <MyComponent />,
      { NEW_FEATURE: true }
    )
    expect(getByText('New Feature')).toBeInTheDocument()
  })
})
```

## Best Practices

1. **Flag Naming:** Use `SCREAMING_SNAKE_CASE` for flag keys
2. **Default Values:** Start with `false` for new features
3. **Categories:**
   - `general` - User-facing features
   - `debug` - Developer debugging tools
   - `experimental` - Beta/unstable features
4. **Cleanup:** Remove flags once features are stable and fully rolled out
5. **Documentation:** Always add clear `description` in the registry
6. **Type Safety:** Never use string literals - always use `FeatureFlagKey` type

## Current Capabilities

| Capability | Status |
|------------|--------|
| Tenant-level flags | ✅ Implemented (platform-controlled) |
| Real-time updates | ✅ Implemented (SSE broadcast) |
| Caching | ✅ Implemented (in-memory LRU, 5min TTL) |
| User-level flags | ⏳ Not yet implemented |
| A/B testing | ⏳ Not yet implemented |
| Audit logging | ⏳ Not yet implemented |