# Figma-to-shadcn Workflow

RITA Go uses a **Figma-to-shadcn workflow** for implementing UX designs.

## Installing Design System Components with CLI

When UX provides v0.app or Figma-to-shadcn component URLs, we use the shadcn CLI to generate and install components:

**Primary Method - CLI Installation:**
```bash
cd packages/client

# For v0.app components (answer 'n' to overwrites if protecting existing files)
yes n | npx shadcn@latest add "https://v0.app/chat/b/[component-id]"

# For shadcn registry components
npx shadcn@latest add button card dialog

# For custom registry URLs
npx shadcn@latest add "https://[custom-registry-url].json"
```

**What the CLI Does:**
- Downloads component definitions from v0.app or registries
- Generates TypeScript/React code
- Copies files into your `src/` directory (though sometimes in wrong location - see version control section below)
- Installs npm dependencies automatically
- Updates CSS variables in `src/index.css`

**Alternative - Manual Installation** (fallback if CLI fails):
```bash
# Download and inspect component definition
curl -s https://[component-url].json

# Extract the component code from the JSON
# Create src/components/[ComponentName].tsx with the code
# Update router.tsx to use the new component
```

## Handling Future UX Updates

**For Component Updates**:
1. **New URL from UX**: Download the updated component JSON
2. **Compare Changes**: Use git diff to see what changed in the component code
3. **Update Component**: Replace the old component code with new version
4. **Test Integration**: Ensure routing and authentication still work
5. **Commit Changes**: Document what was updated from UX

**For New Components**:
1. Follow the same installation process
2. Create new component file in `src/components/`
3. Integrate with existing routing/authentication as needed

**Version Control Strategy**:
- Each UX update gets its own commit with clear message
- Document the source URL in component comments
- Keep track of component version/date for future reference

## Version Control for v0.app & Figma Components

**Philosophy:** shadcn/ui and v0.app use a **"generate and copy"** approach. We use the CLI (`npx shadcn add`) to generate components, but unlike traditional npm packages, the code is copied directly into your source tree. This gives full customization control but requires manual update management.

**How It Works:**
```bash
# Install command (generates and copies code)
npx shadcn@latest add "https://v0.app/chat/b/[component-id]"

# What happens:
# 1. CLI downloads component definition
# 2. Generates TypeScript/React code
# 3. Copies files into your src/ directory
# 4. Updates package.json with any new dependencies
# 5. Updates CSS variables in index.css if needed
```

**Key Difference from Traditional Packages:**
- ❌ NOT like: `npm install @shadcn/ui` (dependency in node_modules)
- ✅ IS like: Code generator that copies files into your source tree
- Result: You own the code, can modify freely, but updates require re-running the CLI

**TL;DR - The Workflow:**
1. Run `npx shadcn add [v0-url]` to generate and copy component code
2. CLI may place files in wrong location - extract to `src/components/ui/`
3. Delete incorrectly placed `ui/` directory
4. Adapt high-level components (remove Next.js, add Rita hooks)
5. Keep original as `.reference.tsx` for comparison
6. Commit with clear documentation of source URL
7. For updates: re-run CLI, manually merge changes, preserve customizations

## Component Categories & Ownership

| Category | Location | Update Strategy | Ownership |
|----------|----------|----------------|-----------|
| **Base UI Components** | `src/components/ui/` | Commit before updating, manual merge | Minimal edits, track upstream |
| **Adapted v0 Layouts** | `src/components/layouts/` | Manual regeneration, preserve integrations | Fully customized, fork and own |
| **Reference Files** | `*.reference.tsx` | Keep for comparison only | Do not use in production |
| **Custom Wrappers** | `src/components/custom/` (future) | Full control | Rita-specific variants |

## Update Workflow (When UX sends new v0.app URL)

1. **Before Update:**
   ```bash
   # Commit all current changes
   git add .
   git commit -m "feat: checkpoint before v0 update"

   # Create diff of existing customizations (if updating existing component)
   git diff HEAD~1 -- src/components/layouts/RitaV0Layout.tsx > customizations.patch
   ```

2. **Generate with CLI:**
   ```bash
   # Run v0.app/shadcn installation (answer 'n' to overwrite prompts if protecting existing files)
   cd packages/client
   yes n | npx shadcn@latest add "https://v0.app/chat/b/[component-id]"

   # What the CLI does:
   # ✅ Downloads component definition from v0.app
   # ✅ Generates React/TypeScript code
   # ✅ Installs npm dependencies (if new ones needed)
   # ✅ Updates CSS variables in src/index.css
   # ⚠️  May copy files to WRONG location (packages/client/ui/ instead of src/components/ui/)
   # ✅ Creates high-level components (Dashboard, ShareModal, etc.)
   ```

3. **Post-Install Cleanup & Extraction:**
   ```bash
   # Check what was created
   ls -la ui/              # Wrong location (if exists)
   ls -la src/components/  # High-level components (Dashboard.tsx, ShareModal.tsx)

   # Extract any NEW components from ui/ to correct location
   # Example: If pagination.tsx is new
   cp ui/pagination.tsx src/components/ui/pagination.tsx

   # Delete the incorrectly placed ui/ directory
   rm -rf ui/

   # Verify git status
   git status --short
   ```

4. **Adapt for Rita:**
   - **For high-level layouts:** Create new file (e.g., `RitaV0Layout.tsx`, `ChatTestPage.tsx`)
   - **For reference:** Rename original v0 output (e.g., `Dashboard.tsx` → `Dashboard.reference.tsx`)
   - Remove Next.js dependencies:
     - Replace `Image` from `next/image` with standard `<img>` tag
     - Remove `"use client"` directives
     - Replace Next.js routing with React Router
   - Integrate Rita hooks:
     - `useAuth()` for authentication
     - `useConversations()` for conversation data
     - `useChatNavigation()` for navigation
     - `useKnowledgeBase()` for knowledge base features
   - Test with SSE real-time updates
   - Add proper TypeScript types for all props
   - Verify responsive design and accessibility

5. **Compare & Merge (for updates to existing components):**
   ```bash
   # If updating an existing component, compare versions
   git diff src/components/layouts/RitaV0Layout.tsx

   # Selectively apply desired changes
   # Preserve Rita-specific integrations (auth, hooks, SSE)
   ```

6. **Commit & Document:**
   ```bash
   git add .
   git commit -m "feat: update RitaV0Layout from v0.app [component-id]

   Source: https://v0.app/chat/b/[component-id]
   Changes:
   - Updated sidebar design
   - Added new navigation pattern
   - Preserved Rita auth/SSE integration"
   ```

## Long-Term Strategy

**"Fork and Own for Layouts, Track Upstream for Base Components"**

- **Base shadcn Components** (`button.tsx`, `card.tsx`, etc.):
  - Minimize customization
  - Update periodically from shadcn registry for bug fixes
  - Create wrappers for Rita-specific variants

- **v0.app Layouts** (`RitaV0Layout.tsx`, `ChatTestPage.tsx`, etc.):
  - Treat as **starting templates**, not maintained dependencies
  - Fully customize and version control
  - Regenerate from v0 only for major redesigns (not minor updates)
  - Preserve all Rita integrations (hooks, auth, SSE)

## What NOT to Do

- ❌ Don't commit the incorrectly placed `packages/client/ui/` directory (CLI bug - wrong location)
- ❌ Don't use `--overwrite` flag without committing existing changes first
- ❌ Don't expect automatic updates like npm packages (CLI regenerates, requires manual merge)
- ❌ Don't use original v0 outputs directly (e.g., Dashboard.tsx) - they lack Rita integrations
- ❌ Don't run CLI installation without the `yes n |` prefix if you have existing customized components
- ❌ Don't skip the cleanup step - always delete incorrectly placed directories

## Reference Files

- `Dashboard.reference.tsx` - Original v0.app output (for comparison)
- Keep as documentation, mark with `.reference.tsx` extension
- Do not import in production code

## Component Integration

- Components are pre-built with proper responsive design
- Include mobile-first breakpoints and accessibility features
- Follow established layout patterns (sticky inputs, proper height constraints)
- Integrate with existing authentication and routing systems

## Layout Architecture & Integration Lessons Learned

Current implementation uses:
- **RitaLayout**: Main application layout from v0.app/shadcn Dashboard design
- **Responsive Design**: Mobile sheet navigation, desktop sidebars
- **Proper Height Management**: `min-h-screen` with flex layouts preventing scroll issues
- **Component-Based**: Modular sections (sidebar, main content, right panel)

### Critical Integration Lessons from RitaLayout Implementation

1. **Sidebar Width Management**
   - **Problem**: Sidebar used `w-[--sidebar-width]` (16rem/256px) but main content used `left-[204px]`, causing 52px overlap
   - **Solution**: Match main content offset to sidebar width using `lg:left-64` (16rem = 256px)
   - **Lesson**: Always verify CSS variable values match between sidebar and main content offsets

2. **Text Truncation in Flex Containers**
   - **Problem**: Long conversation titles caused sidebar to expand beyond fixed width, even with `truncate` class
   - **Root Cause**: Flex items need `min-w-0` to allow text truncation to work properly
   - **Solution**: Add `min-w-0` to SidebarMenuItem, SidebarMenuButton, and text spans
   - **Lesson**: `truncate` alone isn't enough in flexbox - always add `min-w-0` to parent flex items

3. **Nested Scroll Containers**
   - **Problem**: RitaLayout's `<main>` had `overflow-y-auto` AND page components also had `overflow-y-auto`
   - **Result**: Content appeared cut off, double scrollbars, confusing UX
   - **Solution**: Let RitaLayout handle ALL scrolling, remove `overflow-y-auto` from child page components
   - **Lesson**: Single scroll responsibility - layout controls scroll, pages provide content structure only

4. **Max-Width Constraints**
   - **Problem**: Sidebar could expand past intended width when content pushed boundaries
   - **Solution**: Add explicit `max-w-64` to Sidebar component
   - **Lesson**: Always set `max-w-*` on fixed-width containers, even if width is already specified

5. **Page Component Structure**
   - **Working Pattern**:
     ```tsx
     <div className="flex flex-col h-full">
       {/* Header with flex-shrink-0 */}
       <div className="px-6 py-6 border-b flex-shrink-0">
         <h1>Page Title</h1>
       </div>

       {/* Content with flex-1 (NO overflow-y-auto) */}
       <div className="px-6 py-6 flex-1">
         {/* Page content */}
       </div>
     </div>
     ```
   - **Lesson**: Use `flex-shrink-0` for headers, `flex-1` for content, let parent handle scroll

6. **Local vs Production Differences**
   - **Problem**: Layout worked locally but broke in production build
   - **Root Cause**: CSS optimization/minification exposed underlying layout issues (width mismatches, nested scrolls)
   - **Solution**: Always test with production builds (`npm run build && npm run preview`) before deploying
   - **Lesson**: Dev mode is forgiving; production mode exposes structural issues

### Testing Checklist for v0.app/Figma Layout Integration

- [ ] Sidebar width matches main content offset exactly
- [ ] Long text truncates properly (test with 50+ character strings)
- [ ] No double scrollbars (only one scroll container per view)
- [ ] All pages fit within layout bounds (no cut-off content)
- [ ] Responsive design works (mobile sheet, desktop fixed sidebar)
- [ ] Production build tested (`npm run build && npm run preview`)
- [ ] Toggle button visible and functional at all viewport sizes
- [ ] Content doesn't shift when sidebar opens/closes

## Integration Example

```typescript
// Route integration with authentication
{
  path: '/v1',
  element: (
    <ProtectedRoute>
      <RitaLayout />
    </ProtectedRoute>
  )
}
```