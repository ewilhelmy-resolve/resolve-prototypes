# ShadCN UI Patterns & Best Practices

## Common Padding Issues

### Sheet Components

**Problem:** ShadCN `SheetHeader` and `SheetFooter` have default `p-4` padding, causing double padding when parent has custom padding.

**Solution:** Add `className="p-0"` to header/footer when parent has padding.

```tsx
// ❌ WRONG - Double padding
<SheetContent className="p-8">
  <SheetHeader>
    <SheetTitle>Settings</SheetTitle>
  </SheetHeader>
  {/* Content misaligned due to header's p-4 + parent's p-8 */}
</SheetContent>

// ✅ CORRECT - No double padding
<SheetContent className="p-8">
  <SheetHeader className="p-0">
    <SheetTitle>Settings</SheetTitle>
  </SheetHeader>
  {/* Content properly aligned */}
</SheetContent>
```

### Dialog Components

Same issue applies to `Dialog`:

```tsx
<DialogContent className="p-6">
  <DialogHeader className="p-0">
    <DialogTitle>Confirm Action</DialogTitle>
    <DialogDescription>Are you sure?</DialogDescription>
  </DialogHeader>

  {/* Content */}

  <DialogFooter className="p-0">
    <Button>Confirm</Button>
  </DialogFooter>
</DialogContent>
```

### Card Components

Cards are modular - combine header/content/footer as needed:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Dashboard</CardTitle>
    <CardDescription>Overview of your stats</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Main content */}
  </CardContent>
  <CardFooter className="flex justify-between">
    <Button variant="outline">Cancel</Button>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

---

## Form Patterns

### Standard Form with Validation

```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

type FormData = z.infer<typeof schema>

export function LoginForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  function onSubmit(data: FormData) {
    console.log(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  {...field}
                  aria-required="true"
                />
              </FormControl>
              <FormDescription>
                We'll never share your email.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  {...field}
                  aria-required="true"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Login</Button>
      </form>
    </Form>
  )
}
```

### Select with Form Integration

```tsx
<FormField
  control={form.control}
  name="role"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Role</FormLabel>
      <Select
        onValueChange={field.onChange}
        defaultValue={field.value}
      >
        <FormControl>
          <SelectTrigger aria-label="Select role">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="admin">Administrator</SelectItem>
          <SelectItem value="user">User</SelectItem>
          <SelectItem value="guest">Guest</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Checkbox Group

```tsx
<FormField
  control={form.control}
  name="notifications"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Notification Preferences</FormLabel>
      <div className="space-y-2">
        <FormItem className="flex items-center space-x-2">
          <FormControl>
            <Checkbox
              checked={field.value?.includes("email")}
              onCheckedChange={(checked) => {
                const current = field.value || []
                return checked
                  ? field.onChange([...current, "email"])
                  : field.onChange(current.filter((v) => v !== "email"))
              }}
            />
          </FormControl>
          <FormLabel className="!mt-0 font-normal">
            Email notifications
          </FormLabel>
        </FormItem>
        {/* More checkboxes */}
      </div>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## Data Display Patterns

### Table with Actions

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Edit, Trash } from "lucide-react"

export function UsersTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="w-[50px]">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>John Doe</TableCell>
          <TableCell>john@example.com</TableCell>
          <TableCell>
            <Badge>Admin</Badge>
          </TableCell>
          <TableCell>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}
```

### Tabs Layout

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function SettingsTabs() {
  return (
    <Tabs defaultValue="account" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>

      <TabsContent value="account">
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Manage your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Account settings form */}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="security">
        {/* Security settings */}
      </TabsContent>

      <TabsContent value="notifications">
        {/* Notification settings */}
      </TabsContent>
    </Tabs>
  )
}
```

---

## Accessibility Patterns

### Visually Hidden Text

```tsx
<Button variant="ghost" size="icon">
  <Trash className="h-4 w-4" />
  <span className="sr-only">Delete item</span>
</Button>
```

### ARIA Labels

```tsx
// For inputs
<Input
  type="email"
  aria-label="Email address"
  aria-required="true"
  aria-describedby="email-hint"
/>
<span id="email-hint" className="text-sm text-muted-foreground">
  We'll never share your email
</span>

// For selects
<SelectTrigger aria-label="Select role">
  <SelectValue placeholder="Choose role" />
</SelectTrigger>

// For dialogs (auto-handled by DialogTitle)
<DialogTitle>Delete Account</DialogTitle>
<DialogDescription>This action cannot be undone</DialogDescription>
```

### Keyboard Navigation

ShadCN components handle keyboard nav automatically:
- **Tab** - Move between focusable elements
- **Enter/Space** - Activate buttons, checkboxes
- **Escape** - Close dialogs, dropdowns
- **Arrow keys** - Navigate select options, radio groups

---

## Loading States

### Button Loading

```tsx
<Button disabled={isLoading}>
  {isLoading ? "Saving..." : "Save"}
</Button>

// Or with spinner
import { Loader2 } from "lucide-react"

<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isLoading ? "Saving..." : "Save"}
</Button>
```

### Skeleton Loading

```tsx
import { Skeleton } from "@/components/ui/skeleton"

export function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[200px] w-full" />
      </CardContent>
    </Card>
  )
}
```

---

## Responsive Patterns

### Grid Layouts

```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
</div>
```

### Mobile-First Navigation

```tsx
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px]">
        <nav className="flex flex-col space-y-4">
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
```

---

## Color & Theme Patterns

### Using Theme Colors (RITA Design System)

**ALWAYS use design tokens from packages/client/src/index.css:**

```tsx
// ✅ CORRECT - Use design system tokens
<div className="bg-background text-foreground">         // Base colors
<div className="bg-primary text-primary-foreground">    // Blue actions
<div className="bg-muted text-muted-foreground">        // Subdued content
<div className="bg-destructive text-destructive-foreground"> // Error states
<div className="bg-accent text-accent-foreground">      // Highlights
<div className="border-border">                         // Borders

// ❌ WRONG - Never hardcode colors
<div className="bg-white text-black">           // Use bg-background instead
<div className="bg-blue-500 text-white">        // Use bg-primary instead
<div className="bg-red-500 text-white">         // Use bg-destructive instead
<div className="border-gray-200">               // Use border-border instead
```

### Error States - ALWAYS Use Destructive Variant

```tsx
// ✅ CORRECT - Error colors via variant
<Button variant="destructive">Delete Account</Button>
<Badge variant="destructive">Failed</Badge>
<div className="text-destructive-foreground">Error message</div>

// ❌ WRONG - Manual red colors
<Button className="bg-red-500">Delete</Button>
<span className="text-red-600">Error</span>
```

### Variants (Built-in Design System Colors)

```tsx
// Button variants (use primary blue and destructive red from index.css)
<Button variant="default">Default</Button>           // Primary blue
<Button variant="destructive">Delete</Button>       // Destructive red
<Button variant="outline">Cancel</Button>           // Outline
<Button variant="ghost">Settings</Button>           // Transparent
<Button variant="link">Learn More</Button>          // Link style

// Badge variants
<Badge variant="default">Active</Badge>             // Primary blue
<Badge variant="secondary">Pending</Badge>          // Muted gray
<Badge variant="destructive">Failed</Badge>         // Destructive red
<Badge variant="outline">Draft</Badge>              // Outline
```

### Typography Classes

```tsx
// ✅ CORRECT - Use design system fonts
<h1 className="font-heading">Dashboard</h1>         // Season Mix
<p className="font-sans">Body text</p>              // Helvetica
<code className="font-mono">const x = 1</code>      // Monospace

// ❌ WRONG - Custom font classes
<h1 className="font-serif">Title</h1>               // Use font-heading
<p className="font-custom">Text</p>                 // Use font-sans
```

---

## Best Practices Summary

1. **ALWAYS use design system tokens** - `bg-background`, `text-foreground`, `bg-destructive` (NO `bg-red-500`, `bg-blue-600`)
2. **Error states use destructive variant** - `variant="destructive"` on Button/Badge (NO manual red colors)
3. **Borders use border-border** - NO `border-gray-200` or arbitrary border colors
4. **Typography uses design system fonts** - `font-heading` (Season Mix), `font-sans` (Helvetica)
5. **Fix padding conflicts** - Add `className="p-0"` to nested headers/footers
6. **Use Zod for validation** - Type-safe and runtime-safe
7. **Add accessibility attributes** - `aria-label`, `sr-only`, `aria-required`
8. **Prefer semantic components** - Use Card, Sheet, Dialog over div soup
9. **Mobile-first responsive** - Use `md:`, `lg:` breakpoints
10. **Loading states** - Disable buttons, show spinners/skeletons
11. **TypeScript interfaces** - Define props for all components
12. **Lucide icons** - Import from `lucide-react`, use consistent sizing
13. **No inline styles** - Tailwind utilities only
