---
name: fix-bug
description: TDD-driven bug fix workflow. Reproduces the bug with a failing test, finds the root cause, implements a fix, and verifies with the full test suite — all autonomously. Trigger on any bug fix, reproduce bug, fix this bug, or TDD fix task.
---

# Fix Bug (TDD Workflow)

Reproduce, diagnose, and fix bugs using test-driven development. Do NOT present partial solutions — only report back after a verified fix or after exhausting retry attempts.

## Input

The user describes a bug. Extract:
- **Symptoms**: what's happening vs. what should happen
- **Location**: which package/component/endpoint is affected
- **Reproduction steps**: if provided

## Step 1: Identify the Affected Package

Determine whether the bug is in `packages/client/` or `packages/api-server/` (or both). This determines which test commands to use:

| Package | Single test file | Full suite |
|---------|-----------------|------------|
| Client | `pnpm --filter rita-client test:unit -- <path>` | `pnpm --filter rita-client test:unit` |
| API Server | `pnpm --filter rita-api-server test:run -- <path>` | `pnpm --filter rita-api-server test:run` |

## Step 2: Locate Relevant Source Files

Search for the code related to the bug:

```bash
# Find related files
```

Read and understand the relevant source files, existing tests, types, and dependencies **before writing any code**.

## Step 3: Write a Failing Test

Create a test that reproduces the exact bug. Place it alongside the source file following RITA conventions:

- Client: `<SourceFile>.test.tsx` next to `<SourceFile>.tsx`
- API Server: `<SourceFile>.test.ts` next to `<SourceFile>.ts`

If a test file already exists, add a new `it()` block inside the existing `describe()`. Do NOT create a duplicate test file.

The test must:
- Describe the bug in the test name (e.g., `it("does not crash when user is null")`)
- Assert the **correct** behavior (so it fails against the current buggy code)
- Be minimal — only test the specific bug, not unrelated behavior

## Step 4: Confirm Test Fails

Run only the new test file to confirm it fails as expected:

```bash
# Client example
pnpm --filter rita-client test:unit -- <path-to-test-file>

# API Server example
pnpm --filter rita-api-server test:run -- <path-to-test-file>
```

**If the test passes** — the test doesn't reproduce the bug. Revise the test and re-run. Do not proceed until the test fails for the right reason.

## Step 5: Analyze Root Cause

Trace through the code path that causes the bug:
- Read the failing function/component and its dependencies
- Identify the exact line(s) where the incorrect behavior originates
- Understand **why** it fails, not just **where**

Document the root cause internally before implementing a fix.

## Step 6: Implement the Fix

Apply the minimal change that corrects the root cause. Principles:
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

**If the test still fails** — go back to Step 6. You have up to **3 attempts** total.

## Step 8: Run Full Test Suite

Run the full suite for the affected package to check for regressions:

```bash
# Client
pnpm --filter rita-client test:unit

# API Server
pnpm --filter rita-api-server test:run
```

Also run type checking:

```bash
pnpm type-check
```

**If other tests break** — the fix introduced a regression. Go back to Step 6 and adjust. This counts toward the 3-attempt limit.

## Step 9: Report Results

Only after all tests pass, present the user with:

1. **Root cause**: what was wrong and why
2. **Fix summary**: what changed (files and logic)
3. **Test results**: confirmation that the new test passes and full suite is green

Format:

```
### Root Cause
<concise explanation of why the bug occurred>

### Fix
<what was changed and why it resolves the issue>

### Test Results
- Regression test: PASS
- Full suite (<package>): PASS
- Type check: PASS
```

## Retry Policy

If the fix doesn't pass all tests after **3 attempts**, stop and present:
- What was tried
- What's still failing and why
- Ask the user for guidance

Do NOT keep iterating beyond 3 attempts. Do NOT present a partial fix as complete.

## Guidelines

- **Test first** — never skip the failing test step
- **Minimal fix** — smallest change that fixes the bug
- **No unrelated changes** — don't clean up, refactor, or "improve" surrounding code
- **Existing test files** — add to them, don't create duplicates
- **No AI attribution** — never mention AI/Claude in test names or comments
