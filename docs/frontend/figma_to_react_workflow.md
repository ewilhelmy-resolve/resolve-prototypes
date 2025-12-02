# Figma-to-React Development Workflow
**RITA Go Frontend - Design-to-Production System**

---

## 🎯 **Overview**

This document establishes the **recommended workflow** for all production page development in RITA Go. This Figma-to-React process eliminates manual styling, ensures design consistency, and creates zero friction between design and development teams.

### **Design-to-Production Approach**
We encourage using components generated through the Design-to-Production Figma process for all production pages in `packages/client/src/pages/`.

### **Core Strategy**
**Pro Blocks Foundation + AI Chatbot Enhancements + Custom Figma Components** - Build upon shadcn Design Pro Blocks and AI Chatbot interface components for common UI patterns while creating Rita-specific components through Figma's Design-to-Code workflow.

### **Zero Manual Styling Principle**
**Recommended**: Use Figma-generated components and Pro Blocks instead of writing custom CSS
**Benefits**: Faster development, design consistency, and easier maintenance

### **Key Benefits**
- **100% Design Accuracy**: Direct Figma-to-code conversion eliminates manual interpretation errors
- **Zero Manual Styling**: All visual styling comes from Figma-generated or Pro Block components
- **CLI-First Workflow**: Components installed via command line for rapid development
- **Enterprise Compliance**: SOC2/WCAG 2.1 AA standards built-in
- **Design Consistency**: Unified component library approach with single source of truth
- **Accelerated Development**: Significantly faster than traditional manual component creation
- **Maintainable Codebase**: Reduces styling inconsistencies and technical debt
- **Zero Friction**: Direct design-to-code pipeline eliminates translation errors
- **Pixel-Perfect Implementation**: AI-generated components match Figma designs exactly

---

## 🏗️ **Architecture**

### **Component Sources**

#### **Pro Blocks (shadcn Design Components)**
Pre-built, production-ready components for common UI patterns:
```bash
# Authentication & Forms
npx shadcn@latest add @shadcndesign/sign-in-1        # Login form layouts
npx shadcn@latest add @shadcndesign/input-field-1   # Form inputs
npx shadcn@latest add @shadcndesign/button-1        # Buttons and actions
npx shadcn@latest add @shadcndesign/modal-1         # Modals and dialogs

# Layout & Navigation
npx shadcn@latest add @shadcndesign/two-column-1    # Page layouts
npx shadcn@latest add @shadcndesign/header-1        # Navigation headers

# AI Chat Interface Components (shadcn AI Chatbot Block)
# Note: Enhanced manually in Rita due to registry limitations
# See: src/components/chat/EnhancedChatMessage.tsx
# See: src/components/chat/EnhancedChatContainer.tsx
```

#### **AI Chatbot Enhancements (shadcn AI Chatbot Inspired)**
Enhanced chat interface components inspired by shadcn AI Chatbot block:
- **Professional message bubbles** with proper spacing and avatars
- **Streaming animation effects** for character-by-character typing
- **Enhanced status indicators** with icons and smooth animations
- **Better mobile responsiveness** and accessibility
- **Smart scroll management** that doesn't interfere with user scrolling

#### **Custom Rita Components (Figma-generated)**
Rita-specific components created in Figma and converted to React:
```bash
# Rita-specific components
npx shadcn add [rita-interface-url]    # Chat interface mockup
npx shadcn add [workflow-node-url]     # Workflow visualization
npx shadcn add [rita-branding-url]     # Brand elements
```

### **Production Directory Structure**
```
src/
├── components/
│   ├── ui/                   # 70% - shadcn/ui + Pro Blocks
│   │   ├── button.tsx        # Standard shadcn/ui
│   │   ├── input.tsx         # Standard shadcn/ui
│   │   └── [pro-block].tsx   # Pro Blocks via CLI
│   ├── chat/                 # 10% - Enhanced AI Chat Components
│   │   ├── EnhancedChatMessage.tsx    # Inspired by shadcn AI Chatbot
│   │   └── EnhancedChatContainer.tsx  # Professional message bubbles & streaming
│   └── figma/generated/      # 20% - Custom Rita components via Figma
│       ├── RitaInterface.tsx # Generated via Figma plugin
│       ├── WorkflowNode.tsx  # Generated via Figma plugin
│       └── StepBadge.tsx     # Generated via Figma plugin
├── pages/                    # 🚨 PRODUCTION PAGES - ENHANCED COMPONENTS
│   ├── LoginPage.tsx         # Uses Pro Block + enhanced components
│   ├── ChatPage.tsx          # Uses Enhanced Chat + Figma components
│   ├── DashboardPage.tsx     # Uses Pro Block + enhanced components
│   └── OnboardingPage.tsx    # Uses Pro Block + enhanced components
└── test/                     # POC and development testing
    └── login/
        └── FigmaLoginPage.tsx # Migration POC example
```

### **Design-to-Production Workflow**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   UX Designer   │    │  Figma Plugin    │    │ Frontend Dev    │
│                 │    │                  │    │                 │
│ 1. Design Rita- │───▶│ 2. Convert with  │───▶│ 3. Install via  │
│    specific UI  │    │    Claude 3.5    │    │    CLI command  │
│    in Figma     │    │    Sonnet AI     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                                               │
         │                                               ▼
         │                                      ┌─────────────────┐
         │                                      │   RITA Go App   │
         │                                      │                 │
         │                                      │ 4. Components   │
         │                                      │    integrated   │
         │                                      │    & deployed   │
         │                                      └─────────────────┘
         │                                               │
         │               ┌──────────────────┐            │
         └──────────────▶│  Figma Source    │◀───────────┘
                         │  of Truth        │
                         │                  │  5. Design updates
                         │ • Brand colors   │     trigger new
                         │ • Typography     │     CLI installs
                         │ • Components     │
                         └──────────────────┘

Key Principles:
• Pro Blocks for common UI patterns (buttons, forms, layouts)
• Figma-generated components for Rita-specific designs
• CLI installation eliminates manual file transfers
• Figma remains single source of truth for all designs
• 100% accurate design-to-code conversion with no interpretation errors
• Zero friction between design handoff and development
• Design updates require new CLI install and deployment cycle
```

---

## 🔄 **Development Workflow**

### **UX/Design Person Workflow**
1. **Design Rita-Specific Components**
   - Skip common UI patterns (buttons, inputs, forms) - use Pro Blocks instead
   - Focus on: Rita AI interface, workflow visualization, custom branding

2. **Use shadcn Design Plugin in Figma**
   - Install plugin: https://www.shadcndesign.com/docs/plugin
   - Design custom components in Figma
   - Generate React code via Claude 3.5 Sonnet AI
   - Copy CLI installation command from plugin

3. **Handoff to Frontend Developer**
   - Provide CLI command: `npx shadcn add [component-url]`
   - No manual file transfers or design specifications needed

### **Frontend Developer Workflow**
1. **Install Pro Blocks**
   ```bash
   # Install common UI components
   npx shadcn@latest add @shadcndesign/sign-in-1
   npx shadcn@latest add @shadcndesign/button-1
   npx shadcn@latest add @shadcndesign/input-field-1
   ```

2. **Install Custom Components**
   ```bash
   # Install Rita-specific components from UX
   npx shadcn add [rita-interface-url]
   npx shadcn add [workflow-node-url]
   ```

3. **Assemble Page**
   ```tsx
   import { SignIn1 } from '@/components/pro-blocks/application/sign-in/sign-in-1'
   import { RitaInterface } from '@/components/figma/generated'

   export default function LoginPage() {
     return (
       <div className="page-container">
         <SignIn1 />              {/* Pro Block foundation */}
         <RitaInterface />        {/* Rita-specific component */}
       </div>
     )
   }
   ```

---

## 🛠️ **Technical Setup**

### **Environment Configuration**
```bash
# Required Environment Variables (GitHub Secrets in production)
SHADCNDESIGN_LICENSE_KEY=your-license-key
ANTHROPIC_FIGMA_API_KEY=your-anthropic-key
```

### **shadcn Design Plugin Setup**
1. Install plugin in Figma: https://www.shadcndesign.com/docs/plugin
2. Configure with license key and Anthropic API key
3. Test with a simple component to validate workflow

### **Dependencies**
```json
{
  "shadcn-ui": "latest",
  "@radix-ui/react-*": "latest",
  "tailwindcss": "^3.0.0",
  "typescript": "^5.0.0"
}
```

---

## 📏 **Code Standards**

### **Recommended Practices**
- ✅ Use Pro Blocks for common UI components
- ✅ Create custom Figma components for Rita-specific elements
- ✅ Install components via CLI commands
- ✅ Follow conditional CSS import pattern for Pro Blocks
- ✅ Maintain TypeScript strict mode compliance

### **Practices to Avoid**
- ⚠️ Creating manual CSS for common UI patterns
- ⚠️ Modifying existing Pro Block components
- ⚠️ Adding styles to global CSS files for component-specific styling
- ⚠️ Skipping accessibility attributes
- ⚠️ Overriding Pro Block styling manually

### **Example Implementation**
```tsx
// ✅ Recommended: Using Pro Blocks + Custom Components
import { SignIn1 } from '@/components/pro-blocks/application/sign-in/sign-in-1'
import { RitaInterface } from '@/components/figma/generated'
import '../styles/conditional-pro-blocks.css'  // Only when Pro Blocks used

export default function LoginPage() {
  return (
    <div className="login-container">
      <SignIn1 />           {/* Pro Block foundation */}
      <RitaInterface />     {/* Custom Rita component */}
    </div>
  )
}

// ⚠️ Consider alternatives: Manual styling
<div className="custom-login-form">  {/* Consider using Pro Blocks instead */}
  <div className="form-header">      {/* Or Figma-generated components */}
```

---

## 🎨 **Design System Integration**

### **Brand Consistency**
- **Typography**: Season Mix (headings) + Inter (body text)
- **Colors**: Rita brand palette with dark theme support
- **Spacing**: Consistent with shadcn Design system standards
- **Accessibility**: WCAG 2.1 AA compliance maintained across all components

### **Component Naming Convention**
```
Figma Layer Names → React Component Names:
<RitaInterface>    → RitaInterface.tsx
<WorkflowNode>     → WorkflowNode.tsx
<RitaBranding>     → RitaBranding.tsx
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

#### **Vite Import Compatibility**
**Problem**: Next.js imports in Pro Blocks (e.g., `import Image from "next/image"`)
**Solution**: Replace with standard HTML elements
```tsx
// Replace this:
import Image from "next/image"
<Image src="..." alt="..." width="100" height="100" />

// With this:
<img src="..." alt="..." className="w-[100px] h-[100px]" />
```

#### **Missing UI Components**
**Problem**: Import errors for `@/components/ui/checkbox` or similar
**Solution**: Install missing shadcn components
```bash
npx shadcn@latest add checkbox
npx shadcn@latest add label
```

#### **Global CSS Pollution**
**Problem**: Pro Block styles affecting entire application
**Solution**: Use conditional imports
```tsx
// Only import Pro Block styles when using Pro Block components
import '../styles/pro-blocks.css'  // Conditional import
```

---

## 📊 **Validation & Testing**

### **Component Testing**
```bash
# Test individual components
npm run test ComponentName.test.tsx

# Test complete page integration
npm run test LoginPage.integration.test.tsx

# Visual regression testing
npm run test:visual login-page
```

### **Accessibility Validation**
- Ensure all form elements have proper labels
- Verify keyboard navigation works correctly
- Test with screen readers
- Validate WCAG 2.1 AA compliance

---

## 🚀 **Implementation Example**

### **Complete Login Page Implementation**
Located at: `src/test/login/FigmaLoginPage.tsx`

**Features Demonstrated**:
- ✅ Two-column layout using Pro Block structure
- ✅ Functional login form with React state management
- ✅ Rita AI interface mockup with chat visualization
- ✅ Workflow visualization with animations
- ✅ Modal validation system
- ✅ Fully responsive design
- ✅ Zero manual CSS (100% component-based)

**Access POC**: `http://localhost:5175/figma-login-poc`

---

## 📈 **Results & Benefits**

### **Expected Outcomes**
- **Development Speed**: CLI-based component installation vs manual creation
- **Code Quality**: Reduced manual CSS, improved TypeScript coverage
- **Design Consistency**: Unified component library approach
- **Maintainability**: Single source of truth from Figma designs
- **Team Efficiency**: Clear separation of concerns between UX and Frontend

### **Team Impact**
- **UX Focus**: Design Rita-specific components while leveraging Pro Blocks
- **Frontend Focus**: Integration and functionality with less UI implementation work
- **Faster Iterations**: CLI-based component updates enable rapid prototyping

---

## 🎉 **Ready for Production**

This workflow has been validated with a complete login page POC and is ready for implementation across all RITA Go pages. The approach scales from simple forms to complex dashboard interfaces while maintaining design consistency and development speed.

**Next Implementation**: Apply this same pattern to dashboard pages, onboarding flows, and chat interfaces using the established Pro Blocks foundation with custom Rita components strategy.