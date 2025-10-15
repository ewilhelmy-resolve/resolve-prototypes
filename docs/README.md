# Rita Project Documentation

This directory contains all documentation for the Rita project, organized using a lifecycle-based archiving strategy.

## Documentation Structure

```
docs/
├── active/           # In-progress features and active bugs
│   ├── features/     # Features currently being developed
│   └── bugs/         # Known bugs being tracked
├── v1/               # Production-ready documentation (v1.x releases)
│   ├── architecture/ # System architecture and design decisions
│   ├── setup/        # Setup and configuration guides
│   └── guides/       # Developer guides and workflows
└── archived/         # Deprecated documentation
    └── deprecated/   # Features/docs no longer relevant
```

## Quick Navigation

### Architecture (v1/architecture/)
- [Authentication Flow](v1/architecture/authentication-flow.md) - Keycloak SSO integration
- [Technical Design](v1/architecture/technical_design.md) - Overall system design
- [Message Types](v1/architecture/MESSAGE_TYPES.md) - SSE message type definitions
- [Blobbifier Migration Plan](v1/architecture/blobbifier-migration-plan.md) - Content-addressable storage migration

### Setup & Configuration (v1/setup/)
- [Keycloak Setup](v1/setup/KEYCLOAK_SETUP.md) - Authentication server configuration
- [Staging Secrets](v1/setup/STAGING_SECRETS_SETUP.md) - Production environment secrets
- [Database Tips](v1/setup/DATABASE_TIPS.md) - PostgreSQL best practices
- [Mock Service Validation](v1/setup/mock_service_validation.md) - Testing with mock services

### Developer Guides (v1/guides/)
- [Frontend Stack Guide](v1/guides/guide_frontend_stack.md) - React/TypeScript/TanStack Query
- [Figma to React Workflow](v1/guides/figma_to_react_workflow.md) - Design-to-code process
- [Figma to Code Process](v1/guides/figma-to-code-process.md) - Component generation with shadcn/ui

### Active Features (active/features/)
- [Data Source Connections](active/features/DATA_SOURCE_CONNECTIONS.md) - External data integration
- [Data Source Implementation](active/features/DATA_SOURCE_CONNECTIONS_IMPLEMENTATION.md) - Implementation details
- [File Upload System](active/features/file-upload-system.md) - Document upload and storage
- [User Invitation System](active/features/user-invitation-system.md) - Team member invitations
- [Frontend Invitation Plan](active/features/frontend-invitation-implementation-plan.md) - UI implementation
- [Settings Feature](active/features/settings-feature.md) - Application settings
- [Enhanced Chat Components](active/features/enhanced-chat-components.md) - Chat UI improvements
- [Signup Diagram Update](active/features/signup_diagram_update.md) - Registration flow changes

## Documentation Lifecycle

### Active Development (active/)
Documents in this directory track features and bugs currently being worked on. These should be moved to `v1/` or `archived/` once complete.

### Production Documentation (v1/)
Documentation for features and systems that are live in production (v1.x releases). This is the primary reference for how Rita works today.

### Archived (archived/)
Historical documentation for deprecated features, replaced systems, or outdated processes. Kept for reference but not actively maintained.

## Package-Specific Documentation

For package-specific docs, see:
- [API Server Documentation](../packages/api-server/docs/)
- [Client Documentation](../packages/client/docs/)
- [Mock Service Documentation](../packages/mock-service/docs/)

## Contributing

When creating new documentation:

1. **Active Features**: Place in `active/features/` with descriptive filename
2. **Active Bugs**: Place in `active/bugs/` with issue reference
3. **Completed Work**: Move to appropriate `v1/` subdirectory
4. **Deprecated Work**: Move to `archived/deprecated/` with date prefix

### Documentation Template

All documentation should include:

```markdown
# Document Title

**Status**: [Active | Production | Archived]
**Last Updated**: YYYY-MM-DD
**Owner**: [Team/Person]

## Overview
Brief description of what this document covers.

## Content
Main content here.

## Related Documentation
- Link to related docs
```

## AI Assistant Benefits

This structure helps AI assistants (like Claude) by:
- **Clear Context**: Status (active/v1/archived) indicates document relevance
- **Chronological Tracking**: Easy to see evolution of features
- **Reduced Confusion**: No mixing of deprecated and current documentation
- **Better Search**: Organized categories make finding docs faster
- **Version Awareness**: v1/ directory makes it clear what's in production

## Maintenance

Documentation should be reviewed and reorganized:
- **Weekly**: Update active/ docs with latest status
- **After Feature Completion**: Move to v1/
- **After Deprecation**: Move to archived/

For questions about documentation organization, see [CLAUDE.md](../CLAUDE.md).
