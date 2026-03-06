<!-- last-commit: f3c5f57f -->
# Changelog

All notable user-facing changes to this project will be documented in this file.

Changes are grouped by release date and category. Only user-facing changes are included — internal refactors, test updates, and CI changes are omitted.

## 2026-02-18

### Added
- Org-level autopilot settings for ITSM source management
- Agents and tickets_log database tables for autopilot

### Fixed
- Iframe chat double scroll issue
- Storybook stories now include QueryClientProvider for autopilot settings
- Autopilot settings_json NOT NULL constraint, updated_by cascade fix

## 2026-02-09 — 2026-02-17

### Added
- Auto-sync toggle for ITSM connections
- Markdown rendering in TextRenderer component
- Inline form request rendering via UI schema
- Ivanti ITSM connection support
- Ticket description field for display
- Cluster page header and ticket settings dialog
- Schema renderer with Storybook stories
- UI schema components: divider, modal, autoOpenModal, reopen button
- Credential delegation: apply_related_connection checkbox
- Credential delegation: public setup page and link-expired page
- Credential delegation: status polling and verification consumer
- Rollbar error tracking for api-server

### Changed
- New ticket design with additional DB fields
- Updated cluster metrics and ticket group card design
- Replaced ValidationConfidenceCard with AutomationReadinessMeter

### Fixed
- Session cookie max-age, name backfill, null org id handling
- Session JWKS and issuer now injectable via DI
- UI form request dismiss behavior across all tiers
- Sidebar console errors and missing stories
- Mobile breakpoint alignment for sidebar visibility
- Cluster cards width on wide screens
- UI form request field type handling (text/textarea)
- Form cancel now dismisses modal without marking as answered
- Credential delegation token hashing in DB
- Migration ordering fixes

## 2026-01-05 — 2026-02-08

### Added
- Credential delegation: ITSM admin invitation UI
- Jira ITSM connection type for ticket sync
- Feature flags system with platform-controlled flags
- i18n translations (en + es-MX) for all major flows: auth, chat, dialogs, tickets, connections, toasts, settings
- Storybook: redesigned examples, added shadcn/ui component stories, deployed to GitHub Pages
- Iframe dev tools with conversation download
- Iframe Valkey-based session management (JIT user provisioning)
- Iframe webhook callback to host on conversation events
- Cluster pagination with Kysely migration
- Cluster skeleton states and training state handling
- RabbitMQ connection resilience in mock-service
- URL validation for data source credentials
- OpenAPI spec drift check in CI

### Changed
- Replaced RITA GO branding with RITA
- Migrated session service to Kysely
- Split ServiceNow KB and ITSM into separate connection records
- Consolidated chat sources with rita-chat-* prefix
- Migrated from npm to pnpm across all packages
- Freshdesk ITSM entry added to connection sources
- Removed 'Jira' label, standardized to 'jira_itsm' throughout codebase
- Caching switched from Redis to lru-cache for feature flags

### Fixed
- Jira connection credential delegation email
- Iframe conversation loss on tab return
- SSE routing: always fetch user_id from conversation
- Duplicate key constraint in JIT user provisioning
- Swagger API documentation completed
- Multiple database migration ordering fixes

## 2025-12-19 — 2026-01-04

### Added
- Storybook initial setup with component stories
- Iframe debug panel and Valkey error logging
- Iframe Valkey hash sessions with rita:session prefix

### Fixed
- Valkey TLS configuration for AWS ElastiCache
- Iframe webhook duplicate calls
- Iframe HTTP Basic auth encoding
- Code block horizontal overflow in narrow containers
