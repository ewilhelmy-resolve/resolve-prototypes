/**
 * VisualWorkflowBuilder - Vercel-inspired workflow builder using React Flow
 *
 * Clean entry → Visual canvas with React Flow → Right panel config
 */

import { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  type Node,
  type Edge,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  Handle,
  Position,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Play, Settings, MessageSquare,
  ChevronLeft, Plus, Search,
  Square, Flag, StickyNote, Shield, Plug, GitBranch, Trash2,
  ChevronDown, Copy, Code, Eye, Workflow, Undo2, Redo2,
  FileText, MoreHorizontal, Zap, Bot, Database,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

type AgentType = 'workflow' | 'chatflow';

interface NodeConfig {
  name?: string;
  instructions?: string;
  context?: 'full_conversation' | 'last_message' | 'custom';
  model?: string;
  reasoningEffort?: 'low' | 'medium' | 'high';
  tools?: string[];
  outputFormat?: 'text' | 'json' | 'widget';
}

type WorkflowNodeType = 'start' | 'end' | 'agent' | 'note' | 'file_search' | 'guardrails' | 'mcp' | 'if_else' | 'classifier' | 'llm' | 'http' | 'code';

interface WorkflowNodeData {
  label: string;
  type: WorkflowNodeType;
  config: NodeConfig;
}

// ─────────────────────────────────────────────────────────────────────
// Node Palette Config
// ─────────────────────────────────────────────────────────────────────

const NODE_CATEGORIES = [
  {
    id: 'basic',
    label: null,
    nodes: [
      { type: 'end', icon: Square, label: 'End', color: 'bg-slate-600', description: 'Terminate the flow' },
      { type: 'agent', icon: Bot, label: 'Agent', color: 'bg-blue-500', description: 'Autonomous AI agent' },
      { type: 'note', icon: StickyNote, label: 'Note', color: 'bg-yellow-500', description: 'Add documentation' },
    ],
  },
  {
    id: 'models',
    label: 'Models',
    nodes: [
      { type: 'llm', icon: Zap, label: 'LLM', color: 'bg-violet-500', description: 'Language model call' },
      { type: 'classifier', icon: GitBranch, label: 'Classifier', color: 'bg-cyan-500', description: 'Route based on input' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    nodes: [
      { type: 'file_search', icon: FileText, label: 'File search', color: 'bg-amber-500', description: 'Search documents' },
      { type: 'http', icon: Database, label: 'HTTP Request', color: 'bg-green-500', description: 'API call' },
      { type: 'code', icon: Code, label: 'Code', color: 'bg-gray-700', description: 'Run custom code' },
      { type: 'guardrails', icon: Shield, label: 'Guardrails', color: 'bg-red-500', description: 'Safety filters' },
      { type: 'mcp', icon: Plug, label: 'MCP', color: 'bg-purple-500', description: 'Model Context Protocol' },
    ],
  },
  {
    id: 'logic',
    label: 'Logic',
    nodes: [
      { type: 'if_else', icon: GitBranch, label: 'If / Else', color: 'bg-indigo-500', description: 'Conditional branching' },
    ],
  },
];

const MODEL_OPTIONS = ['gpt-4o', 'gpt-4o-mini', 'claude-3.5-sonnet', 'claude-3-opus', 'claude-3-haiku'];
const REASONING_OPTIONS = ['low', 'medium', 'high'];
const OUTPUT_FORMATS = ['Text', 'JSON', 'Widget'];

const getNodeConfig = (type: string) => {
  return NODE_CATEGORIES.flatMap(c => c.nodes).find(n => n.type === type);
};

// ─────────────────────────────────────────────────────────────────────
// Custom Node Components
// ─────────────────────────────────────────────────────────────────────

interface CustomNodeProps {
  data: WorkflowNodeData;
  selected?: boolean;
}

function StartNode({ selected }: CustomNodeProps) {
  return (
    <div className={`px-4 py-3 rounded-xl bg-white border-2 shadow-sm transition-all ${
      selected ? 'border-emerald-500 shadow-lg ring-2 ring-emerald-500/20' : 'border-slate-200'
    }`}>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white" />
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
          <Play className="w-4 h-4" />
        </div>
        <div>
          <div className="font-medium text-sm">Start</div>
          <div className="text-xs text-slate-500">Entry point</div>
        </div>
      </div>
    </div>
  );
}

function EndNode({ selected }: CustomNodeProps) {
  return (
    <div className={`px-4 py-3 rounded-xl bg-white border-2 shadow-sm transition-all ${
      selected ? 'border-slate-600 shadow-lg ring-2 ring-slate-600/20' : 'border-slate-200'
    }`}>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-slate-600 !border-2 !border-white" />
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-slate-600 flex items-center justify-center text-white">
          <Square className="w-4 h-4" />
        </div>
        <div>
          <div className="font-medium text-sm">End</div>
          <div className="text-xs text-slate-500">Exit point</div>
        </div>
      </div>
    </div>
  );
}

function AgentNode({ data, selected }: CustomNodeProps) {
  const nodeConfig = getNodeConfig(data.type);
  const Icon = nodeConfig?.icon || Flag;
  const colorClass = nodeConfig?.color || 'bg-blue-500';

  return (
    <div className={`px-4 py-3 rounded-xl bg-white border-2 shadow-sm transition-all min-w-[160px] ${
      selected ? 'border-blue-500 shadow-lg ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300'
    }`}>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white" />
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg ${colorClass} flex items-center justify-center text-white`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{data.config.name || data.label}</div>
          <div className="text-xs text-slate-500">{data.label}</div>
        </div>
      </div>
    </div>
  );
}

function ConditionNode({ data, selected }: CustomNodeProps) {
  return (
    <div className={`px-4 py-3 rounded-xl bg-white border-2 shadow-sm transition-all min-w-[160px] ${
      selected ? 'border-indigo-500 shadow-lg ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'
    }`}>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white" />
      <Handle type="source" position={Position.Right} id="true" style={{ top: '30%' }} className="!w-3 !h-3 !bg-green-500 !border-2 !border-white" />
      <Handle type="source" position={Position.Right} id="false" style={{ top: '70%' }} className="!w-3 !h-3 !bg-red-500 !border-2 !border-white" />
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
          <GitBranch className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{data.config.name || 'Condition'}</div>
          <div className="text-xs text-slate-500">If / Else</div>
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-2 text-[10px]">
        <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700">True</span>
        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700">False</span>
      </div>
    </div>
  );
}

const nodeTypes = {
  start: StartNode,
  end: EndNode,
  agent: AgentNode,
  llm: AgentNode,
  classifier: AgentNode,
  file_search: AgentNode,
  http: AgentNode,
  code: AgentNode,
  guardrails: AgentNode,
  mcp: AgentNode,
  note: AgentNode,
  if_else: ConditionNode,
};

// ─────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────

// Type alias for nodes with our custom data
type WorkflowNode = Node & { data: WorkflowNodeData };

export function VisualWorkflowBuilder() {
  const [view, setView] = useState<'create' | 'builder'>('create');
  const [agentName, setAgentName] = useState('');
  const [agentType, setAgentType] = useState<AgentType>('workflow');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [_isDraft] = useState(true);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const handleCreate = () => {
    if (!agentName.trim()) {
      setAgentName('New workflow');
    }

    // Initialize with Start node
    const initialNodes: WorkflowNode[] = [
      {
        id: 'start',
        type: 'start',
        position: { x: 100, y: 200 },
        data: { label: 'Start', type: 'start', config: {} },
      },
    ];

    setNodes(initialNodes as any);
    setView('builder');
  };

  if (view === 'create') {
    return (
      <CreateView
        agentName={agentName}
        setAgentName={setAgentName}
        agentType={agentType}
        setAgentType={setAgentType}
        onCreate={handleCreate}
      />
    );
  }

  return (
    <BuilderView
      agentName={agentName}
      setAgentName={setAgentName}
      isDraft={_isDraft}
      nodes={nodes as WorkflowNode[]}
      edges={edges}
      setNodes={setNodes as any}
      setEdges={setEdges as any}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      selectedNodeId={selectedNodeId}
      setSelectedNodeId={setSelectedNodeId}
      onBack={() => setView('create')}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────
// Create View
// ─────────────────────────────────────────────────────────────────────

interface CreateViewProps {
  agentName: string;
  setAgentName: (name: string) => void;
  agentType: AgentType;
  setAgentType: (type: AgentType) => void;
  onCreate: () => void;
}

function CreateView({ agentName, setAgentName, agentType, setAgentType, onCreate }: CreateViewProps) {
  return (
    <div className="h-full flex items-center justify-center bg-slate-50">
      <Card className="w-[520px] p-8 shadow-xl border-0">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
            <Workflow className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-semibold">Create workflow</h1>
        </div>

        <div className="space-y-6">
          {/* Type Selection */}
          <div>
            <label className="text-sm font-medium text-slate-600 mb-3 block">
              Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setAgentType('workflow')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  agentType === 'workflow'
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50'
                }`}
              >
                <Workflow className="w-5 h-5 mb-2 text-violet-600" />
                <div className="font-medium">Workflow</div>
                <div className="text-sm text-slate-500">Agentic flow for automations</div>
              </button>
              <button
                onClick={() => setAgentType('chatflow')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  agentType === 'chatflow'
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50'
                }`}
              >
                <MessageSquare className="w-5 h-5 mb-2 text-violet-600" />
                <div className="font-medium">Chatflow</div>
                <div className="text-sm text-slate-500">Multi-turn conversations</div>
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm font-medium text-slate-600 mb-2 block">
              Name
            </label>
            <Input
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="My workflow"
              className="h-12 text-lg border-slate-200 focus:border-violet-500 focus:ring-violet-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 h-11 border-slate-200">
              Cancel
            </Button>
            <Button
              className="flex-1 h-11 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              onClick={onCreate}
            >
              Create workflow
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Builder View
// ─────────────────────────────────────────────────────────────────────

interface BuilderViewProps {
  agentName: string;
  setAgentName: (name: string) => void;
  isDraft: boolean;
  nodes: WorkflowNode[];
  edges: Edge[];
  setNodes: (nodes: WorkflowNode[] | ((nodes: WorkflowNode[]) => WorkflowNode[])) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  onBack: () => void;
}

function BuilderView({
  agentName,
  setAgentName,
  isDraft,
  nodes,
  edges,
  setNodes,
  setEdges,
  onNodesChange,
  onEdgesChange,
  selectedNodeId,
  setSelectedNodeId,
  onBack,
}: BuilderViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const selectedNode = useMemo((): WorkflowNode | undefined =>
    nodes.find(n => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
    }, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const addNode = (type: WorkflowNodeType, label: string) => {
    const newNode: WorkflowNode = {
      id: `${type}-${Date.now()}`,
      type: type === 'if_else' ? 'if_else' : type,
      position: {
        x: 350 + Math.random() * 100,
        y: 150 + Math.random() * 100,
      },
      data: {
        label,
        type,
        config: {
          name: label,
          context: 'full_conversation',
          model: 'gpt-4o',
          reasoningEffort: 'low',
          outputFormat: 'text',
          instructions: '',
          tools: [],
        },
      },
    };
    setNodes(prev => [...prev, newNode] as any);
    setSelectedNodeId(newNode.id);
  };

  const updateNodeConfig = (nodeId: string, config: Partial<NodeConfig>) => {
    setNodes(prev => prev.map(n =>
      n.id === nodeId
        ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } } } as WorkflowNode
        : n
    ) as any);
  };

  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId) as any);
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-100">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
            <Workflow className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            className="text-lg font-medium bg-transparent border-none outline-none"
          />
          {isDraft && (
            <span className="flex items-center gap-1.5 text-sm text-slate-500 bg-amber-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Draft
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-slate-600">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-slate-600">
            <Settings className="w-4 h-4 mr-1.5" />
            Evaluate
          </Button>
          <Button variant="ghost" size="sm" className="text-slate-600">
            <Code className="w-4 h-4 mr-1.5" />
            Code
          </Button>
          <Button variant="outline" size="sm" className="border-slate-200">
            <Eye className="w-4 h-4 mr-1.5" />
            Preview
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
          >
            Publish
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Node Palette */}
        <div className="w-56 bg-white border-r border-slate-200 flex flex-col shadow-sm">
          {/* Search */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search nodes..."
                className="pl-9 h-9 border-slate-200 focus:border-violet-500"
              />
            </div>
          </div>

          {/* Node Categories */}
          <div className="flex-1 overflow-auto p-3 space-y-4">
            {NODE_CATEGORIES.map((category) => (
              <div key={category.id}>
                {category.label && (
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                    {category.label}
                  </div>
                )}
                <div className="space-y-1">
                  {category.nodes
                    .filter(n => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((node) => (
                      <button
                        key={node.type}
                        onClick={() => addNode(node.type as WorkflowNodeType, node.label)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left group"
                      >
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center text-white ${node.color} group-hover:scale-105 transition-transform`}>
                          <node.icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-700">{node.label}</div>
                          <div className="text-xs text-slate-400 truncate">{node.description}</div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes as any}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#94a3b8', strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
            }}
            connectionLineStyle={{ stroke: '#94a3b8', strokeWidth: 2 }}
            className="bg-slate-50"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#cbd5e1"
            />
            <Controls
              className="!bg-white !border-slate-200 !rounded-xl !shadow-lg [&>button]:!border-slate-200 [&>button]:!bg-white [&>button:hover]:!bg-slate-50"
              showInteractive={false}
            />
            <MiniMap
              className="!bg-white !border-slate-200 !rounded-xl !shadow-lg"
              nodeColor={(node) => {
                const nodeData = node.data as unknown as WorkflowNodeData | undefined;
                const config = getNodeConfig(nodeData?.type || '');
                return config?.color?.replace('bg-', '') || '#94a3b8';
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />

            {/* Bottom Toolbar */}
            <Panel position="bottom-center" className="mb-4">
              <div className="flex items-center gap-1 bg-white rounded-xl shadow-lg border border-slate-200 px-2 py-1.5">
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Undo">
                  <Undo2 className="w-4 h-4 text-slate-500" />
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Redo">
                  <Redo2 className="w-4 h-4 text-slate-500" />
                </button>
                <div className="w-px h-6 bg-slate-200 mx-1" />
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Add note">
                  <StickyNote className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Right Panel - Node Config */}
        {selectedNode && selectedNode.type !== 'start' && (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={(config) => updateNodeConfig(selectedNode.id, config)}
            onDelete={() => deleteNode(selectedNode.id)}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Node Config Panel
// ─────────────────────────────────────────────────────────────────────

interface NodeConfigPanelProps {
  node: WorkflowNode;
  onUpdate: (config: Partial<NodeConfig>) => void;
  onDelete: () => void;
  onClose: () => void;
}

function NodeConfigPanel({ node, onUpdate, onDelete, onClose: _onClose }: NodeConfigPanelProps) {
  const nodeConfig = getNodeConfig(node.data.type);
  const Icon = nodeConfig?.icon || Flag;
  const isAgentType = ['agent', 'llm', 'classifier'].includes(node.data.type);

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${nodeConfig?.color || 'bg-slate-500'} flex items-center justify-center text-white`}>
              <Icon className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-800">{node.data.config.name || node.data.label}</h3>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Duplicate">
              <Copy className="w-4 h-4 text-slate-400" />
            </button>
            <button
              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-500">
          {nodeConfig?.description || 'Configure this node'}
        </p>
      </div>

      {/* Config Fields */}
      <div className="flex-1 overflow-auto p-4 space-y-5">
        {/* Name */}
        <div>
          <label className="text-sm font-medium text-slate-600 mb-1.5 block">Name</label>
          <Input
            value={node.data.config.name || ''}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Node name"
            className="border-slate-200 focus:border-violet-500"
          />
        </div>

        {/* Instructions */}
        {isAgentType && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-600">Instructions</label>
              <div className="flex items-center gap-1">
                <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
            <textarea
              value={node.data.config.instructions || ''}
              onChange={(e) => onUpdate({ instructions: e.target.value })}
              placeholder="Enter instructions for this node..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none min-h-[100px] focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
            />
          </div>
        )}

        {/* Context */}
        {isAgentType && (
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">Context</label>
            <select
              value={node.data.config.context || 'full_conversation'}
              onChange={(e) => onUpdate({ context: e.target.value as NodeConfig['context'] })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
            >
              <option value="full_conversation">Full conversation</option>
              <option value="last_message">Last message</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        )}

        {/* Model */}
        {isAgentType && (
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">Model</label>
            <select
              value={node.data.config.model || 'gpt-4o'}
              onChange={(e) => onUpdate({ model: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
            >
              {MODEL_OPTIONS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {/* Reasoning Effort */}
        {isAgentType && (
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">Reasoning effort</label>
            <div className="flex gap-2">
              {REASONING_OPTIONS.map(r => (
                <button
                  key={r}
                  onClick={() => onUpdate({ reasoningEffort: r as NodeConfig['reasoningEffort'] })}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors capitalize ${
                    node.data.config.reasoningEffort === r
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tools */}
        {isAgentType && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-600">Tools</label>
              <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                <Plus className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
            <div className="text-sm text-slate-400 px-3 py-3 border border-dashed border-slate-300 rounded-lg text-center">
              Click + to add tools
            </div>
          </div>
        )}

        {/* Output Format */}
        {isAgentType && (
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">Output format</label>
            <select
              value={node.data.config.outputFormat || 'text'}
              onChange={(e) => onUpdate({ outputFormat: e.target.value as NodeConfig['outputFormat'] })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
            >
              {OUTPUT_FORMATS.map(f => (
                <option key={f.toLowerCase()} value={f.toLowerCase()}>{f}</option>
              ))}
            </select>
          </div>
        )}

        {/* More Options */}
        <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <ChevronDown className="w-4 h-4" />
          More options
        </button>
      </div>
    </div>
  );
}

export default VisualWorkflowBuilder;
