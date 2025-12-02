# RITA Documentation

## Quick Start

New to RITA? Read these first:
1. **[Technical Design](core/technical_design.md)** - System overview, multi-tenancy, MVP scope
2. **[Authentication Flow](core/authentication-flow.md)** - Keycloak + cookie auth, signup/invitations
3. **[Database Tables](core/database-tables.md)** - Complete schema w/ ER diagram

## Documentation Structure

### 📘 [core/](core/)
**System fundamentals** - read first
- `technical_design.md` - Architecture overview, multi-tenancy model
- `authentication-flow.md` - Auth system (Keycloak, sessions, invitations)
- `database-tables.md` - Schema reference with ER diagrams
- `MESSAGE_TYPES.md` - Chat message format, metadata structure

### 🏗️ [architecture/](architecture/)
**Infrastructure & integrations**
- `rabbitmq-setup.md` - Message broker, queues, consumers, resilience
- `DATA_SOURCE_CONNECTIONS.md` - External data sources (Confluence, ServiceNow, etc.)
- `file-upload-system.md` - Content-addressable storage, deduplication
- `file-access-control.md` - File permissions & security

### ✨ [features/](features/)
**Feature-specific implementation docs**
- `chat/` - Chat input, reasoning display, turn blocking
- `invitations/` - User invitation system
- `member-management/` - User CRUD, deletion
- `settings/` - Profile store, update flows

### 🎨 [frontend/](frontend/)
**Client/UI documentation**
- `guide_frontend_stack.md` - Vite, React, Tailwind, shadcn/ui setup
- `feature-flags-system.md` - Feature toggles for dev/beta
- `figma-*.md` - Design-to-code workflow

### ⚙️ [setup/](setup/)
**Environment & configuration**
- `KEYCLOAK_SETUP.md` - Identity provider setup
- `keycloak-*.md` - Custom themes, password reset
- `DATABASE_TIPS.md` - DB dev tips
- `STAGING_SECRETS_SETUP.md` - Secrets management
- `email-development-guide.md` - Email templates

### 📦 [archived/](archived/)
**Shipped implementation plans** - historical reference only

### 🚀 [feat-autopilot-ticket-cluster/](feat-autopilot-ticket-cluster/)
**Large feature docs** - autopilot & cluster dashboard technical design

## Finding What You Need

| You want to... | Look here |
|----------------|-----------|
| Understand the system | `core/technical_design.md` |
| Add authentication | `core/authentication-flow.md` |
| Query the database | `core/database-tables.md` |
| Work with messages | `core/MESSAGE_TYPES.md` |
| Set up RabbitMQ | `architecture/rabbitmq-setup.md` |
| Integrate data sources | `architecture/DATA_SOURCE_CONNECTIONS.md` |
| Upload files | `architecture/file-upload-system.md` |
| Build frontend features | `frontend/guide_frontend_stack.md` |
| Configure Keycloak | `setup/KEYCLOAK_SETUP.md` |
| Add feature flags | `frontend/feature-flags-system.md` |

## Contributing to Docs

- **New features**: Add to `features/<feature-name>/`
- **Implementation plans**: Archive after shipping to `archived/`
- **Large features**: Use subdirectory pattern (see `feat-autopilot-ticket-cluster/`)
- **Architecture changes**: Update `core/` or `architecture/` docs
