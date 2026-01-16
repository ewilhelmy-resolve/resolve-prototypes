/**
 * AgentTemplateModal - Agent Library modal for browsing templates
 *
 * Features:
 * - Search templates
 * - Collapsible category sidebar (System, Domain, Type)
 * - Template cards with icon, title, description, skills
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Search,
  X,
  ChevronRight,
  ChevronDown,
  Monitor,
  BookOpenText,
  Keyboard,
  Album,
  Headphones,
  ShieldCheck,
  Key,
  Users,
  Bot,
  FileText,
  Settings,
  Briefcase,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  creator: string;
  creatorIcon?: string;
  prompt: string;
  category: string;
  domain: string;
  skills: string[];
  iconId: string;
  iconBg: string;
  iconColor?: string;
}

// Icon mapping
const ICON_MAP: Record<string, React.ElementType> = {
  monitor: Monitor,
  "book-open-text": BookOpenText,
  keyboard: Keyboard,
  album: Album,
  headphones: Headphones,
  "shield-check": ShieldCheck,
  key: Key,
  users: Users,
  bot: Bot,
  "file-text": FileText,
  settings: Settings,
  briefcase: Briefcase,
  "help-circle": HelpCircle,
};

// Pre-built agent templates
const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: "assign-computer",
    name: "Assign a Computer to a New Owner",
    description: "Allows IT administrators to quickly assign or reprovision managed apple computers",
    creator: "Resolve",
    prompt: "Help IT administrators assign computers to new owners...",
    category: "IT Support",
    domain: "Access Management",
    skills: ["Employee onboarding"],
    iconId: "monitor",
    iconBg: "bg-violet-200",
  },
  {
    id: "warranty-lookup",
    name: "Look Up My Computer Warranty Info",
    description: "Allows employees to check their computer's warranty and purchase details through",
    creator: "Resolve",
    prompt: "Help employees look up warranty information...",
    category: "IT Support",
    domain: "Access Management",
    skills: ["Employee onboarding"],
    iconId: "book-open-text",
    iconBg: "bg-teal-200",
  },
  {
    id: "onboard-computer",
    name: "Onboard a New Computer",
    description: "Runs automations and performs tasks based on leveraging Resolve actions platform",
    creator: "Resolve",
    prompt: "Guide users through onboarding a new computer...",
    category: "IT Support",
    domain: "Access Management",
    skills: ["Employee onboarding"],
    iconId: "keyboard",
    iconBg: "bg-sky-100",
  },
  {
    id: "inventory-record",
    name: "Create a Computer Inventory Record",
    description: "Allows IT administrators to quickly assign or reprovision managed apple computers",
    creator: "Resolve",
    prompt: "Help create inventory records...",
    category: "IT Support",
    domain: "General",
    skills: ["Employee onboarding"],
    iconId: "album",
    iconBg: "bg-indigo-950",
    iconColor: "text-white",
  },
  {
    id: "helpdesk-advisor",
    name: "HelpDesk Advisor",
    description: "Answer IT support questions using your knowledge base",
    creator: "Resolve",
    prompt: "Help employees with IT-related questions...",
    category: "IT Support",
    domain: "General",
    skills: ["IT Support", "Troubleshooting"],
    iconId: "headphones",
    iconBg: "bg-blue-100",
  },
  {
    id: "password-reset",
    name: "Password Reset Bot",
    description: "Automate password reset requests for employees securely",
    creator: "Resolve",
    prompt: "Help employees reset their passwords...",
    category: "IT Support",
    domain: "Access Management",
    skills: ["Password Reset", "Account Unlock"],
    iconId: "key",
    iconBg: "bg-purple-100",
  },
  {
    id: "onboarding-guide",
    name: "Onboarding Guide",
    description: "Help new hires navigate their first days at the company",
    creator: "Resolve",
    prompt: "Welcome new employees and guide them...",
    category: "HR",
    domain: "Human Resources",
    skills: ["Employee onboarding", "Benefits"],
    iconId: "users",
    iconBg: "bg-green-100",
  },
  {
    id: "policy-expert",
    name: "Policy Expert",
    description: "Answer questions about company policies from official documents",
    creator: "Resolve",
    prompt: "Provide accurate answers about company policies...",
    category: "Compliance",
    domain: "Human Resources",
    skills: ["Policy lookup", "Compliance"],
    iconId: "shield-check",
    iconBg: "bg-emerald-100",
  },
  {
    id: "benefits-advisor",
    name: "Benefits Advisor",
    description: "Help employees understand and navigate their benefits package",
    creator: "Resolve",
    prompt: "Help employees understand their benefits...",
    category: "HR",
    domain: "Human Resources",
    skills: ["Benefits", "Enrollment"],
    iconId: "briefcase",
    iconBg: "bg-amber-100",
  },
  {
    id: "access-request",
    name: "Access Request Handler",
    description: "Process system access requests for employees efficiently",
    creator: "Resolve",
    prompt: "Help employees request access to systems...",
    category: "IT Support",
    domain: "Access Management",
    skills: ["Access provisioning", "Approvals"],
    iconId: "settings",
    iconBg: "bg-slate-100",
  },
  {
    id: "customer-success",
    name: "Customer Success Assistant",
    description: "Help customer success teams with account information and insights",
    creator: "Resolve",
    prompt: "Assist customer success teams...",
    category: "Sales",
    domain: "Customer Success",
    skills: ["Account lookup", "Customer insights"],
    iconId: "help-circle",
    iconBg: "bg-pink-100",
  },
  {
    id: "approval-bot",
    name: "Approval Workflow Bot",
    description: "Streamline approval processes for various business requests",
    creator: "Resolve",
    prompt: "Help process approval requests...",
    category: "Operations",
    domain: "Approvals",
    skills: ["Approval routing", "Status tracking"],
    iconId: "file-text",
    iconBg: "bg-orange-100",
  },
];

// Category structure
interface CategoryItem {
  id: string;
  name: string;
  count?: number;
  children?: CategoryItem[];
}

const CATEGORIES: CategoryItem[] = [
  { id: "all", name: "All agents", count: AGENT_TEMPLATES.length },
  { id: "system", name: "System" },
  {
    id: "domain",
    name: "Domain",
    children: [
      { id: "access-management", name: "Access Management" },
      { id: "approvals", name: "Approvals" },
      { id: "customer-success", name: "Customer Success" },
      { id: "general", name: "General" },
      { id: "human-resources", name: "Human Resources" },
    ],
  },
  { id: "type", name: "Type" },
];

interface AgentTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: AgentTemplate) => void;
}

export function AgentTemplateModal({
  open,
  onOpenChange,
  onSelectTemplate,
}: AgentTemplateModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["domain"]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>("access-management");
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedTemplate(null);
      setSearchQuery("");
    }
  }, [open]);

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Filter templates
  const filteredTemplates = AGENT_TEMPLATES.filter((template) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !template.name.toLowerCase().includes(query) &&
        !template.description.toLowerCase().includes(query) &&
        !template.skills.some((s) => s.toLowerCase().includes(query))
      ) {
        return false;
      }
    }

    // Category filter
    if (selectedSubCategory) {
      const domainMap: Record<string, string> = {
        "access-management": "Access Management",
        approvals: "Approvals",
        "customer-success": "Customer Success",
        general: "General",
        "human-resources": "Human Resources",
      };
      if (template.domain !== domainMap[selectedSubCategory]) {
        return false;
      }
    }

    return true;
  });

  const handleSelectTemplate = (template: AgentTemplate) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-6xl w-[90vw] h-[80vh] max-h-[800px] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-6">
          <h2 className="text-lg font-semibold">Agent Library</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded hover:bg-muted transition-colors opacity-70 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-8 pb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search templates"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex gap-6 px-8 pb-8 overflow-hidden">
          {/* Left sidebar */}
          <div className="w-[316px] flex-shrink-0 overflow-y-auto">
            <div className="space-y-1">
              {CATEGORIES.map((category) => (
                <div key={category.id}>
                  {/* Category button */}
                  {category.children ? (
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-2 py-2 rounded-md text-sm text-left transition-colors",
                        "hover:bg-muted"
                      )}
                    >
                      <span>{category.name}</span>
                      {expandedCategories.includes(category.id) ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedCategory(category.id);
                        setSelectedSubCategory(null);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2 py-2 rounded-md text-sm text-left transition-colors",
                        selectedCategory === category.id && !selectedSubCategory
                          ? "bg-muted font-medium"
                          : "hover:bg-muted"
                      )}
                    >
                      <span>
                        {category.name}
                        {category.count && ` (${category.count})`}
                      </span>
                      {category.id !== "all" && <ChevronRight className="size-4" />}
                    </button>
                  )}

                  {/* Subcategories */}
                  {category.children && expandedCategories.includes(category.id) && (
                    <div className="ml-6 pl-4 border-l space-y-0.5 py-0.5">
                      {category.children.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => {
                            setSelectedCategory(category.id);
                            setSelectedSubCategory(sub.id);
                          }}
                          className={cn(
                            "w-full px-2 py-1.5 rounded-md text-sm text-left transition-colors",
                            selectedSubCategory === sub.id
                              ? "bg-muted font-medium"
                              : "hover:bg-muted"
                          )}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Middle content - agent cards */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <p className="text-sm text-muted-foreground mb-2">Agents</p>
            <div className="space-y-3">
              {filteredTemplates.map((template) => {
                const Icon = ICON_MAP[template.iconId] || Bot;
                const isSelected = selectedTemplate?.id === template.id;
                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={cn(
                      "w-full text-left border rounded-lg p-4 transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground/30 hover:bg-accent/30"
                    )}
                  >
                    <div className="flex gap-3 items-center">
                      {/* Icon */}
                      <div
                        className={cn(
                          "w-[56px] h-[56px] rounded-lg flex items-center justify-center flex-shrink-0",
                          template.iconBg
                        )}
                      >
                        <Icon className={cn("size-6", template.iconColor || "text-foreground")} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold tracking-tight truncate">
                          {template.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredTemplates.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Bot className="size-12 mx-auto mb-4 opacity-50" />
                  <p>No templates found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          </div>

          {/* Right preview panel */}
          <div className={cn(
            "w-[320px] flex-shrink-0 border-l pl-6 transition-all",
            selectedTemplate ? "opacity-100" : "opacity-50"
          )}>
            {selectedTemplate ? (
              <div className="h-full flex flex-col">
                {/* Preview header */}
                <div className="flex items-start gap-3 mb-4">
                  {(() => {
                    const Icon = ICON_MAP[selectedTemplate.iconId] || Bot;
                    return (
                      <div
                        className={cn(
                          "w-[64px] h-[64px] rounded-lg flex items-center justify-center flex-shrink-0",
                          selectedTemplate.iconBg
                        )}
                      >
                        <Icon className={cn("size-7", selectedTemplate.iconColor || "text-foreground")} />
                      </div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold tracking-tight">
                      {selectedTemplate.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      by {selectedTemplate.creator}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.description}
                  </p>
                </div>

                {/* Skills */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Skills included</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTemplate.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-muted rounded-md"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Domain */}
                <div className="mb-6">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Domain</p>
                  <span className="px-2 py-1 text-xs bg-muted rounded-md">
                    {selectedTemplate.domain}
                  </span>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Action button */}
                <button
                  onClick={handleUseTemplate}
                  className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Use this template
                </button>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <Bot className="size-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Select an agent to preview
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
