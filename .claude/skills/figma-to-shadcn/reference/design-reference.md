# RITA Design Reference

Color mapping, design tokens, and ShadCN patterns for Figma-to-code generation.

## Color Decision Tree

When converting Figma colors, follow this order:

1. **Error/delete action?** -> `variant="destructive"` or `bg-destructive`
2. **Primary action/CTA?** -> `variant="default"` or `bg-primary`
3. **Active/selected/hover?** -> `bg-accent` / `text-accent-foreground`
4. **Header/panel/subdued section?** -> `bg-secondary` / `text-secondary-foreground`
5. **Border?** -> `border-border` (inputs: `border-input`)
6. **Secondary/hint text?** -> `text-muted-foreground`
7. **Page background?** -> `bg-background` or `bg-muted`
8. **Body text?** -> `text-foreground`

**If unsure:** Check `packages/client/src/index.css` for the closest semantic token.

## Token Mapping Table

| Figma Color | Design Token | Usage |
|---|---|---|
| Blue (#0050C7) | `bg-primary` / `text-primary-foreground` | Primary actions |
| Red (any shade) | `bg-destructive` / `text-destructive-foreground` | Error states |
| White | `bg-background` | Page backgrounds |
| Black text | `text-foreground` | Primary text |
| Light gray bg | `bg-muted` | Subdued backgrounds |
| Gray text | `text-muted-foreground` | Secondary text |
| Light gray bg | `bg-secondary` | Headers, panels |
| Highlighted bg | `bg-accent` | Active items, hover |
| Gray border | `border-border` | All borders |

## NEVER Use These

```
bg-red-*, bg-blue-*, bg-white, bg-gray-*
text-black, text-gray-*, text-red-*
border-gray-*
font-serif
```

Always use design tokens or component variants instead.

## Typography

| Figma Font | Token | Usage |
|---|---|---|
| Season Mix | `font-heading` | H1-H4 |
| Helvetica | `font-sans` | Body text |
| Monospace | `font-mono` | Code |

## Chart Colors

`bg-chart-1` (orange), `bg-chart-2` (teal), `bg-chart-3` (blue), `bg-chart-4` (lime), `bg-chart-5` (yellow)

## Component Variants

```tsx
// Buttons
<Button variant="default">Primary</Button>      // Blue
<Button variant="destructive">Delete</Button>    // Red
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Settings</Button>
<Button variant="link">Learn More</Button>

// Badges
<Badge variant="default">Active</Badge>          // Blue
<Badge variant="secondary">Pending</Badge>       // Gray
<Badge variant="destructive">Failed</Badge>      // Red
<Badge variant="outline">Draft</Badge>
```

## ShadCN Padding Fix

When parent has custom padding, nested headers/footers cause double padding:

```tsx
// Fix: add p-0 to header/footer
<SheetContent className="p-8">
  <SheetHeader className="p-0">
    <SheetTitle>Title</SheetTitle>
  </SheetHeader>
  <SheetFooter className="p-0">
    <Button>Action</Button>
  </SheetFooter>
</SheetContent>
```

Same applies to `DialogHeader`/`DialogFooter`.

## Form Pattern

```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const schema = z.object({ email: z.string().email() })
type FormData = z.infer<typeof schema>

const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { email: "" },
})

// In JSX:
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField control={form.control} name="email" render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input {...field} aria-required="true" />
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  </form>
</Form>
```

## Accessibility Checklist

- Icon-only buttons: add `<span className="sr-only">Label</span>`
- Form inputs: `aria-required="true"` on required fields
- Select triggers: `aria-label="Select [thing]"`
- Loading buttons: `disabled={isLoading}` + spinner via `Loader2`
- Tables: action columns get `<span className="sr-only">Actions</span>` header

## Real-World RITA Examples

**bg-secondary for headers** (from inline-citation.tsx):
```tsx
<div className="flex items-center justify-between gap-2 rounded-t-md bg-secondary p-2">
```

**bg-accent for active states** (from RitaSettingsLayout.tsx):
```tsx
<SidebarMenuButton className={cn("p-2 h-8", isActive && "bg-accent text-accent-foreground")}>
```
