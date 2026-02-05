/**
 * AgentBuilderPage - Concept switcher for different builder experiences
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { VisualWorkflowBuilder } from './VisualWorkflowBuilder';
import { GuidedBuilder } from './GuidedBuilder';
import { ChatDrivenBuilder } from './ChatDrivenBuilder';
import { WizardBuilder } from './WizardBuilder';
import { CanvasBuilder } from './CanvasBuilder';
import { UnifiedAgentBuilder } from './UnifiedAgentBuilder';
import type { AgentDefinition, AgentType, BuilderPhase } from './types';
import { AGENT_TYPE_META } from './types';
import { Card } from '@/components/ui/card';
import {
  Workflow, MessageSquare, ListChecks, PencilRuler, LayoutGrid,
  ChevronDown, Check, Layers,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────
// Types & Config
// ─────────────────────────────────────────────────────────────────────

type BuilderConcept = 'unified' | 'visual' | 'guided' | 'chat-driven' | 'wizard' | 'canvas';

interface ConceptOption {
  id: BuilderConcept;
  label: string;
  description: string;
  icon: typeof Workflow;
  color: string;
}

const CONCEPTS: ConceptOption[] = [
  {
    id: 'unified',
    label: 'Unified Builder',
    description: '3-pane: Config + Workflow + Chat/Test (Recommended)',
    icon: Layers,
    color: 'bg-indigo-500',
  },
  {
    id: 'visual',
    label: 'Visual Builder',
    description: 'React Flow canvas with drag & drop nodes',
    icon: Workflow,
    color: 'bg-violet-500',
  },
  {
    id: 'guided',
    label: 'Guided Builder',
    description: 'Step-by-step tabbed form with AI assistant',
    icon: ListChecks,
    color: 'bg-emerald-500',
  },
  {
    id: 'chat-driven',
    label: 'Chat-Driven',
    description: 'Conversational builder with inline actions',
    icon: MessageSquare,
    color: 'bg-blue-500',
  },
  {
    id: 'wizard',
    label: 'Classic Wizard',
    description: 'Traditional multi-step form wizard',
    icon: PencilRuler,
    color: 'bg-amber-500',
  },
  {
    id: 'canvas',
    label: 'Canvas Builder',
    description: 'Freeform drag & drop workflow canvas',
    icon: LayoutGrid,
    color: 'bg-rose-500',
  },
];

const DEFAULT_AGENT: Partial<AgentDefinition> = {
  name: '',
  description: '',
  type: undefined,
  status: 'draft',
  knowledgeSources: [],
  steps: [],
  completionRules: [
    { type: 'user_confirmed', enabled: true },
    { type: 'max_turns', enabled: true, value: 10 },
  ],
  guardrails: [
    { type: 'pii_redaction', enabled: true },
  ],
};

// ─────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────

export function AgentBuilderPage() {
  const [concept, setConcept] = useState<BuilderConcept>('unified');
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [phase, setPhase] = useState<BuilderPhase>('setup');
  const [agent, setAgent] = useState<Partial<AgentDefinition>>(DEFAULT_AGENT);

  const currentConcept = CONCEPTS.find(c => c.id === concept)!;

  const handleSelectType = (type: AgentType) => {
    setAgent({ ...agent, type });
  };

  const handleReset = () => {
    setAgent(DEFAULT_AGENT);
    setPhase('setup');
  };

  // ─────────────────────────────────────────────────────────────────────
  // Full-page builders (no wrapper needed)
  // ─────────────────────────────────────────────────────────────────────

  // Unified Builder - 3-pane layout (Recommended)
  if (concept === 'unified') {
    return (
      <div className="h-full flex flex-col">
        <ConceptSwitcherBar
          currentConcept={currentConcept}
          showSwitcher={showSwitcher}
          setShowSwitcher={setShowSwitcher}
          setConcept={setConcept}
        />
        <div className="flex-1">
          <UnifiedAgentBuilder />
        </div>
      </div>
    );
  }

  // Visual Builder - full page React Flow
  if (concept === 'visual') {
    return (
      <div className="h-full flex flex-col">
        <ConceptSwitcherBar
          currentConcept={currentConcept}
          showSwitcher={showSwitcher}
          setShowSwitcher={setShowSwitcher}
          setConcept={setConcept}
        />
        <div className="flex-1">
          <VisualWorkflowBuilder />
        </div>
      </div>
    );
  }

  // Guided Builder - full page tabbed form
  if (concept === 'guided') {
    return (
      <div className="h-full flex flex-col">
        <ConceptSwitcherBar
          currentConcept={currentConcept}
          showSwitcher={showSwitcher}
          setShowSwitcher={setShowSwitcher}
          setConcept={setConcept}
        />
        <div className="flex-1">
          <GuidedBuilder />
        </div>
      </div>
    );
  }

  // Chat-Driven Builder - full page chat
  if (concept === 'chat-driven') {
    return (
      <div className="h-full flex flex-col">
        <ConceptSwitcherBar
          currentConcept={currentConcept}
          showSwitcher={showSwitcher}
          setShowSwitcher={setShowSwitcher}
          setConcept={setConcept}
        />
        <div className="flex-1">
          <ChatDrivenBuilder />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Phase-based builders (wizard, canvas)
  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      <ConceptSwitcherBar
        currentConcept={currentConcept}
        showSwitcher={showSwitcher}
        setShowSwitcher={setShowSwitcher}
        setConcept={setConcept}
      />

      {/* Phase Stepper */}
      <div className="px-4 py-3 bg-white border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(['setup', 'build', 'preview', 'publish'] as BuilderPhase[]).map((p, i) => (
            <button
              key={p}
              onClick={() => setPhase(p)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                phase === p
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                phase === p ? 'bg-white/20' : 'bg-slate-200'
              }`}>
                {i + 1}
              </span>
              <span className="capitalize">{p}</span>
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Reset
        </Button>
      </div>

      {/* Builder Content */}
      <div className="flex-1 overflow-hidden">
        {phase === 'setup' && (
          <SetupPhase
            agent={agent}
            onChange={setAgent}
            onSelectType={handleSelectType}
            onNext={() => setPhase('build')}
          />
        )}

        {phase === 'build' && concept === 'wizard' && (
          <WizardBuilder
            agent={agent}
            onChange={setAgent}
            onBack={() => setPhase('setup')}
            onNext={() => setPhase('preview')}
          />
        )}

        {phase === 'build' && concept === 'canvas' && (
          <CanvasBuilder
            agent={agent}
            onChange={setAgent}
            onBack={() => setPhase('setup')}
            onNext={() => setPhase('preview')}
          />
        )}

        {phase === 'preview' && (
          <PreviewPhase
            agent={agent}
            onBack={() => setPhase('build')}
            onNext={() => setPhase('publish')}
          />
        )}

        {phase === 'publish' && (
          <PublishPhase
            agent={agent}
            onBack={() => setPhase('preview')}
            onPublish={() => alert('Published! (mock)')}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Concept Switcher Bar
// ─────────────────────────────────────────────────────────────────────

interface ConceptSwitcherBarProps {
  currentConcept: ConceptOption;
  showSwitcher: boolean;
  setShowSwitcher: (show: boolean) => void;
  setConcept: (concept: BuilderConcept) => void;
}

function ConceptSwitcherBar({
  currentConcept,
  showSwitcher,
  setShowSwitcher,
  setConcept,
}: ConceptSwitcherBarProps) {
  return (
    <div className="relative">
      <div className="px-4 py-2 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Builder Experience
          </span>
          <button
            onClick={() => setShowSwitcher(!showSwitcher)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <div className={`w-5 h-5 rounded ${currentConcept.color} flex items-center justify-center`}>
              <currentConcept.icon className="w-3 h-3 text-white" />
            </div>
            <span className="font-medium text-sm">{currentConcept.label}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showSwitcher ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <span className="text-xs text-slate-500">
          Click to switch between different builder UX concepts
        </span>
      </div>

      {/* Dropdown */}
      {showSwitcher && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowSwitcher(false)}
          />
          <div className="absolute top-full left-4 mt-2 w-80 bg-white rounded-xl shadow-xl border z-50 overflow-hidden">
            <div className="p-2">
              {CONCEPTS.map((c) => {
                const Icon = c.icon;
                const isActive = c.id === currentConcept.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setConcept(c.id);
                      setShowSwitcher(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      isActive ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center text-white`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{c.label}</div>
                      <div className="text-xs text-slate-500 truncate">{c.description}</div>
                    </div>
                    {isActive && (
                      <Check className="w-4 h-4 text-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Setup Phase
// ─────────────────────────────────────────────────────────────────────

interface SetupPhaseProps {
  agent: Partial<AgentDefinition>;
  onChange: (agent: Partial<AgentDefinition>) => void;
  onSelectType: (type: AgentType) => void;
  onNext: () => void;
}

function SetupPhase({ agent, onChange, onSelectType, onNext }: SetupPhaseProps) {
  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Name your agent</h2>
          <input
            type="text"
            className="w-full px-4 py-3 border rounded-lg text-lg"
            placeholder="e.g., Benefits Expert, Password Reset Helper"
            value={agent.name || ''}
            onChange={(e) => onChange({ ...agent, name: e.target.value })}
          />
          <textarea
            className="w-full px-4 py-3 border rounded-lg resize-none"
            rows={3}
            placeholder="Describe what this agent does..."
            value={agent.description || ''}
            onChange={(e) => onChange({ ...agent, description: e.target.value })}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium">Choose agent type</h2>
          <div className="grid grid-cols-3 gap-4">
            {(Object.entries(AGENT_TYPE_META) as [AgentType, typeof AGENT_TYPE_META[AgentType]][]).map(
              ([type, meta]) => (
                <Card
                  key={type}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    agent.type === type ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => onSelectType(type)}
                >
                  <div className="text-3xl mb-2">{meta.icon}</div>
                  <h3 className="font-medium">{meta.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{meta.description}</p>
                </Card>
              )
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium">Set trigger</h2>
          <div className="flex gap-2">
            {(['keyword', 'intent', 'scheduled', 'api'] as const).map((t) => (
              <button
                key={t}
                className={`px-4 py-2 rounded-lg border capitalize ${
                  agent.trigger?.type === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
                onClick={() => onChange({ ...agent, trigger: { type: t, value: '' } })}
              >
                {t}
              </button>
            ))}
          </div>
          {agent.trigger && (
            <input
              type="text"
              className="w-full px-4 py-2 border rounded-lg"
              placeholder={`Enter ${agent.trigger.type} value...`}
              value={agent.trigger.value}
              onChange={(e) =>
                onChange({ ...agent, trigger: { ...agent.trigger!, value: e.target.value } })
              }
            />
          )}
        </section>

        <div className="pt-4">
          <Button
            size="lg"
            className="w-full"
            disabled={!agent.name || !agent.type}
            onClick={onNext}
          >
            Continue to Build →
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Preview Phase
// ─────────────────────────────────────────────────────────────────────

interface PreviewPhaseProps {
  agent: Partial<AgentDefinition>;
  onBack: () => void;
  onNext: () => void;
}

function PreviewPhase({ agent, onBack, onNext }: PreviewPhaseProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'agent'; content: string }[]>([]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: `[${agent.name}] I received your message: "${input}". This is a mock preview response.`,
        },
      ]);
    }, 500);
    setInput('');
  };

  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col border-r">
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-medium">Interactive Preview</h2>
          <p className="text-sm text-muted-foreground">Test your agent before publishing</p>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <p>Start a conversation to test your agent</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {['What can you help me with?', 'Hello', 'I need help'].map((q) => (
                  <button
                    key={q}
                    className="px-3 py-1.5 bg-muted rounded-full text-sm hover:bg-muted/80"
                    onClick={() => setInput(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-lg ${
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 px-4 py-2 border rounded-lg"
              placeholder="Type a test message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button onClick={handleSend}>Send</Button>
          </div>
        </div>
      </div>

      <div className="w-80 flex flex-col">
        <div className="p-4 border-b bg-muted/30">
          <h3 className="font-medium">Execution Log</h3>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-2 text-sm font-mono">
            <div className="text-green-600">[00:00] Agent initialized</div>
            <div className="text-muted-foreground">[00:01] Waiting for input...</div>
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === 'user' ? 'text-blue-600' : 'text-purple-600'}>
                [{String(i).padStart(2, '0')}:{String((i + 1) * 2).padStart(2, '0')}]{' '}
                {msg.role === 'user' ? 'User input received' : 'Response generated'}
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t flex gap-2">
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <Button className="flex-1" onClick={onNext}>
            Continue to Publish →
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Publish Phase
// ─────────────────────────────────────────────────────────────────────

interface PublishPhaseProps {
  agent: Partial<AgentDefinition>;
  onBack: () => void;
  onPublish: () => void;
}

function PublishPhase({ agent, onBack, onPublish }: PublishPhaseProps) {
  const [versionNote, setVersionNote] = useState('');

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h2 className="text-xl font-semibold">Ready to Publish</h2>
          <p className="text-muted-foreground">Review your agent before going live</p>
        </div>

        <Card className="p-6 space-y-4">
          <h3 className="font-medium">Agent Summary</h3>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{agent.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium capitalize">{agent.type?.replace('_', ' ') || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Trigger</dt>
              <dd className="font-medium">{agent.trigger?.type || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">{agent.status}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-medium">Pre-publish Checklist</h3>
          <ul className="space-y-2">
            {[
              { label: 'Agent name set', passed: !!agent.name },
              { label: 'Type selected', passed: !!agent.type },
              { label: 'Trigger configured', passed: !!agent.trigger?.value },
              { label: 'Completion rules set', passed: (agent.completionRules?.length || 0) > 0 },
            ].map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <span className={item.passed ? 'text-green-600' : 'text-muted-foreground'}>
                  {item.passed ? '✓' : '○'}
                </span>
                <span className={item.passed ? '' : 'text-muted-foreground'}>{item.label}</span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-2">
          <label className="text-sm font-medium">Version Note</label>
          <textarea
            className="w-full px-4 py-3 border rounded-lg resize-none"
            rows={3}
            placeholder="Describe what changed in this version..."
            value={versionNote}
            onChange={(e) => setVersionNote(e.target.value)}
          />
        </div>

        <div className="flex gap-4">
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <Button className="flex-1" onClick={onPublish}>
            Publish Agent
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AgentBuilderPage;
