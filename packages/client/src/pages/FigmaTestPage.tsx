import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HeroSection1 } from '@/components/pro-blocks/landing-page/hero-sections/hero-section-1'
// Conditional import: Only load Pro Block styles when using Pro Block components
import '../styles/pro-blocks.css'

/**
 * Figma-to-React Integration Demo
 *
 * This page demonstrates the shadcn Design CLI workflow:
 * 1. UX person generates component via Figma plugin
 * 2. Frontend team installs via CLI command
 * 3. Component integrates seamlessly with Rita Go
 */
export default function FigmaTestPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Figma-to-React Integration</h1>
        <p className="text-lg text-muted-foreground">
          No manual styling workflow using shadcn Design Pro Blocks
        </p>
      </div>

      {/* CLI Commands for Developers */}
      <Card>
        <CardHeader>
          <CardTitle>💻 For Frontend Developers</CardTitle>
          <CardDescription>
            How to install Pro Block components via CLI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-100 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Search for components:</h4>
            <code className="block bg-black text-green-400 p-2 rounded text-sm">
              npx shadcn@latest search @shadcndesign --query "hero"
            </code>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Install a Pro Block:</h4>
            <code className="block bg-black text-green-400 p-2 rounded text-sm">
              npx shadcn@latest add @shadcndesign/hero-section-1
            </code>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Import component and styles:</h4>
            <code className="block bg-black text-green-400 p-2 rounded text-sm mb-2">
              import {"{ HeroSection1 }"} from '@/components/pro-blocks/landing-page/hero-sections/hero-section-1'
            </code>
            <code className="block bg-black text-green-400 p-2 rounded text-sm">
              import '../styles/pro-blocks.css' // Only when using Pro Blocks
            </code>
          </div>
        </CardContent>
      </Card>

      {/* UX Person Workflow */}
      <Card>
        <CardHeader>
          <CardTitle>🎨 For UX/Design Team</CardTitle>
          <CardDescription>
            How to generate components from Figma and handoff to developers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">📋 UX Workflow (Figma Plugin):</h4>
            <ol className="space-y-2 text-sm">
              <li>1. Design using shadcn/ui Figma Kit components</li>
              <li>2. Open <strong>shadcn Design</strong> plugin in Figma</li>
              <li>3. Select your component/frame → Choose AI model</li>
              <li>4. Click "Generate" → Click "Copy CLI"</li>
              <li>5. Share CLI command with Frontend team</li>
            </ol>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">📨 Handoff Communication:</h4>
            <div className="space-y-2 text-sm">
              <p><strong>Example message to developers:</strong></p>
              <p className="font-mono bg-white p-2 rounded border">
                "Hey team, please install this new hero section:<br/>
                npx shadcn@latest add @shadcndesign/custom-hero-v2"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* UX → Developer Workflow Demo */}
      <Card>
        <CardHeader>
          <CardTitle>👥 UX → Developer Workflow</CardTitle>
          <CardDescription>
            Complete handoff process demonstration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold">👩‍🎨 UX Person (Figma)</h4>
              <ol className="text-sm space-y-1">
                <li>1. Design using shadcn/ui Figma Kit</li>
                <li>2. Open shadcn Design plugin</li>
                <li>3. Select component → Generate</li>
                <li>4. Click "Copy CLI" button</li>
                <li>5. Share command with Frontend team</li>
              </ol>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold">👨‍💻 Frontend Developer (Rita Go)</h4>
              <ol className="text-sm space-y-1">
                <li>1. Receive CLI command from UX</li>
                <li>2. Run: <code>npx shadcn@latest add @shadcndesign/component</code></li>
                <li>3. Import: <code>import {"{ Component }"} from '@/components/pro-blocks/...'</code></li>
                <li>4. Use in Rita Go application</li>
                <li>5. Zero manual styling needed!</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Pro Block Demo */}
      <Card>
        <CardHeader>
          <CardTitle>🎯 Live Pro Block Demo</CardTitle>
          <CardDescription>
            Zero manual styling - Pro Block component working out of the box
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden bg-white">
            <HeroSection1 />
          </div>
        </CardContent>
      </Card>

      {/* Pending: Figma Plugin Setup */}
      <Card>
        <CardHeader>
          <CardTitle>⚠️ Pending: Figma Plugin Installation</CardTitle>
          <CardDescription>
            Next step to complete the full workflow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">🔧 Required Setup:</h4>
            <ul className="space-y-2 text-sm">
              <li>• Install <strong>shadcn Design</strong> plugin in Figma</li>
              <li>• Configure plugin with license key and AI API key</li>
              <li>• Test component generation from actual Figma design</li>
              <li>• Validate complete UX → Developer handoff process</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}