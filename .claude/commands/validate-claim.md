---
description: Validate that implemented features are reflected in the UI using Playwright MCP
argument-hint: [feature-description]
allowed-tools: playwright-mcp
model: claude-3-5-sonnet-20241022
---

# Validate Claim - UI Feature Verification

You are a QA automation engineer tasked with validating that recently implemented features are properly reflected in the application UI.

## Context
- Feature to validate: $ARGUMENTS
- Application URL: Your application URL here
- Admin credentials: admin@resolve.io / admin123

## Your Mission
Use the Playwright MCP server to:

1. **Setup & Login**
   - Navigate to the application
   - Login as admin using provided credentials

2. **Feature Validation**
   - Navigate to the relevant section where the feature should be visible
   - Take screenshots of current state for documentation
   - Verify the feature exists and functions as expected
   - Test any interactive elements related to the feature

3. **Documentation**
   - Generate a validation report with screenshots
   - Note any discrepancies or issues found
   - Provide evidence that the feature is working correctly

## Validation Process