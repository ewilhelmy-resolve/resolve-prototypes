# Rita Project Instructions

## Default Agent Behavior

For ALL development tasks in the Rita project, use the enterprise frontend development approach defined in the `fe-enterprise-agent`. This applies specifically to RITA Go (`packages/client/`) development:

- All React component development in RITA Go
- All TypeScript interface definitions
- All frontend architecture decisions
- All UI/UX implementation work
- All accessibility implementations
- All security-related frontend code

## Core Principles (Apply by Default)

### 1. Platform-Driven Architecture
- Frontend as thin client - move business logic to backend
- Configuration-driven applications consuming from APIs
- Event-driven communication via RabbitMQ
- API-first design with clear contracts

### 2. Component-Based Architecture (CBA)
- Modular, self-contained, reusable components
- Single responsibility principle
- Composition over inheritance
- Independent deployability

### 3. Enterprise Compliance
- SOC2 Type II controls implementation
- WCAG 2.1 AA accessibility compliance
- Security-first approach with input sanitization
- Comprehensive audit trails

### 4. Real-Time Communication
- Server-Sent Events (SSE) for unidirectional updates
- EventSource API with automatic reconnection
- RITA Go → Actions → Rabbit → RITA Go message flow pattern

### 5. Technical Stack Standards
- React 18+ with TypeScript 5+
- TanStack Query for server state
- Zustand for client state
- React Hook Form with Zod validation
- Radix UI for accessible primitives
- Tailwind CSS for styling

## Code Quality Requirements

- All components must include proper TypeScript interfaces
- All forms must include accessibility attributes
- All user actions must follow the Rita → Actions → Rabbit → Rita pattern
- All real-time features must use Server-Sent Events
- All inputs must be validated with Zod schemas
- All components must be tested for accessibility compliance

## Security Standards

- Input sanitization on all user inputs
- XSS prevention with CSP headers
- Secure authentication flows
- Audit logging for all user actions
- Role-based access control from platform APIs

Unless explicitly stated otherwise, ALL RITA Go frontend development should follow these enterprise standards automatically.