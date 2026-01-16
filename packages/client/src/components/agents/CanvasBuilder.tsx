/**
 * CanvasBuilder - v3 Agent Builder with visual workflow canvas
 *
 * Features:
 * - Left sidebar with Content, Vector Stores, Tools, Prompts, Conversations
 * - Center canvas with React Flow node editor
 * - Right panel with Jarvis AI chat assistant
 * - Drag & drop nodes from toolbox to canvas
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  Handle,
  Position,
  type NodeProps,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Send,
  Loader2,
  FolderOpen,
  Database,
  Wrench,
  FileText,
  MessageSquare,
  Plus,
  Trash2,
  User,
  Cog,
  Globe,
  Zap,
  Search,
  Ticket,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Sparkles,
} from "lucide-react";

// --- Custom Node Types ---

interface CustomNodeData extends Record<string, unknown> {
  label?: string;
}

// User Input Node
function UserInputNode({ data }: NodeProps<Node<CustomNodeData>>) {
  return (
    <div className="px-4 py-3 shadow-md rounded-xl bg-white border-2 border-blue-200 min-w-[180px]">
      <Handle type="source" position={Position.Right} className="!bg-blue-500 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <User className="size-4 text-blue-600" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Trigger</div>
          <div className="text-sm font-medium">{data.label || "User Input"}</div>
        </div>
      </div>
    </div>
  );
}

// Process Node
function ProcessNode({ data }: NodeProps<Node<CustomNodeData>>) {
  return (
    <div className="px-4 py-3 shadow-md rounded-xl bg-white border-2 border-purple-200 min-w-[180px]">
      <Handle type="target" position={Position.Left} className="!bg-purple-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!bg-purple-500 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-purple-100 flex items-center justify-center">
          <Cog className="size-4 text-purple-600" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Process</div>
          <div className="text-sm font-medium">{data.label || "Process Step"}</div>
        </div>
      </div>
    </div>
  );
}

// API Call Node
function ApiNode({ data }: NodeProps<Node<CustomNodeData>>) {
  return (
    <div className="px-4 py-3 shadow-md rounded-xl bg-white border-2 border-emerald-200 min-w-[180px]">
      <Handle type="target" position={Position.Left} className="!bg-emerald-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!bg-emerald-500 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <Globe className="size-4 text-emerald-600" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">API</div>
          <div className="text-sm font-medium">{data.label || "Call API"}</div>
        </div>
      </div>
    </div>
  );
}

// Action Node
function ActionNode({ data }: NodeProps<Node<CustomNodeData>>) {
  return (
    <div className="px-4 py-3 shadow-md rounded-xl bg-white border-2 border-orange-200 min-w-[180px]">
      <Handle type="target" position={Position.Left} className="!bg-orange-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!bg-orange-500 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-orange-100 flex items-center justify-center">
          <Zap className="size-4 text-orange-600" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Action</div>
          <div className="text-sm font-medium">{data.label || "Run Action"}</div>
        </div>
      </div>
    </div>
  );
}

// Output Node
function OutputNode({ data }: NodeProps<Node<CustomNodeData>>) {
  return (
    <div className="px-4 py-3 shadow-md rounded-xl bg-white border-2 border-slate-200 min-w-[180px]">
      <Handle type="target" position={Position.Left} className="!bg-slate-500 !w-3 !h-3" />
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center">
          <MessageSquare className="size-4 text-slate-600" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Output</div>
          <div className="text-sm font-medium">{data.label || "Response"}</div>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  userInput: UserInputNode,
  process: ProcessNode,
  api: ApiNode,
  action: ActionNode,
  output: OutputNode,
};

// --- Sidebar Items ---

interface SidebarSection {
  id: string;
  label: string;
  icon: React.ElementType;
  items: { id: string; name: string; description: string; icon?: React.ElementType }[];
}

const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: "content",
    label: "Content",
    icon: FolderOpen,
    items: [
      { id: "hr-policies", name: "HR Policies", description: "Company policies" },
      { id: "benefits-guide", name: "Benefits Guide", description: "Insurance & 401k" },
      { id: "it-docs", name: "IT Documentation", description: "Tech guides" },
    ],
  },
  {
    id: "vector-stores",
    label: "Vector Stores",
    icon: Database,
    items: [
      { id: "company-kb", name: "Company KB", description: "Main knowledge base" },
      { id: "support-tickets", name: "Support History", description: "Past tickets" },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    icon: Wrench,
    items: [
      { id: "lookup-tickets", name: "Lookup Tickets", description: "Search ticket history", icon: Search },
      { id: "escalate-ticket", name: "Escalate Ticket", description: "Escalate to human", icon: ArrowUpRight },
      { id: "create-ticket", name: "Create Ticket", description: "Open new ticket", icon: Ticket },
      { id: "password-reset", name: "Password Reset", description: "Reset AD password", icon: Zap },
    ],
  },
  {
    id: "prompts",
    label: "Prompts",
    icon: FileText,
    items: [
      { id: "system-prompt", name: "System Prompt", description: "Base instructions" },
      { id: "greeting", name: "Greeting", description: "Welcome message" },
      { id: "escalation", name: "Escalation", description: "Handoff message" },
    ],
  },
  {
    id: "conversations",
    label: "Conversations",
    icon: MessageSquare,
    items: [
      { id: "recent-1", name: "John D. - Password", description: "2 hours ago" },
      { id: "recent-2", name: "Sarah M. - Benefits", description: "Yesterday" },
    ],
  },
];

// --- Draggable Tool Items ---

const CANVAS_TOOLS = [
  { type: "userInput", label: "User Input", icon: User, color: "blue" },
  { type: "process", label: "Process", icon: Cog, color: "purple" },
  { type: "api", label: "API Call", icon: Globe, color: "emerald" },
  { type: "action", label: "Action", icon: Zap, color: "orange" },
  { type: "output", label: "Output", icon: MessageSquare, color: "slate" },
];

// --- Jarvis Chat ---

interface JarvisMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// --- Main Component ---

interface CanvasBuilderProps {
  initialConfig?: {
    name: string;
    description: string;
  };
  onBack: () => void;
  onPublish: (config: { name: string; description: string }) => void;
  isEditing?: boolean;
}

export function CanvasBuilder({
  initialConfig,
  onBack,
  onPublish,
  isEditing: _isEditing,
}: CanvasBuilderProps) {
  // Canvas state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([
    {
      id: "1",
      type: "userInput",
      position: { x: 100, y: 200 },
      data: { label: "User Input" },
    },
    {
      id: "2",
      type: "process",
      position: { x: 350, y: 200 },
      data: { label: "Process Order" },
    },
    {
      id: "3",
      type: "api",
      position: { x: 600, y: 200 },
      data: { label: "Call API" },
    },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([
    { id: "e1-2", source: "1", target: "2", animated: true },
    { id: "e2-3", source: "2", target: "3", animated: true },
  ]);

  // Sidebar state
  const [expandedSections, setExpandedSections] = useState<string[]>(["tools"]);
  const [sidebarSearch, setSidebarSearch] = useState("");

  // Jarvis chat state
  const [jarvisMessages, setJarvisMessages] = useState<JarvisMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm Jarvis, your AI assistant. I can help you build your agent workflow. What would you like to create?",
    },
  ]);
  const [jarvisInput, setJarvisInput] = useState("");
  const [isJarvisLoading, setIsJarvisLoading] = useState(false);
  const jarvisEndRef = useRef<HTMLDivElement>(null);

  // Agent config
  const [agentName, setAgentName] = useState(initialConfig?.name || "New Agent");

  // Auto-scroll Jarvis chat
  useEffect(() => {
    jarvisEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [jarvisMessages]);

  // Connect edges
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  // Toggle sidebar section
  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Handle drag start from toolbox
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.setData("label", label);
    event.dataTransfer.effectAllowed = "move";
  };

  // Handle drop on canvas
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      const label = event.dataTransfer.getData("label");
      if (!type) return;

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 90,
        y: event.clientY - reactFlowBounds.top - 25,
      };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: label || type },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Handle Jarvis chat
  const handleJarvisSend = async () => {
    if (!jarvisInput.trim() || isJarvisLoading) return;

    const userMsg: JarvisMessage = {
      id: Date.now().toString(),
      role: "user",
      content: jarvisInput.trim(),
    };
    setJarvisMessages((prev) => [...prev, userMsg]);
    const input = jarvisInput.trim().toLowerCase();
    setJarvisInput("");
    setIsJarvisLoading(true);

    // Simulate AI response
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 800));

    let response = "";
    if (input.includes("password") || input.includes("reset")) {
      response = "I can help you build a password reset workflow. I'll add the necessary nodes to your canvas:\n\n1. User Input (trigger)\n2. Verify Identity (process)\n3. Reset in AD (API call)\n4. Send Confirmation (output)\n\nWould you like me to connect these automatically?";
    } else if (input.includes("ticket") || input.includes("escalate")) {
      response = "For ticket escalation, you'll want to:\n\n1. Check ticket status first\n2. Determine escalation criteria\n3. Route to appropriate team\n\nI can add these nodes to your canvas. Should I proceed?";
    } else if (input.includes("help") || input.includes("what can")) {
      response = "I can help you:\n\n• Design agent workflows visually\n• Add and connect nodes on the canvas\n• Configure tools and knowledge sources\n• Test your agent before publishing\n\nJust describe what you want to build!";
    } else {
      response = `I understand you want to work on "${input}". Let me help you design that workflow. Could you tell me more about:\n\n1. What triggers this workflow?\n2. What steps should it include?\n3. What's the expected output?`;
    }

    setJarvisMessages((prev) => [
      ...prev,
      { id: (Date.now() + 1).toString(), role: "assistant", content: response },
    ]);
    setIsJarvisLoading(false);
  };

  // Delete selected nodes
  const handleDeleteSelected = () => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
  };

  return (
    <div className="h-full flex">
      {/* Left Sidebar */}
      <div className="w-64 border-r bg-white flex flex-col">
        {/* Header */}
        <div className="p-3 border-b">
          <div className="flex items-center gap-2 mb-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="size-8">
              <ArrowLeft className="size-4" />
            </Button>
            <Input
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="h-8 font-medium"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto">
          {SIDEBAR_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSections.includes(section.id);
            const filteredItems = sidebarSearch
              ? section.items.filter(
                  (item) =>
                    item.name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
                    item.description.toLowerCase().includes(sidebarSearch.toLowerCase())
                )
              : section.items;

            if (sidebarSearch && filteredItems.length === 0) return null;

            return (
              <div key={section.id} className="border-b">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                  <Icon className="size-4" />
                  <span className="text-sm font-medium flex-1 text-left">{section.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {filteredItems.length}
                  </Badge>
                </button>
                {isExpanded && (
                  <div className="pb-2">
                    {filteredItems.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.id}
                          className="w-full flex items-center gap-2 px-3 py-2 pl-9 hover:bg-muted/50 transition-colors text-left"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("application/reactflow", "action");
                            e.dataTransfer.setData("label", item.name);
                          }}
                        >
                          {ItemIcon ? (
                            <ItemIcon className="size-4 text-muted-foreground" />
                          ) : (
                            <GripVertical className="size-4 text-muted-foreground" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{item.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {item.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    <button className="w-full flex items-center gap-2 px-3 py-2 pl-9 text-muted-foreground hover:text-foreground transition-colors">
                      <Plus className="size-4" />
                      <span className="text-sm">Add new</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Center Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Drag to add:</span>
            {CANVAS_TOOLS.map((tool) => {
              const ToolIcon = tool.icon;
              return (
                <div
                  key={tool.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, tool.type, tool.label)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-grab active:cursor-grabbing transition-colors",
                    "hover:bg-muted/50 bg-white"
                  )}
                >
                  <ToolIcon className="size-3.5" />
                  <span className="text-xs">{tool.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDeleteSelected}>
              <Trash2 className="size-4 mr-1" />
              Delete
            </Button>
            <Button size="sm" onClick={() => onPublish({ name: agentName, description: "" })}>
              Publish
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            className="bg-slate-50"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls />
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
              className="!bg-white !border !rounded-lg"
            />
          </ReactFlow>
        </div>
      </div>

      {/* Right Panel - Jarvis Chat */}
      <div className="w-80 border-l bg-white flex flex-col">
        {/* Header */}
        <div className="p-3 border-b flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="size-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium">Jarvis</div>
            <div className="text-xs text-muted-foreground">AI Assistant</div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {jarvisMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="size-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="size-3 text-white" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] px-3 py-2 rounded-xl text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isJarvisLoading && (
            <div className="flex gap-2">
              <div className="size-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="size-3 text-white" />
              </div>
              <div className="bg-muted px-3 py-2 rounded-xl rounded-bl-md">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={jarvisEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Input
              value={jarvisInput}
              onChange={(e) => setJarvisInput(e.target.value)}
              placeholder="Ask Jarvis..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleJarvisSend();
                }
              }}
              disabled={isJarvisLoading}
            />
            <Button
              size="icon"
              onClick={handleJarvisSend}
              disabled={!jarvisInput.trim() || isJarvisLoading}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
