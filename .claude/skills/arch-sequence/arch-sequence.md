---
name: arch-sequence
description: Generate Mermaid sequence diagrams for system architectures. Use when user asks to create/update architectural diagrams, visualize flows, document system interactions, or design event-driven/REST/async patterns.
---

# Architectural Sequence Diagram Generator

Generate Mermaid sequence diagrams for system architectures.

## Process

1. **Gather context**: Ask concise questions:
    - What actors/components? (client, backend, db, queue, external services)
    - Architecture type? (event-driven, REST, microservices, monolith)
    - Key flow to diagram? (user action → outcome)
    - Async patterns? (queues, webhooks, SSE, polling)
    - Critical UX moments? (when user sees feedback, blocking points)
    - Phase boundaries? (trigger, processing, completion)

2. **Generate diagram** with:
    - Clear participant definitions (rename generic terms to domain-specific)
    - Phase separators using `Note over`
    - Activation blocks for processing
    - Async arrows (`--)`) for events/SSE
    - Loops/conditionals where needed
    - `critical` or `rect` blocks to highlight key UX moments
    - Annotations for complex logic
    - Autonumbering for reference

3. **Pattern templates**:

   **Event-Driven:**
   ```
   User → Client → Backend → Queue → Worker → DB
   Worker --) Client (SSE/webhook notification)
   ```

   **REST API:**
   ```
   User → Client → API → Service → DB
   API -->> Client (response)
   ```

   **Async Enrichment:**
   ```
   Core data → UI unlock → Background processing → Progressive updates
   ```

4. **Best practices**:
    - Use domain-specific actor names (not generic "System")
    - Mark transactions with activate/deactivate
    - Show "unlock" moments (when user can continue)
    - Separate fast/slow operations into phases
    - Include error paths if relevant
    - Add notes explaining "why" for complex flows

5. **Iterate**: After generating, ask:
    - Missing actors/flows?
    - Edge cases to show?
    - Refinements needed?

## Output

Provide:
1. Mermaid sequence diagram code block
2. Brief explanation of key design decisions
3. Questions for refinement (if any)

Start by asking clarifying questions about the system.
