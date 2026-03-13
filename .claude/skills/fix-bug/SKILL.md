---
name: fix-bug
description: TDD-driven bug fix workflow. Reproduces bugs with a failing test, finds the root cause, implements a minimal fix, and verifies with the full test suite. Use this skill whenever the user reports something broken, not working, a regression, unexpected behavior, an error, a crash, or asks to fix, debug, or reproduce a bug — even if they don't explicitly say "bug". Also triggers on "this used to work", "why is this failing", or error messages pasted directly.
---

# Fix Bug (TDD Workflow)

Reproduce, diagnose, and fix bugs using test-driven development. Only report back after a verified fix or after exhausting retry attempts — no partial solutions.

## Input

The user describes a bug. Extract:
- **Symptoms**: what's happening vs. what should happen
- **Location**: which package/component/endpoint is affected
- **Reproduction steps**: if provided (user message, error logs, stack traces)

## Step 1: Identify the Affected Package

Determine whether the bug is in `packages/client/` or `packages/api-server/` (or both):

| Package | Single test | Full suite |
|---------|------------|------------|
| Client | `pnpm --filter rita-client test:unit -- <path>` | `pnpm --filter rita-client test:unit` |
| API Server | `pnpm --filter rita-api-server test:run -- <path>` | `pnpm --filter rita-api-server test:run` |

If the bug spans both packages, start with the package where the root cause likely lives (usually API server for data bugs, client for UI bugs). Fix and verify there first, then address the other package if needed.

## Step 2: Investigate Context

Before writing any code, gather context:

1. **Search for related source files** using Glob and Grep — find the function, component, or endpoint involved
2. **Read the source code** and its dependencies to understand the current behavior
3. **Check existing tests** — there may already be tests covering adjacent behavior that give clues
4. **Check recent changes** — use `git log --oneline -10 -- <file>` on suspicious files to see if a recent commit introduced the bug
5. **Read error messages / stack traces** the user provided — trace them back to specific lines

Understand the code thoroughly before proceeding.

## Step 3: Write a Failing Test

Create a test that reproduces the exact bug. Place it following RITA conventions:

- Client: `<SourceFile>.test.tsx` next to `<SourceFile>.tsx`
- API Server: `<SourceFile>.test.ts` next to `<SourceFile>.ts`

If a test file already exists for that source file, add a new `it()` block inside the existing `describe()`. Do NOT create a duplicate test file.

The test must:
- Describe the bug in the test name (e.g., `it("returns empty array when cluster_id is null")`)
- Assert the **correct** behavior so it fails against the current buggy code
- Be minimal — only test the specific bug

### When a unit test can't reproduce the bug

Some bugs (race conditions, timing issues, infrastructure problems) resist unit testing. If after a genuine attempt you cannot write a meaningful failing test:
1. Document why the bug isn't unit-testable
2. Proceed directly to root cause analysis (Step 5)
3. After fixing, write a test that validates the fix works — even if it couldn't have caught the original bug, it prevents regression

## Step 4: Confirm Test Fails

Run only the new test file:

```bash
pnpm --filter rita-client test:unit -- <path-to-test-file>
# or
pnpm --filter rita-api-server test:run -- <path-to-test-file>
```

If the test passes, the test doesn't reproduce the bug. Revise and re-run. Do not proceed until the test fails for the right reason.

## Step 5: Analyze Root Cause

Trace through the code path that causes the bug:
- Read the failing function/component and its dependencies
- Identify the exact line(s) where the incorrect behavior originates
- Understand **why** it fails, not just **where**

## Step 6: Implement the Fix

Apply the minimal change that corrects the root cause:
- Fix the bug, nothing else — no drive-by refactors
- Preserve existing behavior for non-buggy paths
- Follow RITA coding conventions (Biome formatting, TypeScript strict, Zod validation at boundaries)

## Step 7: Verify Fix Passes

Run the failing test again:

```bash
pnpm --filter <package> test:unit -- <path-to-test-file>
# or
pnpm --filter <package> test:run -- <path-to-test-file>
```

If the test still fails — go back to Step 6. You have up to **3 attempts** total.

## Step 8: Run Full Suite + Quality Checks

Run the full suite for the affected package plus quality checks:

```bash
# Tests
pnpm --filter rita-client test:unit    # if client affected
pnpm --filter rita-api-server test:run # if API affected

# Type check
pnpm type-check

# Lint
pnpm lint
```

If other tests break or lint/type-check fails — the fix introduced a regression. Go back to Step 6 and adjust. This counts toward the 3-attempt limit.

## Step 9: Report Results

Only after all checks pass, present:

```
### Root Cause
<concise explanation of why the bug occurred>

### Fix
<what was changed and why it resolves the issue>

### Test Results
- Regression test: PASS
- Full suite (<package>): PASS
- Type check: PASS
- Lint: PASS
```

## Retry Policy

If the fix doesn't pass all checks after **3 attempts**, stop and present:
- What was tried
- What's still failing and why
- Suggested next steps or ask the user for guidance

Do NOT keep iterating beyond 3 attempts. Do NOT present a partial fix as complete.

## Guidelines

- **Test first** — never skip the failing test step (unless the bug is genuinely untestable)
- **Minimal fix** — smallest change that fixes the bug
- **No unrelated changes** — don't clean up, refactor, or "improve" surrounding code
- **Existing test files** — add to them, don't create duplicates
- **No AI attribution** — never mention AI/Claude in test names or comments
