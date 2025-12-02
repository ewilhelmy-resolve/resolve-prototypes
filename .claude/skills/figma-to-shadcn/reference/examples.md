# Figma to ShadCN - Complete Examples

## Example 1: User Profile Card

**Input Figma URL:**
```
https://figma.com/design/abc123?node-id=42-156
```

**User prompts:**
- Feature name: `user-profile`
- Split components: `yes`

**Generated Output:**

```tsx
// File: packages/client/src/components/user-profile/UserProfile.tsx

import { UserProfileCard } from "./UserProfileCard"
import { UserStats } from "./UserStats"
import { UserActions } from "./UserActions"

interface UserProfileProps {
  userId: string
}

export function UserProfile({ userId }: UserProfileProps) {
  return (
    <div className="container mx-auto p-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UserProfileCard userId={userId} />
        </div>
        <div className="space-y-6">
          <UserStats userId={userId} />
          <UserActions userId={userId} />
        </div>
      </div>
    </div>
  )
}
```

```tsx
// File: packages/client/src/components/user-profile/UserProfileCard.tsx

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Mail, MapPin } from "lucide-react"

interface UserProfileCardProps {
  userId: string
}

export function UserProfileCard({ userId }: UserProfileCardProps) {
  // In real implementation, fetch user data via TanStack Query
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src="/placeholder-avatar.jpg" alt="User avatar" />
            <AvatarFallback>
              <User className="h-10 w-10" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold">John Doe</h2>
            <p className="text-muted-foreground">Senior Developer</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">Active</Badge>
              <Badge variant="outline">Verified</Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>john.doe@example.com</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>San Francisco, CA</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Example 2: Payments Dashboard with Data Table

**Input Figma URL:**
```
https://figma.com/design/xyz789?node-id=100-200
```

**User prompts:**
- Feature name: `payments-dashboard`
- Split components: `yes`

**Generated Output:**

```tsx
// File: packages/client/src/components/payments/PaymentsDashboard.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PaymentStatsGrid } from "./PaymentStatsGrid"
import { PaymentTable } from "./PaymentTable"
import { PaymentFilters } from "./PaymentFilters"

export function PaymentsDashboard() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Payments</h1>
        <PaymentFilters />
      </div>

      <PaymentStatsGrid />

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentTable />
        </CardContent>
      </Card>
    </div>
  )
}
```

```tsx
// File: packages/client/src/components/payments/PaymentStatsGrid.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, CreditCard, Users } from "lucide-react"

interface StatCardProps {
  title: string
  value: string
  change: string
  icon: React.ReactNode
}

function StatCard({ title, value, change, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          <span className="text-green-600">{change}</span> from last month
        </p>
      </CardContent>
    </Card>
  )
}

export function PaymentStatsGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Revenue"
        value="$45,231"
        change="+20.1%"
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
      />
      <StatCard
        title="Transactions"
        value="2,350"
        change="+15.3%"
        icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
      />
      <StatCard
        title="Growth"
        value="12.5%"
        change="+4.2%"
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
      />
      <StatCard
        title="Active Users"
        value="1,234"
        change="+8.1%"
        icon={<Users className="h-4 w-4 text-muted-foreground" />}
      />
    </div>
  )
}
```

```tsx
// File: packages/client/src/components/payments/PaymentTable.tsx

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"

interface Payment {
  id: string
  customer: string
  amount: string
  status: "completed" | "pending" | "failed"
  date: string
}

export function PaymentTable() {
  // In real implementation, fetch via TanStack Query
  const payments: Payment[] = [
    {
      id: "PAY-001",
      customer: "Acme Corp",
      amount: "$5,000",
      status: "completed",
      date: "2024-03-15"
    },
    // ... more payments
  ]

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Transaction ID</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell className="font-mono text-sm">{payment.id}</TableCell>
            <TableCell>{payment.customer}</TableCell>
            <TableCell className="font-semibold">{payment.amount}</TableCell>
            <TableCell>
              <Badge
                variant={
                  payment.status === "completed"
                    ? "default"
                    : payment.status === "pending"
                    ? "secondary"
                    : "destructive"
                }
              >
                {payment.status}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{payment.date}</TableCell>
            <TableCell>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

---

## Example 3: Modal Form with Validation

**Input Figma URL:**
```
https://figma.com/design/form123?node-id=50-75
```

**User prompts:**
- Feature name: `create-ticket-modal`
- Split components: `no` (single form, no repeated patterns)

**Generated Output:**

```tsx
// File: packages/client/src/components/tickets/CreateTicketModal.tsx

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

const createTicketSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().min(10, "Description must be at least 10 characters"),
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
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      category: "",
    },
  })

  async function onSubmit(data: CreateTicketFormData) {
    setIsSubmitting(true)
    try {
      // API call here
      console.log("Creating ticket:", data)
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error("Failed to create ticket:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Ticket</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter ticket title"
                      {...field}
                      aria-required="true"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the issue..."
                      className="min-h-[120px]"
                      {...field}
                      aria-required="true"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
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
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger aria-label="Select category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bug">Bug</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="support">Support</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
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

---

## Key Patterns Demonstrated

1. **TypeScript interfaces** for all props
2. **Zod validation** for forms
3. **React Hook Form** integration
4. **Accessibility attributes** (aria-label, aria-required, sr-only)
5. **ShadCN UI components** with proper imports
6. **Lucide icons** for visual elements
7. **Responsive design** with Tailwind grid/flex
8. **Component splitting** for reusability
9. **Proper file paths** in comments
10. **No inline styles** - Tailwind utilities only
