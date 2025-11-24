# Feature Flags System

RITA Go uses a **multi-scope feature flag system** for controlling features at different levels (local dev, tenant, user). This allows developers to:
- Hide incomplete features during development
- Enable beta features for specific tenants or users
- A/B test features with gradual rollouts
- Toggle debug modes and experimental features

## Current Implementation

**Location:**
- `src/types/featureFlags.ts` - Flag registry and type definitions
- `src/lib/featureFlags.ts` - Feature flags manager (localStorage)
- `src/hooks/useFeatureFlags.ts` - React hooks for flag access
- `src/components/devtools/FeatureFlagsPanel.tsx` - Management UI
- `src/pages/DevToolsPage.tsx` - Developer tools page

**Evaluation Priority (Scope Chain):**
```
User-level (highest) → Tenant-level → Local (dev) → Default (lowest)
```
*Note: Currently only Local scope is implemented. Tenant and User scopes are architecture placeholders for future API integration.*

## Adding a New Feature Flag

1. **Register the flag** in `src/types/featureFlags.ts`:
```typescript
export type FeatureFlagKey =
  | 'SHOW_WELCOME_MODAL'
  | 'ENABLE_DEBUG_MODE'
  | 'YOUR_NEW_FEATURE'  // Add your flag here

export const FEATURE_FLAGS: Record<FeatureFlagKey, FeatureFlagConfig> = {
  YOUR_NEW_FEATURE: {
    key: 'YOUR_NEW_FEATURE',
    label: 'Your New Feature',
    description: 'Enable the new feature you are building',
    defaultValue: false,  // Default state
    category: 'experimental',  // general | debug | experimental
  },
  // ... other flags
}
```

2. **Use the flag** in your component:
```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlags'

function MyComponent() {
  const showNewFeature = useFeatureFlag('YOUR_NEW_FEATURE')

  if (!showNewFeature) return <OldFeature />

  return <NewFeature />
}
```

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

## Future Enhancements

The current system is designed to support:
- **Tenant-level flags:** API-based feature access per tenant
- **User-level flags:** Per-user feature targeting
- **Real-time updates:** SSE for instant flag changes
- **A/B testing:** Variant support for experiments
- **Audit logging:** SOC2-compliant tracking (when `requiresAudit: true`)

When backend API endpoints are ready, the system will automatically support remote flag evaluation while maintaining backward compatibility with the current localStorage-based dev flags.