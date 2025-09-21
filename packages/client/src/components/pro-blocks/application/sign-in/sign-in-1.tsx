"use client";

import { Logo } from "@/components/pro-blocks/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Vite-compatible imports (replaced Next.js imports)

export function SignIn1() {
  return (
    <div className="bg-background gap-x-6 py-6 md:flex md:min-h-screen md:p-6">
      {/* Left side: Sign-in form */}
      <div className="flex items-center justify-center md:w-1/2">
        <div className="w-full max-w-sm px-6 py-16 md:p-0">
          {/* Header section with logo and title */}
          <div className="mb-6 flex flex-col gap-y-6">
            <a href="https://www.shadcndesign.com/" target="_blank" rel="noopener noreferrer">
              <Logo />
            </a>
            {/* Title and description */}
            <div className="flex flex-col gap-y-3">
              <h1 className="text-2xl font-bold md:text-3xl">Sign in</h1>
              <p className="text-muted-foreground text-sm">
                Log in to unlock tailored content and stay connected with your
                community.
              </p>
            </div>
          </div>
          {/* Sign-in form */}
          <div className="mb-6 space-y-4">
            {/* Email input */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input id="email" placeholder="Email" type="email" />
            </div>
            {/* Password input */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input id="password" placeholder="Password" type="password" />
            </div>
            {/* Forgot password link */}
            <div className="flex items-center justify-end">
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground text-sm underline"
              >
                Forgot password?
              </a>
            </div>
          </div>
          {/* Sign-in button and Sign-up link */}
          <div className="flex flex-col space-y-4">
            <Button className="w-full">Sign in</Button>
            <p className="text-muted-foreground text-center text-sm">
              Don't have an account?{" "}
              <a href="#" className="text-foreground underline">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
      {/* Right side: Image (hidden on mobile) */}
      <img
        src="https://ui.shadcn.com/placeholder.svg"
        alt="Login illustration"
        className="hidden w-1/2 rounded-xl object-cover md:block"
      />
    </div>
  );
}
