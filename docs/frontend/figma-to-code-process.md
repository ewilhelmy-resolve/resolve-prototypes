# Figma-to-Code Integration Process

**RITA Go Frontend Development**

This document outlines the complete process for integrating Figma designs into the RITA Go codebase using v0.app and shadcn/ui tooling.

---

## Table of Contents

1. [Overview](#overview)
2. [Workflow Summary](#workflow-summary)
3. [Detailed Step-by-Step Process](#detailed-step-by-step-process)
4. [Common Issues & Solutions](#common-issues--solutions)
5. [Layout Integration Checklist](#layout-integration-checklist)
6. [Code Examples](#code-examples)
7. [Lessons Learned](#lessons-learned)

---

## Overview

### Design-to-Code Pipeline

```
Figma Design → v0.app Generation → shadcn CLI → Code Adaptation → Rita Integration
```

**Key Tools:**
- **Figma**: Source of truth for UX designs
- **v0.app**: AI-powered design-to-code generation (by Vercel)
- **shadcn/ui**: Component library CLI that copies code into your source tree
- **React Router**: Rita uses React Router (not Next.js)
- **Rita Hooks**: Custom hooks for auth, SSE, conversations, etc.

**Important Philosophy:**
- v0.app/shadcn components are **starting templates**, not dependencies
- Code is **copied into your source tree** (not installed as npm packages)
- Full customization ownership (you fork and own the code)
- Updates require manual CLI regeneration and merge

---

## Workflow Summary

### Quick Process (TL;DR)

1. **Receive URL from UX** (Figma-to-shadcn or v0.app link)
2. **Commit current state** (`git add . && git commit`)
3. **Run shadcn CLI** (`yes n | npx shadcn@latest add [url]`)
4. **Extract & clean up** (move UI components, delete wrong directories)
5. **Adapt for Rita** (remove Next.js, add Rita hooks, test SSE)
6. **Test layout integration** (width, scroll, truncation, responsiveness)
7. **Test production build** (`npm run build && npm run preview`)
8. **Commit with documentation** (include source URL in commit message)

---

## Detailed Step-by-Step Process

### Phase 1: Pre-Installation

#### 1.1 Receive Component URL from UX

UX team will provide one of these URL types:

```
# v0.app component
https://v0.app/chat/b/[component-id]

# Figma-to-shadcn export
https://rdhlrr8yducbb6dq.public.blob.vercel-storage.com/figma-to-shadcn/[ComponentName]-[hash].json

# shadcn registry component
npx shadcn@latest add button card dialog
```

#### 1.2 Create Safety Checkpoint

```bash
# Commit all current changes
git add .
git commit -m "feat: checkpoint before [ComponentName] integration"

# If updating existing component, create diff backup
git diff HEAD -- src/components/layouts/RitaLayout.tsx > ritalayout-customizations.patch
```

**Why?** The CLI may overwrite files, and you need a way to recover customizations.

---

### Phase 2: CLI Installation

#### 2.1 Run shadcn CLI

```bash
cd packages/client

# For v0.app/Figma components (use 'yes n' to prevent overwrites)
yes n | npx shadcn@latest add "https://v0.app/chat/b/[component-id]"

# For standard shadcn components
npx shadcn@latest add button card dialog
```

**What the CLI does:**
- ✅ Downloads component definition
- ✅ Generates React/TypeScript code
- ✅ Installs npm dependencies (if needed)
- ✅ Updates CSS variables in `src/index.css`
- ⚠️  **May place files in wrong location** (`packages/client/ui/` instead of `src/components/ui/`)
- ✅ Creates high-level components (e.g., `Dashboard.tsx`, `ShareModal.tsx`)

#### 2.2 Verify What Was Created

```bash
# Check for incorrectly placed ui/ directory
ls -la ui/

# Check what components were created
ls -la src/components/

# Check git status
git status --short
```

**Expected Output:**
```
# Incorrect location (CLI bug)
ui/sidebar.tsx
ui/button.tsx

# High-level components (correct location)
src/components/Dashboard.tsx
src/components/ShareModal.tsx

# Dependency changes
M  package.json
M  package-lock.json
M  src/index.css
```

---

### Phase 3: Post-Installation Cleanup

#### 3.1 Extract UI Components to Correct Location

```bash
# Check if ui/ directory exists in wrong location
if [ -d "ui" ]; then
  # Move any NEW components to correct location
  # (Only move files that don't already exist in src/components/ui/)

  # Example: If sidebar.tsx is new
  cp ui/sidebar.tsx src/components/ui/sidebar.tsx

  # Delete the incorrectly placed directory
  rm -rf ui/
fi
```

**Guideline:** Only copy files that are **new** or that you explicitly want to update. Don't blindly copy everything.

#### 3.2 Verify Component Locations

```bash
# UI primitives should be here
ls src/components/ui/

# High-level layouts/pages should be here
ls src/components/layouts/
ls src/components/

# Verify no orphaned ui/ directory
! [ -d "ui" ] && echo "✓ Cleanup complete"
```

---

### Phase 4: Adapt for Rita

#### 4.1 Create Rita-Specific Version

For high-level components (like layouts), create a Rita-adapted version:

```bash
# Keep original as reference
mv src/components/Dashboard.tsx src/components/Dashboard.reference.tsx

# Create Rita-adapted version
touch src/components/layouts/RitaLayout.tsx
```

#### 4.2 Remove Next.js Dependencies

**Find and replace:**

```tsx
// BEFORE (v0.app output)
"use client"
import Image from "next/image"
import { useRouter } from "next/navigation"
import Link from "next/link"

// AFTER (Rita version)
// Remove "use client" directive entirely
import { useNavigate, Link } from "react-router-dom"

// Replace Next.js Image with standard img
<Image src="/logo.svg" alt="Logo" width={100} height={50} />
// becomes:
<img src="/logo-rita.svg" alt="Rita Logo" width={100} height={50} className="w-[100px] h-[50px]" />

// Replace Next.js routing
const router = useRouter()
router.push('/dashboard')
// becomes:
const navigate = useNavigate()
navigate('/chat')
```

#### 4.3 Integrate Rita Hooks

```tsx
import { useAuth } from '@/hooks/useAuth'
import { useConversations } from '@/hooks/api/useConversations'
import { useChatNavigation } from '@/hooks/useChatNavigation'
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase'

function RitaLayout({ children }: RitaLayoutProps) {
  // Authentication
  const { user, logout } = useAuth()

  // Conversations
  const { data: conversationsData, isLoading: conversationsLoading } = useConversations()
  const conversations = conversationsData || []

  // Navigation
  const { handleNewChat, handleConversationClick, currentConversationId } = useChatNavigation()

  // Knowledge Base
  const {
    files: knowledgeBaseFiles,
    filesLoading,
    totalFiles,
    openDocumentSelector,
    handleDocumentUpload,
    documentInputRef,
  } = useKnowledgeBase()

  // ... use these in your layout
}
```

#### 4.4 Add TypeScript Types

```tsx
export interface RitaLayoutProps {
  children: React.ReactNode
  /** Current active page for navigation highlighting */
  activePage?: "chat" | "files" | "automations" | "tickets" | "users"
}
```

---

### Phase 5: Layout Integration & Testing

#### 5.1 Critical Layout Fixes

Based on lessons learned from RitaLayout integration, apply these fixes:

**1. Sidebar Width Management**

```tsx
// Add max-width constraint to Sidebar
<Sidebar className="bg-sidebar-primary-foreground border-sidebar-border max-w-64">

// Ensure main content offset matches (16rem = 256px = 64 * 4px)
<div className="fixed inset-y-0 right-0 left-0 lg:left-64 flex flex-col overflow-hidden">
```

**2. Text Truncation in Flex Containers**

```tsx
// Add min-w-0 to force truncation
<SidebarMenuItem className="min-w-0">
  <SidebarMenuButton className="px-2 py-2 h-8 rounded-md text-sm min-w-0">
    <span className="truncate min-w-0">{conversation.title}</span>
  </SidebarMenuButton>
</SidebarMenuItem>
```

**3. Single Scroll Container**

```tsx
// RitaLayout controls scrolling
<main className="flex-1 flex flex-col overflow-y-auto min-w-0 w-full">
  {children}
</main>

// Page components DO NOT have overflow-y-auto
// CORRECT:
<div className="flex flex-col gap-4 px-6 py-6 w-full flex-1">
  {/* content */}
</div>

// INCORRECT:
<div className="flex flex-col gap-4 px-6 py-6 w-full flex-1 overflow-y-auto">
  {/* content */}
</div>
```

**4. Page Component Structure**

```tsx
// Standard page structure
export default function UsersPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Header - fixed height, does not scroll */}
      <div className="flex flex-col gap-2.5 px-6 py-6 border-b border-border flex-shrink-0">
        <h1 className="text-2xl font-normal text-foreground">Users</h1>
      </div>

      {/* Content - fills remaining space, scrolls via parent */}
      <div className="flex flex-col gap-4 px-6 py-6 w-full flex-1">
        {/* Page content here */}
      </div>
    </div>
  )
}
```

#### 5.2 Test Locally

```bash
# Start dev server
npm run dev

# Test checklist:
# - Navigate to all pages (/chat, /users, /content)
# - Test with long conversation titles (50+ characters)
# - Toggle sidebar open/close
# - Resize browser window (mobile, tablet, desktop)
# - Verify no horizontal scroll
# - Verify no double scrollbars
# - Test all interactive elements (buttons, inputs, dropdowns)
```

#### 5.3 Test Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Open http://localhost:4173
# Repeat all tests from 5.2
```

**Why?** Production builds minify CSS and may expose layout issues hidden in dev mode.

---

### Phase 6: Commit & Document

#### 6.1 Create Comprehensive Commit

```bash
git add .
git commit -m "feat: integrate [ComponentName] from v0.app

Source: https://v0.app/chat/b/[component-id]

Changes:
- Added RitaLayout with sidebar navigation
- Integrated Rita authentication hooks
- Connected conversation list with real-time SSE updates
- Added knowledge base panel with file upload
- Replaced Next.js routing with React Router
- Fixed sidebar width constraint (max-w-64)
- Applied min-w-0 for proper text truncation
- Removed nested scroll containers

Tested:
- ✓ Local dev environment
- ✓ Production build
- ✓ All pages (/chat, /users, /content)
- ✓ Long text truncation
- ✓ Responsive design (mobile/desktop)
- ✓ Sidebar toggle functionality

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Common Issues & Solutions

### Issue 1: CLI Places Files in Wrong Location

**Problem:** Files appear in `packages/client/ui/` instead of `src/components/ui/`

**Solution:**
```bash
# Move new components to correct location
cp ui/sidebar.tsx src/components/ui/sidebar.tsx

# Delete incorrect directory
rm -rf ui/

# Verify with git status
git status --short
```

### Issue 2: Content Cut Off on Left Side

**Problem:** Main content overlaps with sidebar or appears cut off

**Root Cause:** Main content `left` offset doesn't match sidebar `width`

**Solution:**
```tsx
// Sidebar width: 16rem (256px)
<Sidebar className="max-w-64">

// Main content offset MUST match: 16rem = 64 * 4px
<div className="lg:left-64">
```

### Issue 3: Long Text Doesn't Truncate

**Problem:** Long conversation titles cause sidebar to expand

**Root Cause:** Flex items need `min-w-0` for truncation to work

**Solution:**
```tsx
<SidebarMenuItem className="min-w-0">
  <SidebarMenuButton className="min-w-0">
    <span className="truncate min-w-0">{title}</span>
  </SidebarMenuButton>
</SidebarMenuItem>
```

### Issue 4: Double Scrollbars

**Problem:** Page has two scrollbars (layout + page component)

**Root Cause:** Both RitaLayout and page component have `overflow-y-auto`

**Solution:** Remove `overflow-y-auto` from page components
```tsx
// BEFORE (incorrect)
<div className="flex flex-col gap-4 px-6 py-6 w-full flex-1 overflow-y-auto">

// AFTER (correct)
<div className="flex flex-col gap-4 px-6 py-6 w-full flex-1">
```

### Issue 5: Works Locally but Breaks in Production

**Problem:** Layout works in dev (`npm run dev`) but breaks in production build

**Root Cause:** CSS optimization exposes underlying issues (width mismatches, nested scrolls)

**Solution:** Always test production builds before deploying
```bash
npm run build
npm run preview
# Test thoroughly at http://localhost:4173
```

### Issue 6: TypeScript Errors After Installation

**Problem:** Import errors like `Cannot find module '@/components/ui/sidebar'`

**Root Cause:** New components not yet indexed by TypeScript

**Solution:**
```bash
# Restart TypeScript server in VS Code
# Command Palette → TypeScript: Restart TS Server

# Or restart entire dev server
npm run dev
```

---

## Layout Integration Checklist

Use this checklist for every v0.app/Figma layout integration:

### Pre-Integration
- [ ] Received URL from UX team
- [ ] Created git checkpoint (`git commit`)
- [ ] Created diff backup (if updating existing component)

### CLI Installation
- [ ] Ran `yes n | npx shadcn@latest add [url]`
- [ ] Verified npm dependencies installed
- [ ] Checked CSS variables updated in `src/index.css`

### Post-Installation
- [ ] Moved UI components to `src/components/ui/`
- [ ] Deleted incorrectly placed `ui/` directory
- [ ] Created `.reference.tsx` file for original output
- [ ] Created Rita-adapted version

### Code Adaptation
- [ ] Removed `"use client"` directive
- [ ] Replaced Next.js `Image` with `<img>`
- [ ] Replaced Next.js routing with React Router
- [ ] Added Rita authentication hooks (`useAuth`)
- [ ] Added Rita conversation hooks (`useConversations`, `useChatNavigation`)
- [ ] Added Rita knowledge base hooks (`useKnowledgeBase`)
- [ ] Added proper TypeScript interfaces
- [ ] Removed all Next.js dependencies

### Layout Fixes
- [ ] Sidebar has `max-w-64` constraint
- [ ] Main content offset matches sidebar width (`lg:left-64`)
- [ ] Added `min-w-0` to flex items with text truncation
- [ ] Removed nested `overflow-y-auto` from page components
- [ ] Page headers have `flex-shrink-0`
- [ ] Page content areas have `flex-1` (no `overflow-y-auto`)

### Testing
- [ ] Tested locally (`npm run dev`)
- [ ] Tested all pages (/chat, /users, /content, /devtools)
- [ ] Tested with long text (50+ character conversation titles)
- [ ] Tested sidebar toggle functionality
- [ ] Tested responsive design (mobile, tablet, desktop)
- [ ] Verified no horizontal scroll
- [ ] Verified no double scrollbars
- [ ] Tested production build (`npm run build && npm run preview`)
- [ ] All tests passed in production build

### Documentation
- [ ] Committed with source URL in message
- [ ] Listed all changes in commit body
- [ ] Marked as tested (local + production)
- [ ] Updated this document with new lessons learned (if applicable)

---

## Code Examples

### Complete RitaLayout Integration Example

```tsx
/**
 * RitaLayout - Adapted v0.app Dashboard layout for Rita
 *
 * Source: https://v0.app/chat/b/[component-id]
 * Adapted for: React Router, Keycloak auth, Rita SSE real-time updates
 */

"use client" // Remove this line for Rita

import { useState } from "react"
import { useNavigate } from "react-router-dom" // Replace Next.js router
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

// Rita hooks
import { useAuth } from "@/hooks/useAuth"
import { useConversations } from "@/hooks/api/useConversations"
import { useChatNavigation } from "@/hooks/useChatNavigation"
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase"

export interface RitaLayoutProps {
  children: React.ReactNode
  activePage?: "chat" | "files" | "users"
}

function RitaLayoutContent({ children, activePage = "chat" }: RitaLayoutProps) {
  const { state } = useSidebar()
  const navigate = useNavigate()

  // Rita hooks
  const { user, logout } = useAuth()
  const { data: conversationsData, isLoading: conversationsLoading } = useConversations()
  const { handleNewChat, handleConversationClick, currentConversationId } = useChatNavigation()
  const {
    files: knowledgeBaseFiles,
    totalFiles: totalKnowledgeBaseFiles,
    openDocumentSelector,
    documentInputRef,
    handleDocumentUpload,
  } = useKnowledgeBase()

  const conversations = conversationsData || []

  return (
    <>
      {/* CRITICAL: Add max-w-64 to prevent expansion */}
      <Sidebar className="bg-sidebar-primary-foreground border-sidebar-border max-w-64">
        <SidebarHeader className="h-[67px] flex items-center justify-start pl-4">
          {/* Replace Next.js Image with standard img */}
          <img src="/logo-rita.svg" alt="Rita Logo" width={179} height={18} className="w-[179px] h-[18px]" />
        </SidebarHeader>

        <SidebarContent className="gap-2">
          <SidebarMenu className="gap-1">
            {conversationsLoading ? (
              <div className="px-2 text-xs text-muted-foreground">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="px-2 text-xs text-muted-foreground">No conversations yet</div>
            ) : (
              conversations.slice(0, 5).map((conversation) => (
                {/* CRITICAL: Add min-w-0 for proper truncation */}
                <SidebarMenuItem key={conversation.id} className="min-w-0">
                  <SidebarMenuButton
                    className="px-2 py-2 h-8 rounded-md text-sm min-w-0"
                    onClick={() => handleConversationClick(conversation.id)}
                    isActive={conversation.id === currentConversationId}
                  >
                    <span className="truncate min-w-0">{conversation.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))
            )}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-2 border-t border-sidebar-border">
          <Button onClick={logout}>Log out</Button>
        </SidebarFooter>
      </Sidebar>

      {/* CRITICAL: Match offset to sidebar width (16rem = 64 * 4px) */}
      <div className="fixed inset-y-0 right-0 left-0 lg:left-64 flex flex-col overflow-hidden">
        <header className="h-[67px] border-b border-border bg-background flex items-center flex-shrink-0">
          <div className="flex items-center gap-2 h-full pl-4">
            <SidebarTrigger className="lg:flex" />
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden min-w-0">
          {/* CRITICAL: Main controls scroll, children do NOT */}
          <main className="flex-1 flex flex-col overflow-y-auto min-w-0 w-full">
            {children}
          </main>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={documentInputRef}
        type="file"
        className="hidden"
        onChange={handleDocumentUpload}
      />
    </>
  )
}

export default function RitaLayout(props: RitaLayoutProps) {
  return (
    <SidebarProvider className="w-screen">
      <RitaLayoutContent {...props} />
    </SidebarProvider>
  )
}
```

### Page Component Example

```tsx
/**
 * UsersPage - User Management Dashboard
 * Integrated with RitaLayout
 */

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus } from "lucide-react"

export default function UsersPage() {
  return (
    {/* CRITICAL: h-full allows flex layout to work */}
    <div className="flex flex-col h-full">
      {/* Header - flex-shrink-0 prevents it from being compressed */}
      <div className="flex flex-col gap-2.5 px-6 py-6 border-b border-border flex-shrink-0">
        <div className="flex justify-between items-center gap-6">
          <h1 className="text-2xl font-normal text-foreground">Users</h1>
          <Button onClick={() => console.log("Add Users")}>
            <Plus className="h-4 w-4" />
            Add Users
          </Button>
        </div>
      </div>

      {/* Content - flex-1 fills remaining space, NO overflow-y-auto */}
      <div className="flex flex-col gap-4 px-6 py-6 w-full flex-1">
        <Card>
          <CardContent className="p-4">
            <p>User content goes here</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

---

## Lessons Learned

### From RitaLayout Integration (January 2025)

**Timeline:** 5 iterations to get layout working correctly in production

1. **Iteration 1**: Sidebar toggle button hidden
   - **Cause**: Main content offset didn't match sidebar width (204px vs 256px)
   - **Fix**: Changed `left-[204px]` to `left-64` (16rem = 256px)

2. **Iteration 2**: Content cut off on left side
   - **Cause**: CSS variable `var(--sidebar-width)` not properly applied in Tailwind
   - **Fix**: Used standard Tailwind class `left-64` instead of CSS variable

3. **Iteration 3**: Sidebar expanded with long text
   - **Cause**: No `max-width` constraint on Sidebar component
   - **Fix**: Added `max-w-64` to Sidebar

4. **Iteration 4**: Text didn't truncate in sidebar
   - **Cause**: Flex items need `min-w-0` for truncation to work
   - **Fix**: Added `min-w-0` to SidebarMenuItem, SidebarMenuButton, and span

5. **Iteration 5**: Double scrollbars and content cut off
   - **Cause**: Nested `overflow-y-auto` on both layout and page components
   - **Fix**: Removed `overflow-y-auto` from all page components

**Key Takeaways:**
- Dev mode hides layout issues; always test production builds
- Flexbox truncation requires `min-w-0` on parent flex items
- Single scroll responsibility principle: layout controls scroll, pages provide content
- Explicit constraints (`max-w-*`) prevent expansion issues
- Match all width values exactly (sidebar width = main content offset)

---

## Appendix: Reference Commands

### Common Commands

```bash
# Install v0.app component
yes n | npx shadcn@latest add "https://v0.app/chat/b/[id]"

# Install shadcn component
npx shadcn@latest add button card dialog

# Check component locations
ls -la ui/ src/components/ src/components/ui/

# Clean up wrong directory
rm -rf ui/

# Test production build
npm run build && npm run preview

# Create git checkpoint
git add . && git commit -m "feat: checkpoint before integration"

# View git diff
git diff HEAD -- src/components/layouts/RitaLayout.tsx
```

### File Locations

```
packages/client/
├── src/
│   ├── components/
│   │   ├── ui/               # Base shadcn components (button, card, etc.)
│   │   ├── layouts/          # Layout components (RitaLayout)
│   │   ├── chat/             # Chat-specific components
│   │   └── *.reference.tsx   # Original v0 outputs (for comparison)
│   ├── pages/                # Page components
│   ├── hooks/                # Custom React hooks
│   └── index.css             # CSS variables from shadcn
├── ui/                       # ❌ WRONG LOCATION (delete this)
└── package.json
```

---

## Version History

- **v1.0.0** (January 2025) - Initial documentation based on RitaLayout integration
  - Documented sidebar width management
  - Documented text truncation in flex containers
  - Documented nested scroll container issues
  - Added comprehensive testing checklist
  - Added complete code examples

---

## Contributing

If you encounter new issues during Figma-to-Code integration:

1. Document the problem, cause, and solution
2. Add to "Common Issues & Solutions" section
3. Update "Lessons Learned" section
4. Create a commit with `docs:` prefix
5. Share learnings with the team

---

**Last Updated:** January 2025
**Maintainer:** RITA Go Frontend Team
**Related Docs:** `CLAUDE.md`, `docs/ux-components.md`