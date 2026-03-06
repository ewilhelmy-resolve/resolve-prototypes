# Figma to ShadCN - Example

## Modal Form with Validation + Component Splitting

**Figma URL:** `https://figma.com/design/form123?node-id=50-75`
**Feature:** `create-ticket`
**Split:** yes (orchestrator + form)

### Generated Output

```tsx
// File: packages/client/src/components/tickets/CreateTicketModal.tsx

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

const createTicketSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().min(10, "Min 10 characters"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  category: z.string().min(1, "Category is required"),
})

type CreateTicketFormData = z.infer<typeof createTicketSchema>

interface CreateTicketModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateTicketModal({ open, onOpenChange }: CreateTicketModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { title: "", description: "", priority: "medium", category: "" },
  })

  async function onSubmit(data: CreateTicketFormData) {
    setIsSubmitting(true)
    try {
      // API call via TanStack Query mutation
      onOpenChange(false)
      form.reset()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="p-0">
          <DialogTitle>Create New Ticket</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter ticket title" {...field} aria-required="true" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe the issue..." className="min-h-[120px]" {...field} aria-required="true" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger aria-label="Select priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">
                        <span className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          Urgent
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger aria-label="Select category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="feature">Feature Request</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <DialogFooter className="gap-2 p-0 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Ticket"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

## Key Patterns Demonstrated

1. TypeScript interfaces for all props
2. Zod schema + React Hook Form + zodResolver
3. ARIA: `aria-required`, `aria-label` on selects
4. ShadCN Form components with proper FormField render pattern
5. `p-0` fix on DialogHeader/DialogFooter (padding fix)
6. Responsive grid (`sm:grid-cols-2`)
7. Loading state with `disabled={isSubmitting}`
8. Design tokens only (no hardcoded colors)
