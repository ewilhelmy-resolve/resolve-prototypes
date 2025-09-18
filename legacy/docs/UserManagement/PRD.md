# User Management PRD (Tenant‑Scoped)

## 1. Overview
Create a new User Management page that mirrors the styling and UX patterns of the existing Knowledge page. This page enables tenant administrators to manage users within their tenant: add/invite users, edit roles, enable/disable, delete users, and trigger password resets. Non-admin users cannot access this page.

Constraints and repo-aligned assumptions:
- We perform E2E/integration tests only (no unit tests).
- No email eventing system exists. Password resets must produce a link/token to copy/share or leverage the auth provider’s reset-link generation without sending email.
- A Knowledge system and Share flow already exist. The tenant admin uses the Share flow to add other users to the tenant.
- No feature flag system is in place.

## 2. Goals and Non‑Goals
### Goals
- Provide an admin-only Users page with a grid for listing and managing tenant users.
- Support adding/inviting users to the tenant, editing roles, enabling/disabling, deleting users.
- Support triggering password reset links without sending emails.
- Reuse Knowledge page look-and-feel, layout, toolbar, grid, modals, toasts.
- Reuse existing Share flow for tenant-scoped invites.

### Non‑Goals
- Implementing or integrating an email delivery system.
- Changing Knowledge system behavior beyond necessary role alignment.
- Introducing feature flags.
- Adding unit test infrastructure.

## 3. Roles and Permissions (RBAC)
- Role: "tenant-admin"
  - Access the Users page.
  - Add/invite users to the tenant via Share flow.
  - Edit user attributes (name, role, status), enable/disable users, delete users.
  - Trigger password reset links for any user in the tenant.
  - Manage knowledge: add and delete knowledge articles.
- Role: "user"
  - Cannot access Users page.
  - Can add new knowledge content (existing capability).
  - Cannot add/edit/delete users or trigger password resets.

Safeguards:
- Prevent deleting oneself.
- Prevent deleting the last tenant admin within a tenant.
- All actions must be tenant scoped.

## 4. Information Architecture and Navigation
- Route (Pages Router): `pages/[tenantId]/users.tsx` (no `/tenants/` slug in the path).
- Locate Users page adjacent to the Knowledge page (e.g., `pages/[tenantId]/knowledge.tsx`).
- Navigation: Add a "Users" entry in the same nav group as Knowledge; render only for tenant admins.
- Authorization: Reuse Knowledge page’s server/client guards for role checks and tenant scoping.

## 5. UI/UX Requirements (mirror Knowledge page)
- Page header: Title "Users" with the same breadcrumb and header layout as Knowledge.
- Toolbar: Reuse Knowledge components and spacing.
  - Search: by name and email (debounced, URL-synced).
  - Filters: Role (Tenant Admin/User), Status (Active/Invited/Disabled).
  - Primary action: "Add User" (admin only). Also surface an "Invite/Share Tenant" button to open the Share flow.
- Grid (paginated, sortable, filterable):
  - Columns: Name, Email, Role, Status, Last Login, Created, Actions.
  - Row actions (admin only): Edit, Reset Password, Disable/Enable, Delete.
  - Bulk actions (admin only): Reset Password, Disable/Enable, Delete.
- Modals (reuse modal components used by Knowledge):
  - Add/Edit User: form with validation and role selection.
  - Confirm Delete: requires explicit confirmation.
  - Reset Password: shows generated link with copy-to-clipboard and warning about expiry.
- Feedback: Reuse toast/notification patterns from Knowledge for success/error.
- Empty state: Mirror Knowledge empty state patterns with CTA to add/invite users.

## 6. Data Model
User (tenant scoped):
- `id` (string/UUID)
- `tenantId` (string)
- `name` (string)
- `email` (string; unique within `tenantId`)
- `role` (enum: `tenant-admin` | `user`)
- `status` (enum: `active` | `invited` | `disabled`)
- `lastLoginAt` (datetime | null)
- `createdAt` (datetime)
- `updatedAt` (datetime)

Validation:
- `name`: required, min/max length.
- `email`: required, valid format, unique per tenant.
- `role`: required, constrained to allowed values.

## 7. API Contracts (tenant-scoped)
All endpoints enforce tenant scoping and RBAC server-side.

- `GET /api/tenants/:tenantId/users` (adjust to existing API prefixing if different)
  - Query: `q`, `role`, `status`, `page`, `pageSize`, `sort` (field+direction).
  - Returns: `{ data: User[], page, pageSize, total }`.

- `POST /api/tenants/:tenantId/users` (tenant-admin only)
  - Body: `{ name, email, role, invite?: boolean }`.
  - Behavior: Creates user in `invited` or `active` status. If `invite` and no email system, returns a reset/activation link.
  - Returns: `{ user: User, resetLink?: string }`.

- `PATCH /api/tenants/:tenantId/users/:id` (tenant-admin only)
  - Body: Partial `{ name?, role?, status? }` (cannot change `email`).
  - Returns: `{ user: User }`.

- `DELETE /api/tenants/:tenantId/users/:id` (tenant-admin only)
  - Safeguards: cannot delete self; cannot delete last tenant admin.
  - Returns: `{ ok: true }`.

- `POST /api/tenants/:tenantId/users/:id/reset-password` (tenant-admin only)
  - Behavior: Generates reset link (one-time/short-lived) and returns it. No email is sent.
  - Returns: `{ resetLink: string, expiresAt: string }`.

Notes:
- If your existing API uses `GET /api/[tenantId]/...` instead of the `/tenants/` prefix, align these endpoints accordingly.
- If using a hosted auth provider, prefer its reset-link API (without sending an email) and return the URL directly.
- If custom auth, create a token row with expiry, render a reset page that verifies token and sets a new password.

## 8. Share-Based Tenant Invite Flow
- Reuse the Share component/flow used on the Knowledge page.
- Add/enable a "tenant scope" mode so the Share dialog targets the tenant, not a single resource.
- From Users page, clicking "Invite/Share Tenant":
  1) Open Share dialog with tenant scope pre-selected.
  2) Allow adding emails and selecting role (`tenant-admin` or `user`).
  3) On submit, create user(s) in `invited` status and generate a reset/activation link per invitee.
  4) Show the link(s) inline with a "Copy" control. Post success toast; refresh Users grid.

## 9. Password Reset (No Email Eventing)
- Reset action (row/bulk) opens a modal and calls the reset endpoint.
- Display the returned link and expiry; provide copy-to-clipboard and "Open link" actions.
- If provider returns a hosted URL, surface it directly; otherwise use an internal `/auth/reset?token=...` route.

## 10. Client State and URL Behavior
- Use the same client data layer as Knowledge (e.g., React Query/SWR): list queries + mutations.
- Debounced search; URL-synced filters, sort, and pagination as per Knowledge.
- Optimistic updates only if used in Knowledge; otherwise refetch on success.

## 11. Security and Compliance
- Server-side RBAC and tenant scoping for every endpoint.
- Prevent privilege escalation: only tenant-admin may assign `tenant-admin` role.
- Self-protection: prevent self-deletion; prevent last-admin deletion.
- Rate-limit sensitive actions (reset, delete) consistent with existing patterns.
- Audit log (if present): log actor, target user, action, timestamp.

## 12. Edge Cases and Constraints
- Large tenants: paginate server-side; limit page size; debounce search.
- Email uniqueness: enforce per-tenant. If a user exists in another tenant, allow invite for multi-tenant membership if your model supports it; otherwise show conflict.
- Invite acceptance: if links expire, allow generating a new link.
- Disabled users: cannot log in; show disabled state in grid.

## 13. E2E Test Plan (only integration tests)
Scenarios (tenant-admin):
- Navigation: Users page appears for tenant-admin; hidden for user; direct URL is blocked for non-admin.
- List: grid loads; pagination, sorting, filtering, and search work.
- Add User: open Add or Share-based invite; create invited user; link displayed; grid shows `invited` status.
- Edit User: change `name` and `role`; verify reflected in grid.
- Enable/Disable: toggle status; verify change.
- Reset Password: generate link; copy; success toast.
- Delete: confirm delete; user removed. Safeguards enforced (cannot delete self/last admin).

Scenarios (non-admin user):
- Users nav item does not show; direct URL returns not-authorized state.

Technical notes:
- Use existing E2E framework (e.g., Playwright/Cypress) and test helpers.
- Test data seeding: reuse existing patterns to create a tenant, tenant-admin, and a few users/knowledge items.

## 14. Analytics and Telemetry (optional)
- Track: add user, edit user, reset link generated, delete user, filter/search usage.
- Respect existing analytics implementation; no new vendor integrations required.

## 15. Rollout and Operations
- No feature flagging.
- Backward compatible with current auth and knowledge systems.
- Minimal migrations: user table uniqueness and any reset-token storage if using custom auth.
- Documentation: add Admin Guide for user management and reset links.

## 16. Acceptance Criteria
- Tenant-admins can fully manage users within their tenant using the new page.
- UI matches the Knowledge page styling and interaction patterns.
- Reset password flow functions without email; links are generated and usable.
- Non-admin users cannot access or see the Users page.
- E2E test suite covers the scenarios listed above and passes in CI.

## 17. Open Questions
- Exact path and component names for the Knowledge page and shared components (layout, grid, toolbar, modal, toast)?
- Share component path and whether a "tenant scope" mode already exists or needs a prop.
- Auth provider details: hosted vs. custom; supported API for generating reset links without email?
- Does the data model allow a person to belong to multiple tenants with the same email? If yes, how are conflicts handled?
- Do we need CSV export on Users grid (if available on Knowledge)?

