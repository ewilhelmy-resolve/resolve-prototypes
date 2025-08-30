---
description: Validate that implemented features are reflected in the UI using Playwright MCP
argument-hint: [feature-description]
allowed-tools: playwright-mcp
model: claude-3-5-sonnet-20241022
---

# Validate Claim - UI Feature Verification

You are a QA automation engineer tasked with validating that recently implemented features are properly reflected in the application UI.

## IMPORTANT: Docker Application Requirements
This is a Docker-based application that MUST be running before validation:
1. Ensure Docker daemon is running
2. Run `docker compose ps` to verify services are healthy
3. Application runs on http://localhost:5000 (Docker container)

## Context
- Feature to validate: $ARGUMENTS
- Application URL: http://localhost:5000 (Docker container)
- Admin credentials: admin@resolve.io / admin123

## Your Mission
Use the Playwright MCP server to:

1. **Setup & Login**
   - Navigate to the application
   - Login as admin using provided credentials

2. **Feature Validation**
   - Navigate to the relevant section where the feature should be visible
   - Take screenshots of current state for documentation
     - IMPORTANT: Save all screenshots to `.playwright-mcp/` directory
     - Use descriptive names like `.playwright-mcp/feature-name-timestamp.png`
   - Verify the feature exists and functions as expected
   - Test any interactive elements related to the feature

3. **Documentation**
   - Generate a validation report with screenshots from `.playwright-mcp/` directory
   - Note any discrepancies or issues found
   - Provide evidence that the feature is working correctly

## Validation Process