# Figma → ShadCN UI Code Generator Skill

This skill generates React/Next.js components using:

- Tailwind CSS  
- ShadCN UI components (`@/components/ui/...`)  
- Lucide icons (`lucide-react`)  
- And uses the Figma MCP server (`get_design_context`, `get_variable_defs`, etc.)

It can also optionally split repeated pieces into reusable components.

---

## Skill Schema (JSON)

```json
{
  "schema_version": "1.0",
  "name": "figma-to-shadcn",
  "description": "Generate React/Next.js components from a Figma URL using Tailwind CSS, ShadCN UI components, and Lucide icons.",
  "version": "1.0.0",
  "functions": [
    {
      "name": "generate_shadcn_components_from_figma",
      "description": "Generate React/Next.js components from a Figma frame or component URL using Tailwind + ShadCN UI + Lucide icons.",
      "arguments": {
        "type": "object",
        "properties": {
          "figma_url": {
            "type": "string",
            "description": "The Figma frame/component URL, ideally including node-id for the selection."
          },
          "split_components": {
            "type": "boolean",
            "description": "If true, detect repeated structures and create reusable ShadCN UI components.",
            "default": true
          },
          "page_or_feature_name": {
            "type": "string",
            "description": "Optional logical name for the page/feature (e.g. 'payments-dashboard', 'login-form') to use for file/folder naming.",
            "default": "figma-component"
          }
        },
        "required": ["figma_url"]
      },
      "handler": {
        "prompt": {
          "template": [
            {
              "role": "user",
              "content": [
                {
                  "type": "text",
                  "text": "You are a senior frontend engineer working in a Next.js + TypeScript + Tailwind CSS + ShadCN UI codebase.\n\nTASK\nGenerate high-quality React components from the following Figma URL:\n\nFigma URL: {{figma_url}}\nPage/feature name: {{page_or_feature_name}}\n\nTOOLS\nUse the Figma MCP server tools to inspect the design:\n- get_design_context for the selection\n- get_variable_defs for tokens\n\nSTACK REQUIREMENTS\n- Use TypeScript React (.tsx)\n- Use Tailwind CSS utilities\n- Use ShadCN UI components from `@/components/ui/...`\n- Use Lucide icons imported from `lucide-react`\n\nCOMPONENT EXTRACTION\nIf split_components is true, detect repeated patterns and extract them into reusable components under `src/components/`.\nUse semantic names like PaymentCard, UserRow, SidebarNavItem.\n\nTAILWIND & DESIGN TOKENS\nPrefer semantic Tailwind classes aligned with ShadCN style tokens.\nAvoid raw hex values if possible.\n\nOUTPUT RULES\n- Output code only\n- No explanations\n- If multiple files are needed, output with clear file path comments (e.g. // File: src/components/user/user-card.tsx)\n\nSHADCN COMPONENT PADDING FIXES\nWhen using SheetContent, DialogContent, or similar container components with custom padding:\n- SheetHeader has default p-4 padding\n- SheetFooter has default p-4 padding  \n- If the parent container (SheetContent) already has padding (e.g. p-8), add className=\"p-0\" to SheetHeader/SheetFooter to prevent double padding and misalignment\n\nExample:\n```tsx\n<SheetContent className=\"p-8\">\n  <SheetHeader className=\"p-0\"> {/* Remove default padding */}\n    <SheetTitle>Title</SheetTitle>\n  </SheetHeader>\n  {/* Content */}\n  <SheetFooter className=\"p-0\"> {/* Remove default padding */}\n    <Button>Action</Button>\n  </SheetFooter>\n</SheetContent>\n```\n\nNow generate the full React components for this Figma selection."
                }
              ]
            }
          ]
        }
      }
    }
  ]
}