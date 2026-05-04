# Epic: Agent Builder — End-to-End Agent Lifecycle

## Vision

Enable non-technical users to create, configure, test, and publish AI agents that resolve real user requests by composing skills, knowledge, and instructions — with a tight feedback loop that ensures quality before going live.

## User Stories

### 1. Create

- As a builder, I can create an agent via guided chat or direct configuration
- As a builder, I can choose an agent type (Answer, Knowledge, Workflow) that determines capabilities
- As a builder, I can set name, description, icon, persona, and guardrails

### 2. Equip with Skills

- As a builder, I can browse and add published skills (workflows) to my agent
- As a builder, when I add skills, instructions auto-populate with skill-specific guidance
- As a workflow author, I can publish a workflow as a skill from the Workflow Designer so it appears in the agent builder

### 3. Configure Instructions

- As a builder, I can write/edit instructions that control agent behavior (role, goal, task, guidelines)
- As a builder, I can define conversation starters and guardrails (topics to avoid)
- As a builder, I can add knowledge sources for RAG-backed agents

### 4. Test & Iterate

- As a builder, I can test my agent in a sandbox chat before publishing
- As a builder, I can rate responses (good/poor) and provide feedback
- As a builder, the system suggests instruction improvements based on my feedback
- As a builder, I can apply suggestions, retest, and repeat until satisfied

### 5. Publish & Manage

- As a builder, I can publish an agent to make it live for real users in my environment
- As a builder, I can see my agent in the agents list with status, skills, and last updated
- As a builder, I can edit a published agent, retest, and republish
- As a builder, I can unpublish or delete an agent

### 6. Agent Matching (downstream)

- As a user, when I submit a request, the platform matches me to the best agent based on my intent and the agent's skills
- As a user, I don't pick an agent — the system routes me automatically

## What Exists Today (Prototype)

- Chat-based + direct config creation flows
- Skill browsing/adding with auto-populated instructions
- Workflow to Skill publish pipeline (JSON + Variable Picker options)
- Test sandbox with rating, feedback, suggestion, and publish
- Agents list with published/draft status
- 3 agent types, icon customization, guardrails, conversation starters

## Gaps / Next Phase

| Gap | Notes |
|-----|-------|
| Real backend | All state is client-side/mock — needs API persistence (agents, skills, published state) |
| Agent matching engine | No runtime routing — needs intent classification to agent selection |
| Skill execution | Skills are metadata only — need actual workflow runtime integration |
| Versioning | No agent version history — need rollback, diff between versions |
| Permissions/RBAC | Anyone can publish — need org-level roles (builder, reviewer, admin) |
| Analytics | No usage/performance tracking — need resolution rate, CSAT, feedback loops |
| Knowledge integration | Knowledge sources are placeholder — need RAG pipeline connection |
| Multi-environment | Publish is global — need dev/staging/prod promotion |
| Collaboration | Single owner — need shared editing, review/approval before publish |
| Templates | Agent templates exist but are static — need org-defined templates |

## Success Metrics

- Time from "new agent" to first publish < 15 min
- Test to publish cycle requires < 3 iterations on average
- 80%+ of published agents have skills attached (not just instructions)
- Agent match accuracy > 90% for top-5 intent categories
