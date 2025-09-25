"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function OnboardingForm() {
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto flex items-center justify-between px-9 h-screen">
        <div className="flex items-center justify-between w-full max-w-[641px] p-4 rounded-2xl shadow-[0_0_150px_rgba(0,102,255,0.5),0_0_20.9px_rgba(0,102,255,0.5)]">
          <div className="flex flex-col items-center py-8 space-y-5 w-full">
            <div className="flex flex-col items-center space-y-3 w-full">
              <div className="flex flex-col space-y-6 w-full max-w-[480px]">
                <div className="flex gap-6">
                  <div className="w-full">
                    <Label htmlFor="firstName" className="text-white">
                      First name
                    </Label>
                    <Input id="firstName" />
                  </div>
                  <div className="w-full">
                    <Label htmlFor="lastName" className="text-white">
                      Last name
                    </Label>
                    <Input id="lastName" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-white">
                    Work email
                  </Label>
                  <Input id="email" type="email" />
                </div>

                <div>
                  <Label htmlFor="company" className="text-white">
                    Company name
                  </Label>
                  <Input id="company" />
                </div>

                <div>
                  <Label htmlFor="password" className="text-white">
                    Password
                  </Label>
                  <Input id="password" type="password" />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center w-full gap-10">
              <Button variant="ghost" className="text-primary-foreground">
                Back
              </Button>
              <div className="flex justify-end">
                <Button variant="outline">Continue</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-card w-[467px] h-[600px]" />
      </div>
    </div>
  )
}
