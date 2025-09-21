# Figma-to-React Development Workflow
**Rita Go Frontend - Design System Integration Guide**

---

## 🎯 **Overview**

This document describes the established workflow for converting Figma designs directly to React components in Rita Go, eliminating manual styling and accelerating frontend development.

### **Core Strategy**
**80% Pro Blocks + 20% Custom Components** - Leverage existing shadcn Design Pro Blocks for common UI patterns while creating only Rita-specific components in Figma.

### **Key Benefits**
- **No Manual Styling**: All visual styling comes from Figma-generated or Pro Block components
- **CLI-First Workflow**: Components installed via command line in seconds
- **Enterprise Compliance**: SOC2/WCAG 2.1 AA standards built-in
- **Design Consistency**: Unified component library approach
- **Accelerated Development**: Significantly faster than traditional manual component creation

---

## 🏗️ **Architecture**

### **Component Distribution**

#### **80% Pro Blocks (shadcn Design Components)**
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
```

#### **20% Custom Rita Components (Figma-generated)**
Rita-specific components created in Figma and converted to React:
```bash
# Rita-specific components only
npx shadcn add [rita-interface-url]    # Chat interface mockup
npx shadcn add [workflow-node-url]     # Workflow visualization
npx shadcn add [rita-branding-url]     # Brand elements
```

### **Directory Structure**
```
src/
├── components/
│   ├── pro-blocks/           # 80% - shadcn Design Pro Blocks
│   │   ├── application/
│   │   ├── layout/
│   │   └── navigation/
│   └── figma/generated/      # 20% - Custom Rita components
│       ├── RitaInterface.tsx
│       ├── WorkflowNode.tsx
│       └── RitaBranding.tsx
└── pages/                    # Production pages using both
    └── LoginPage.tsx
```

---

## 🔄 **Development Workflow**

### **UX/Design Person Workflow**
1. **Design Only Rita-Specific Components** (20% of total work)
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
1. **Install Pro Blocks** (5 minutes)
   ```bash
   # Install common UI components
   npx shadcn@latest add @shadcndesign/sign-in-1
   npx shadcn@latest add @shadcndesign/button-1
   npx shadcn@latest add @shadcndesign/input-field-1
   ```

2. **Install Custom Components** (2 minutes)
   ```bash
   # Install Rita-specific components from UX
   npx shadcn add [rita-interface-url]
   npx shadcn add [workflow-node-url]
   ```

3. **Assemble Page** (30 minutes)
   ```tsx
   import { SignIn1 } from '@/components/pro-blocks/application/sign-in/sign-in-1'
   import { RitaInterface } from '@/components/figma/generated'

   export default function LoginPage() {
     return (
       <div className="page-container">
         <SignIn1 />              {/* 80% Pro Block */}
         <RitaInterface />        {/* 20% Custom */}
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

### **Do's**
- ✅ Use Pro Blocks for 80% of UI components
- ✅ Create custom Figma components only for Rita-specific elements
- ✅ Install all components via CLI commands
- ✅ Follow conditional CSS import pattern for Pro Blocks
- ✅ Maintain TypeScript strict mode compliance

### **Don'ts**
- ❌ Create manual CSS for common UI patterns
- ❌ Modify existing Pro Block components
- ❌ Add styles to global CSS files for component-specific styling
- ❌ Skip accessibility attributes
- ❌ Override Pro Block styling manually

### **Example Implementation**
```tsx
// ✅ Good: Using Pro Blocks + Custom Components
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

// ❌ Bad: Manual styling
<div className="custom-login-form">  {/* Manual CSS creation */}
  <div className="form-header">      {/* Manual styling */}
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

### **Proven Outcomes**
- **Development Speed**: CLI-based component installation vs manual creation
- **Code Quality**: Zero manual CSS, full TypeScript coverage
- **Design Consistency**: Unified component library approach
- **Maintainability**: Single source of truth from Figma designs
- **Team Efficiency**: Clear separation of concerns between UX and Frontend

### **Team Impact**
- **UX Focus**: Design only Rita-specific components (20% workload reduction)
- **Frontend Focus**: Integration and functionality (80% less UI work)
- **Faster Iterations**: CLI-based component updates enable rapid prototyping

---

## 🎉 **Ready for Production**

This workflow has been validated with a complete login page POC and is ready for implementation across all Rita Go pages. The approach scales from simple forms to complex dashboard interfaces while maintaining design consistency and development speed.

**Next Implementation**: Apply this same pattern to dashboard pages, onboarding flows, and chat interfaces using the established 80% Pro Blocks + 20% Custom Components strategy.