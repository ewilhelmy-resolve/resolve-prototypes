---
name: keep-app-fresh
description: Rebuild React app and validate UI in browser. Triggers on "validate the component", "refresh the app", or after code changes.
version: 4.0.0
---

## Workflow

Execute these steps in order:

### 1. Build the Application
```bash
cd /Users/ericawilhelmy/Documents/resolve-onboarding/packages/client && npm run build 2>&1 | tail -50
```
- If build fails, stop and report errors
- If build succeeds, continue

### 2. Get Browser Context
- Call `mcp__claude-in-chrome__tabs_context_mcp` to get available tabs
- If no tabs exist, create one with `mcp__claude-in-chrome__tabs_create_mcp`

### 3. Take Screenshot
- Call `mcp__claude-in-chrome__computer` with action `screenshot`
- Analyze the current UI state

### 4. Check Console Errors
- Call `mcp__claude-in-chrome__read_console_messages` with `onlyErrors: true`
- Note any errors found

### 5. Interactive Validation (if user requests specific component)
- Navigate to the component using clicks/find
- Expand collapsed sections
- Test interactive elements (buttons, modals, inputs)
- Take screenshots at each step

### 6. Report Summary
Provide a concise validation summary:
- Build status (success/fail)
- Console errors (none/list)
- UI state observations
- Any issues found
