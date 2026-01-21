# ServiceNow Credential Sync Plan

## Overview

Allow users to optionally sync credentials between ServiceNow KB and ITSM connections via a checkbox on the configuration form. One-time copy, connections remain independent after.

## Requirements

- Checkbox on both ServiceNow KB and ITSM forms
- Label: "Also apply to [Knowledge Base|ITSM] connection"
- Placement: Above Connect button
- Default: Unchecked
- Always visible (both connections seeded together)
- One-time copy (no ongoing sync)
- Overwrites existing credentials if other connection already configured
- Only syncs credentials: `instance_url`, `username`, `password`

## Technical Design

### API Contract

**Verify endpoint request** - add optional field:

```typescript
interface VerifyDataSourceRequest {
  // existing fields...
  instance_url: string;
  username: string;
  password: string;
  // new field
  apply_to_related?: boolean;
}
```

**Backend behavior when `apply_to_related: true`:**
1. Lookup other ServiceNow connection by `organization_id` + type (`servicenow` ↔ `servicenow_itsm`)
2. Make 2 parallel webhook verify calls
3. Update both `data_source_connections` rows with credentials
4. Return combined result

### Frontend Changes

**Files:**
- `packages/client/src/components/connection-sources/connection-forms/ServiceNowForm.tsx`
- `packages/client/src/hooks/useDataSources.ts`
- `packages/client/src/i18n/locales/en/connections.json`

**ServiceNowForm.tsx:**
```tsx
// Add state
const [applyToRelated, setApplyToRelated] = useState(false);

// Add checkbox above Connect button
<div className="flex items-center gap-2">
  <Checkbox
    id="apply-to-related"
    checked={applyToRelated}
    onCheckedChange={setApplyToRelated}
  />
  <Label htmlFor="apply-to-related">
    {t("servicenow.applyToRelated", { 
      target: mode === "itsm" ? t("knowledgeBase") : t("itsm") 
    })}
  </Label>
</div>

// Pass to mutation
verifyMutation.mutate({
  ...formData,
  apply_to_related: applyToRelated,
});
```

**useDataSources.ts:**
```typescript
// Update verify mutation payload type
interface VerifyPayload {
  // existing...
  apply_to_related?: boolean;
}
```

**connections.json:**
```json
{
  "servicenow": {
    "applyToRelated": "Also apply credentials to {{target}} connection",
    "knowledgeBase": "Knowledge Base",
    "itsm": "ITSM"
  }
}
```

### Backend Changes

**Files:**
- `packages/api-server/src/routes/data-sources.ts`
- `packages/api-server/src/services/data-source-service.ts`

**Verify endpoint:**
```typescript
// 1. Validate apply_to_related field in request body
const { apply_to_related, ...credentials } = req.body;

// 2. If true, allow only servicenow/servicenow_itsm
if (apply_to_related) {
  if (sourceType !== 'servicenow' && sourceType !== 'servicenow_itsm') {
    throw new BadRequestError('apply_to_related only for ServiceNow types');
  }
}

// 3. If true, find related connection (1:1 per org per type)
if (apply_to_related) {
  const relatedType = sourceType === 'servicenow' ? 'servicenow_itsm' : 'servicenow';
  // Simple lookup: org + type, no other conditions (enabled status, instance_url match, etc.)
  const relatedConnection = await db.query(`
    SELECT * FROM data_source_connections 
    WHERE organization_id = $1 AND type = $2 
    LIMIT 1
  `, [orgId, relatedType]);
  
  // 4. Parallel verify calls
  const [primaryResult, relatedResult] = await Promise.all([
    verifyCredentials(sourceId, credentials),
    relatedConnection 
      ? verifyCredentials(relatedConnection.id, credentials)
      : Promise.resolve(null),
  ]);
  
  // 5. Update primary after verify
  await updateConnectionCredentials(sourceId, credentials);

  // 6. Update related only if verify succeeded
  if (relatedConnection && relatedResult) {
    await updateConnectionCredentials(relatedConnection.id, credentials);
  }
}
```

## Related Connection Lookup

**Logic:** 1:1 per org per type, simple lookup by `organization_id` + `type`

- If current type is `servicenow` → lookup `servicenow_itsm`
- If current type is `servicenow_itsm` → lookup `servicenow`
- No matching on `instance_url`, `enabled` status, or other fields
- User explicitly opted in via checkbox

## Error Handling

If primary verifies but related fails:
- Return same response as today (primary success)
- Log warning for related failure
- User can manually configure related if needed
- If no related connection exists, no-op + log info

## Tasks

### Frontend
- [ ] Add `applyToRelated` checkbox to `ServiceNowForm.tsx`
- [ ] Update verify mutation payload in `useDataSources.ts`
- [ ] Add i18n keys for checkbox label
- [ ] Test checkbox appears on both KB and ITSM forms

### Backend
- [ ] Add `apply_to_related` to verify endpoint schema
- [ ] Enforce apply_to_related for ServiceNow types only
- [ ] Implement related connection lookup
- [ ] Implement parallel verification
- [ ] Update primary + related on verify success
- [ ] Add tests for credential sync flow

## Out of Scope

- Ongoing credential sync (one-time only)
- Syncing non-credential settings (spaces, knowledge bases)
- Warning before overwriting existing credentials
- Checkbox visibility based on other connection state
