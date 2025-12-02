# Figma to ShadCN - Troubleshooting

## Common Issues & Solutions

### 1. Figma MCP Tools Not Working

**Symptoms:**
```
Error: mcp__figma__get_design_context failed
Cannot connect to Figma
```

**Solutions:**

✅ **Check Figma Desktop App**
- Figma desktop app MUST be running
- MCP server connects via desktop app, not web
- Restart app if needed

✅ **Verify MCP Server Config**
```bash
# Check if Figma MCP is configured
cat ~/.config/claude/mcp_settings.json
```

Should contain:
```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "@figma/mcp-server-figma"]
    }
  }
}
```

✅ **Check File Permissions**
- File must be accessible in Figma
- Must have view/edit access
- Check if file is in a team you're part of

---

### 2. Missing node-id in URL

**Symptoms:**
```
Error: nodeId is required
Please select a specific frame
```

**Solution:**

Select a frame in Figma and copy URL:

1. Open Figma desktop app
2. Select the frame/component you want
3. Right-click → Copy link
4. URL should look like: `figma.com/design/abc123?node-id=1-2`

**If URL missing node-id:**
- Select frame in canvas
- Use "Copy link to selection" (not "Copy link to file")

---

### 3. Components Not Split Properly

**Symptoms:**
- Generated one giant component
- Expected split into reusable pieces

**Solutions:**

✅ **Verify split_components is true**
```
User: "Split into reusable components"
Claude: "split_components: yes"
```

✅ **Check for repeated patterns in Figma**
- Skill detects repeating structures (cards, rows, items)
- If design has no repetition, splitting may not apply
- Consider refactoring Figma to use components/instances

✅ **Manual split if needed**
- Ask explicitly: "Split UserProfile into UserCard and UserStats"
- Provide component names: "Extract the payment card as PaymentCard.tsx"

---

### 4. Wrong Component Paths

**Symptoms:**
```tsx
// File: src/PaymentsDashboard.tsx  ❌
// Should be: packages/client/src/components/payments/PaymentsDashboard.tsx
```

**Solution:**

Always generate in RITA Go structure:
```
packages/client/src/components/
  ├── {feature-name}/
  │   ├── MainComponent.tsx
  │   ├── SubComponent1.tsx
  │   └── SubComponent2.tsx
```

Feature name from user prompt: `payments-dashboard` → `payments/` folder

---

### 5. Missing ShadCN Components

**Symptoms:**
```tsx
import { DataTable } from "@/components/ui/data-table"  ❌
// DataTable doesn't exist in ShadCN
```

**Solution:**

**Step 1: Check what's installed**
```bash
ls packages/client/src/components/ui/
```

**Step 2: Install missing component**
```bash
cd packages/client
npx shadcn@latest add [component-name]
```

**Example: Installing select component**
```bash
cd packages/client
npx shadcn@latest add select
# Creates: src/components/ui/select.tsx
```

**Common ShadCN components:**
- `button`, `card`, `input`, `label`, `textarea`
- `select`, `checkbox`, `radio-group`, `switch`
- `dialog`, `sheet`, `dropdown-menu`, `popover`, `hover-card`
- `table`, `tabs`, `badge`, `avatar`, `separator`
- `form` (includes react-hook-form integration)
- `toast`, `alert`, `skeleton`, `scroll-area`

**Not available in ShadCN (build from primitives):**
- `data-table` (use `table` + custom logic)
- `command-palette` (use `dialog` + `input`)
- `date-picker` (use `popover` + custom calendar)
- `color-picker` (use `popover` + custom picker)

**Auto-install multiple components:**
```bash
cd packages/client
npx shadcn@latest add button card input select dialog table
```

---

### 5b. Missing NPM Dependencies

**Symptoms:**
```
Error: Cannot find module 'lucide-react'
Error: Cannot find module 'react-hook-form'
Error: Cannot find module 'zod'
```

**Solution:**

**Step 1: Check package.json**
```bash
cat packages/client/package.json | grep -E "lucide|react-hook-form|zod"
```

**Step 2: Install missing packages**
```bash
cd packages/client

# Icons
npm install lucide-react

# Forms & validation
npm install react-hook-form @hookform/resolvers zod

# All at once
npm install lucide-react react-hook-form @hookform/resolvers zod
```

**Expected versions (RITA Go):**
```json
{
  "lucide-react": "^0.460.0",
  "react-hook-form": "^7.53.2",
  "@hookform/resolvers": "^3.9.1",
  "zod": "^3.23.8"
}
```

**Verify installation:**
```bash
npm list lucide-react react-hook-form @hookform/resolvers zod
```

---

### 6. TypeScript Errors After Generation

**Symptoms:**
```
Error: Type 'string' is not assignable to type 'number'
Property 'userId' does not exist
```

**Solutions:**

✅ **Check interfaces match props**
```tsx
interface Props {
  userId: string  // ✅ Matches usage
}

function Component({ userId }: Props) {
  return <div>{userId}</div>
}
```

✅ **Use strict type imports**
```tsx
import type { User } from "@/types/user"  // Type-only import
```

✅ **Run type-check**
```bash
cd packages/client
npm run type-check
```

---

### 7. Accessibility Violations

**Symptoms:**
- Screen reader can't access button
- Missing labels on inputs
- No keyboard navigation

**Solutions:**

✅ **Add ARIA labels**
```tsx
// ❌ Missing label
<Button variant="ghost" size="icon">
  <Trash className="h-4 w-4" />
</Button>

// ✅ With label
<Button variant="ghost" size="icon">
  <Trash className="h-4 w-4" />
  <span className="sr-only">Delete item</span>
</Button>
```

✅ **Form accessibility**
```tsx
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>  {/* ✅ Label */}
      <FormControl>
        <Input
          {...field}
          aria-required="true"  {/* ✅ ARIA */}
          aria-describedby="email-hint"
        />
      </FormControl>
      <FormDescription id="email-hint">
        We'll never share your email
      </FormDescription>
      <FormMessage />  {/* ✅ Error announcements */}
    </FormItem>
  )}
/>
```

---

### 8. Padding/Alignment Issues

**Symptoms:**
- Sheet content misaligned
- Double spacing in dialogs
- Inconsistent padding

**Solution:**

Apply **padding fix** for ShadCN containers:

```tsx
// ❌ Double padding
<SheetContent className="p-8">
  <SheetHeader>  {/* Has default p-4 */}
    <SheetTitle>Title</SheetTitle>
  </SheetHeader>
</SheetContent>

// ✅ Fixed
<SheetContent className="p-8">
  <SheetHeader className="p-0">  {/* Remove default padding */}
    <SheetTitle>Title</SheetTitle>
  </SheetHeader>
</SheetContent>
```

See [./shadcn-patterns.md](./shadcn-patterns.md#common-padding-issues) for details.

---

### 9. Design Tokens Not Applied

**Symptoms:**
- Hardcoded colors like `bg-blue-500`
- Not using Figma variables

**Solution:**

✅ **Use get_variable_defs**
```bash
# Skill should call this automatically
mcp__figma__get_variable_defs
```

✅ **Map to Tailwind theme**
```tsx
// ❌ Hardcoded
<div className="bg-blue-500 text-white">

// ✅ Theme-aware
<div className="bg-primary text-primary-foreground">
```

✅ **Check Figma variables**
- Open Figma file
- Check if colors/spacing use variables
- If not, ask designer to apply variables

---

### 10. Responsive Design Issues

**Symptoms:**
- Layout breaks on mobile
- Grid not responsive
- Fixed widths overflow

**Solutions:**

✅ **Use responsive utilities**
```tsx
// ❌ Fixed layout
<div className="grid grid-cols-3 gap-4">

// ✅ Responsive
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
```

✅ **Mobile-first approach**
```tsx
// ✅ Correct order: mobile → tablet → desktop
<div className="w-full md:w-1/2 lg:w-1/3">

// ❌ Wrong: desktop-first
<div className="w-1/3 lg:w-full">  // Backwards
```

✅ **Test at breakpoints**
- Mobile: 375px, 414px
- Tablet: 768px, 1024px
- Desktop: 1280px, 1920px

---

## Debug Workflow

When generation fails:

1. **Check Figma connection**
   ```bash
   # Verify desktop app running
   ps aux | grep Figma
   ```

2. **Validate URL format**
   ```
   ✅ https://figma.com/design/abc123?node-id=1-2
   ❌ https://figma.com/file/abc123  (no node-id)
   ```

3. **Test MCP tool manually**
   ```
   User: "Get design context for node 1:2 in file abc123"
   ```

4. **Simplify request**
   ```
   User: "Generate just the header component, no splitting"
   ```

5. **Check generated imports**
   ```tsx
   // All imports should resolve
   import { Button } from "@/components/ui/button"  ✅
   import { Custom } from "@/components/custom"     ❌ (if doesn't exist)
   ```

6. **Run type-check**
   ```bash
   npm run type-check
   ```

---

## Getting Help

**If issue persists:**

1. Share Figma URL (with node-id)
2. Share error message
3. Share generated code snippet
4. Confirm Figma desktop app running
5. Check MCP server logs

**Report bugs:**
- GitHub issues: `resolve-io/onboarding`
- Include: Figma URL, error, expected vs actual output
