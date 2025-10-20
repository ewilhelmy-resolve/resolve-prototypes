# Password Reset Flow - UI Implementation Plan (Frontend Only)

## Overview

Implement forgot password and reset password **UI components only** following the InviteAcceptPage.tsx design pattern (gradient background, centered modal, status states, react-hook-form + Zod validation).

**Note:** This implementation focuses on the frontend UI with **simulated form submissions**. Backend API integration will be added later.

## User Flow

```
LoginPage
  ↓ (click "Forgot your password?")
ForgotPasswordPage
  ↓ (enter email → send reset link)
Email sent confirmation
  ↓ (user clicks link in email)
ResetPasswordPage
  ↓ (enter new password → submit)
Success confirmation
  ↓ (auto-redirect after 3s)
LoginPage
```

---

## 1. ForgotPasswordPage Component

### Route
- **Path:** `/forgot-password`
- **File:** `packages/client/src/pages/ForgotPasswordPage.tsx`

### Component States

#### 1.1 Initial Form State
**UI Elements:**
- Logo at top center
- Title: "Forgot your password?"
- Description: "Enter your work email address and we'll send you a link to reset your password."
- Email input field (label: "Work Email")
- Submit button: "Send Reset Link"
- Back to login link: "Back to login"

**Form Validation (Zod Schema):**
```typescript
const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});
```

#### 1.2 Loading State
**UI Elements:**
- Progress bar (`<Progress value={indeterminate} />`)
- Disabled form fields
- Submit button shows loading state

#### 1.3 Success State
**UI Elements:**
- Title: "Email on the way!"
- Description: "We sent you password reset instructions to **{email}**. If it doesn't show up soon, check your spam folder."
- Success icon (Mail icon or CheckCircle)
- Button: "Back to Login" (navigates to `/login`)

#### 1.4 Error State
**UI Elements:**
- Alert with error message (e.g., "Email not found", "Service temporarily unavailable")
- Form remains enabled for retry
- Error displayed above form

### Simulated Submission (No Backend)

**Implementation:** Use `setTimeout` to simulate async operations instead of actual API calls.

### Component Structure (Template from InviteAcceptPage)
```typescript
export default function ForgotPasswordPage() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const navigate = useNavigate();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (data: ForgotPasswordFormValues) => {
    // Simulate API call with setTimeout
    setIsPending(true);

    setTimeout(() => {
      setIsPending(false);
      setSubmittedEmail(data.email);
      setIsSuccess(true);
    }, 1500); // Simulate 1.5s network delay
  };

  // Success state UI
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#000000] to-[#012C72] flex items-center justify-center p-4">
        {/* Success UI */}
      </div>
    );
  }

  // Form state UI
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#000000] to-[#012C72] flex items-center justify-center p-4">
      {/* Form UI */}
    </div>
  );
}
```

---

## 2. ResetPasswordPage Component

### Route
- **Path:** `/reset-password?token={resetToken}`
- **File:** `packages/client/src/pages/ResetPasswordPage.tsx`

### URL Parameters
- `token` (query param) - Reset token from email link

### Component States

#### 2.1 Token Verification State (Loading)
**UI Elements:**
- Progress bar
- Message: "Verifying reset link..."

#### 2.2 Invalid Token State (Error)
**UI Elements:**
- Alert: "Invalid or expired reset link"
- Description: "This password reset link is invalid or has expired. Please request a new one."
- Button: "Request New Link" (navigates to `/forgot-password`)

#### 2.3 Valid Token - Form State
**UI Elements:**
- Logo at top center
- Title: "Reset your password"
- Description: "Almost done. Enter your new password and you're good to go."
- New Password field (label: "New Password", type: password, with show/hide toggle)
- Confirm Password field (label: "Confirm Password", type: password, with show/hide toggle)
- Submit button: "Reset Password"

**Form Validation (Zod Schema):**
```typescript
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
```

#### 2.4 Submitting State (Loading)
**UI Elements:**
- Progress bar
- Disabled form fields
- Submit button shows loading state

#### 2.5 Success State
**UI Elements:**
- Title: "Success!"
- Description: "Your password has been updated and is secure. You can now log in again."
- Success icon (CheckCircle)
- Auto-redirect to `/login` after 3 seconds
- Countdown message: "Redirecting to login in {count} seconds..."

#### 2.6 Error State
**UI Elements:**
- Alert with error message (e.g., "Failed to reset password", "Token expired")
- Form remains enabled for retry

### Simulated Token Verification and Submission (No Backend)

**Implementation:** Use `setTimeout` and URL token param for UI simulation.

**Token Validation Logic:**
- If `token` query param exists and equals `"valid-token"` → show form
- If `token` is missing or invalid → show error state
- For testing: Use `/reset-password?token=valid-token`

### Component Structure (Template from InviteAcceptPage)
```typescript
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isPending, setIsPending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // Simulate token verification on mount
  useEffect(() => {
    setTimeout(() => {
      setIsVerifying(false);
      // For UI testing: accept "valid-token" as valid token
      setTokenValid(token === "valid-token");
    }, 1000); // Simulate 1s verification delay
  }, [token]);

  const onSubmit = (data: ResetPasswordFormValues) => {
    // Simulate API call with setTimeout
    setIsPending(true);

    setTimeout(() => {
      setIsPending(false);
      setIsSuccess(true);

      // Start countdown and redirect
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate("/login");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, 1500); // Simulate 1.5s network delay
  };

  // Token verification loading state
  if (isVerifying) {
    return <div>Verifying reset link...</div>;
  }

  // Invalid token state
  if (!tokenValid) {
    return <div>Invalid or expired token UI</div>;
  }

  // Success state
  if (isSuccess) {
    return <div>Success UI with countdown</div>;
  }

  // Form state
  return <div>Reset password form UI</div>;
}
```

---

## 3. LoginPage Modifications

### File
`packages/client/src/pages/LoginPage.tsx`

### Changes Required

Add "Forgot your password?" link above the "Already have an account" section.

**Location:** Between the login form and the "Already have an account" text.

**Implementation:**
```typescript
{/* After login form, before "Already have an account" */}
<div className="text-center">
  <Link
    to="/forgot-password"
    className="text-sm text-blue-600 hover:text-blue-800 underline"
  >
    Forgot your password?
  </Link>
</div>

{/* Existing "Already have an account" section */}
<p className="text-center text-sm text-muted-foreground">
  Already have an account?{" "}
  <Link to="/login" className="text-blue-600 hover:text-blue-800 underline">
    Log in
  </Link>
</p>
```

---

## 4. Shared Styling and Components

### Design System (from InviteAcceptPage)

#### Background
```css
bg-gradient-to-b from-[#000000] to-[#012C72]
```

#### Container Card
```typescript
<Card className="w-full max-w-md bg-card/95 backdrop-blur">
  {/* Content */}
</Card>
```

#### Logo
```typescript
<div className="flex justify-center mb-6">
  <img
    src="/logo-mark.svg"
    alt="Logo"
    className="h-12 w-12"
  />
</div>
```

#### Progress Bar
```typescript
{isPending && (
  <Progress value={undefined} className="mb-4" />
)}
```

#### Status Alert
```typescript
<Alert variant="destructive" className="mb-4">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>{error.message}</AlertDescription>
</Alert>
```

---

## 5. Routing Configuration

### File
`packages/client/src/router.tsx`

### New Routes
```typescript
{
  path: "/forgot-password",
  element: <ForgotPasswordPage />,
},
{
  path: "/reset-password",
  element: <ResetPasswordPage />,
},
```

---

## 6. Type Definitions (UI Only - No API Types Needed Yet)

### Zod Schemas (Component-Level)

These schemas will be defined directly in the component files:

```typescript
// In ForgotPasswordPage.tsx
const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
```

```typescript
// In ResetPasswordPage.tsx
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
```

---

## 7. Backend Integration (Future)

**Note:** The following sections are documented for future backend integration. For now, UI components use simulated submissions with `setTimeout`.

### Required Endpoints (To Be Implemented Later)

#### 1. POST /api/auth/forgot-password
- Validates email exists in system
- Generates secure reset token (UUID or JWT with 15-minute expiration)
- Stores token in database with user association and expiry timestamp
- Sends password reset email with link: `{FRONTEND_URL}/reset-password?token={token}`
- Returns success response (don't reveal if email exists for security)

#### 2. GET /api/auth/verify-reset-token?token={token}
- Validates token exists in database
- Checks token hasn't expired
- Returns validity status and optionally masked email

#### 3. POST /api/auth/reset-password
- Validates token (same as verify endpoint)
- Hashes new password using bcrypt
- Updates user password in database
- Invalidates/deletes reset token
- Optionally: invalidate all existing user sessions for security
- Returns success response

### Database Schema (Example)
```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP
);

-- Index for fast token lookup
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
```

---

## 8. Security Considerations (For Future Backend)

1. **Token Expiration:** Reset tokens should expire after 15 minutes
2. **Rate Limiting:** Limit forgot password requests (e.g., 3 requests per hour per email)
3. **Token Invalidation:** Mark tokens as used after successful password reset
4. **Email Validation:** Don't reveal if email exists in system (always show success message)
5. **Password Requirements:** Enforce strong password policy (min 8 chars, uppercase, lowercase, number)
6. **HTTPS Only:** Reset links must use HTTPS in production
7. **Token Length:** Use cryptographically secure tokens (UUID v4 or 32+ char random string)
8. **Session Invalidation:** Optionally log out all devices after password reset

---

## 9. Email Template (For Future Backend)

### Subject
"Reset your password"

### Body
```
Hi {firstName},

We received a request to reset your password. Click the link below to create a new password:

{RESET_LINK}

This link will expire in 15 minutes.

If you didn't request a password reset, you can safely ignore this email.

Thanks,
The Rita Team
```

---

## 10. Testing Checklist

### ForgotPasswordPage
- [ ] Form validation (invalid email, empty field)
- [ ] Submit button disabled during loading
- [ ] Success state displays correct email
- [ ] Error handling for network failures
- [ ] "Back to Login" navigation works
- [ ] Responsive design (mobile, tablet, desktop)

### ResetPasswordPage
- [ ] Token verification on page load
- [ ] Invalid/expired token state displays correctly
- [ ] Password validation (length, complexity)
- [ ] Confirm password mismatch error
- [ ] Submit button disabled during loading
- [ ] Success state countdown works
- [ ] Auto-redirect to login after 3 seconds
- [ ] Show/hide password toggle works
- [ ] Responsive design

### LoginPage
- [ ] "Forgot your password?" link visible
- [ ] Link navigates to /forgot-password

### Integration
- [ ] End-to-end flow (forgot → email → reset → login)
- [ ] Token expiration handling
- [ ] Multiple reset requests handling
- [ ] Accessibility (keyboard navigation, screen readers)

---

## 11. Implementation Order (UI Only)

1. **Phase 1: ForgotPasswordPage**
   - Create component with form state
   - Implement form validation with Zod
   - Add simulated submission with setTimeout
   - Add success state
   - Style with gradient background (copy from InviteAcceptPage)
   - Test all UI states (form, loading, success)

2. **Phase 2: ResetPasswordPage**
   - Create component with token verification simulation
   - Implement form validation with Zod
   - Add simulated token check and submission with setTimeout
   - Add success state with countdown
   - Style with gradient background
   - Test all UI states (verifying, invalid token, form, loading, success)

3. **Phase 3: LoginPage Modification**
   - Add "Forgot your password?" link

4. **Phase 4: Routing**
   - Add routes to router.tsx

5. **Phase 5: Manual Testing**
   - Test form validation
   - Test loading states
   - Test success flows
   - Test navigation
   - Test responsive design
   - Test accessibility

---

## 12. Files to Create/Modify

### New Files (UI Only)
- `packages/client/src/pages/ForgotPasswordPage.tsx`
- `packages/client/src/pages/ResetPasswordPage.tsx`

### Modified Files
- `packages/client/src/pages/LoginPage.tsx` (add forgot password link)
- `packages/client/src/router.tsx` (add new routes)

---

## 13. Dependencies Check

All required dependencies should already be installed (based on InviteAcceptPage):
- `react-hook-form` - Form management
- `zod` - Validation schemas
- `@hookform/resolvers` - Zod resolver for react-hook-form
- `@tanstack/react-query` - API state management
- `lucide-react` - Icons
- `react-router-dom` - Navigation
- shadcn/ui components: `Card`, `Button`, `Input`, `Label`, `Alert`, `Progress`

---

## 14. Summary

This plan provides a complete blueprint for implementing forgot password and reset password **UI components** following the InviteAcceptPage design pattern. The implementation focuses on frontend-only functionality with simulated submissions, maintaining consistency with the existing codebase.

**Key Features (UI Only):**
- Email-based password reset flow (UI states)
- Simulated token verification with setTimeout
- Strong password validation with Zod
- Success states with auto-redirect and countdown
- Loading states with progress bars
- Responsive design with gradient background
- Accessibility compliance
- Ready for future backend integration

**Testing Strategy:**
- For ForgotPasswordPage: Enter any valid email → see success state
- For ResetPasswordPage: Use URL `/reset-password?token=valid-token` → see form
- For ResetPasswordPage: Use URL `/reset-password` or `/reset-password?token=invalid` → see error state
