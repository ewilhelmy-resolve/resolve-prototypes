/**
 * UnifiedAgentBuilder - Enterprise-grade agent builder meeting all 10 requirements
 *
 * Requirements covered:
 * 1. Clear, Guided Setup - Initial modal for type/persona/goal/completion
 * 2. Hybrid Interface - 3-pane: Config | Workflow | Chat+Test
 * 3. Visual Workflow - Lightweight step flow visualization
 * 4. Actionable UI - Explicit buttons, no "type proceed"
 * 5. Test & Validation - Dedicated test panel with reasoning
 * 6. Transparency - Sources, permissions, reasoning traces
 * 7. Attachments - Files, workflows, ITSM integrations
 * 8. Lifecycle - Draft → Testing → Validated → Published
 * 9. Error Handling - Validation warnings and guidance
 * 10. Modern UI - Clean 3-pane, consistent patterns
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Bot, MessageSquare, FileText, Zap, ChevronDown,
  Play, Square, ArrowRight, Plus, Send, Upload, Check, X,
  AlertTriangle, TestTube, Rocket, Settings, RefreshCw,
  FileQuestion, Shield, Database, GitBranch, Clock, History,
  Sparkles, CheckCircle2, XCircle, AlertCircle, Loader2,
  ChevronLeft, Save,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

type AgentType = 'answer_formatter' | 'embedded_knowledge' | 'workflow_executor';
type LifecycleStatus = 'draft' | 'testing' | 'validated' | 'published';
type ConfigSection = 'setup' | 'sources' | 'actions' | 'settings';

interface AgentConfig {
  id: string;
  name: string;
  type: AgentType | null;
  persona: string;
  goal: string;
  completionCriteria: string;
  status: LifecycleStatus;
  version: number;
  knowledgeSources: KnowledgeSource[];
  actions: AgentAction[];
  settings: AgentSettings;
  steps: WorkflowStep[];
}

interface KnowledgeSource {
  id: string;
  name: string;
  type: 'file' | 'url' | 'itsm' | 'database';
  status: 'active' | 'pending' | 'error';
}

interface AgentAction {
  id: string;
  name: string;
  type: 'resolve_workflow' | 'api_call' | 'notification';
  permissions: string[];
  enabled: boolean;
}

interface AgentSettings {
  tone: 'friendly' | 'professional' | 'concise';
  fallbackBehavior: 'apologize' | 'escalate' | 'create_ticket';
  maxTurns: number;
  contextRetention: boolean;
}

interface WorkflowStep {
  id: string;
  type: 'start' | 'rag' | 'action' | 'condition' | 'response' | 'end';
  label: string;
  config?: Record<string, unknown>;
}

interface TestResult {
  id: string;
  input: string;
  output: string;
  confidence: number;
  reasoning: string[];
  status: 'passed' | 'failed' | 'pending';
  timestamp: Date;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

// ─────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────

const AGENT_TYPES = [
  {
    value: 'answer_formatter' as AgentType,
    label: 'Answer Formatter',
    description: 'Reformats and enhances RAG/ITSM responses',
    icon: MessageSquare,
    color: 'bg-blue-500',
  },
  {
    value: 'embedded_knowledge' as AgentType,
    label: 'Knowledge Agent',
    description: 'Uses uploaded documents to answer questions',
    icon: FileText,
    color: 'bg-amber-500',
  },
  {
    value: 'workflow_executor' as AgentType,
    label: 'Workflow Executor',
    description: 'Runs automations and Resolve workflows',
    icon: Zap,
    color: 'bg-violet-500',
  },
];

const LIFECYCLE_STATES: { value: LifecycleStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'bg-slate-400' },
  { value: 'testing', label: 'Testing', color: 'bg-amber-500' },
  { value: 'validated', label: 'Validated', color: 'bg-emerald-500' },
  { value: 'published', label: 'Published', color: 'bg-blue-500' },
];

const DEFAULT_CONFIG: AgentConfig = {
  id: '',
  name: '',
  type: null,
  persona: '',
  goal: '',
  completionCriteria: '',
  status: 'draft',
  version: 1,
  knowledgeSources: [],
  actions: [],
  settings: {
    tone: 'friendly',
    fallbackBehavior: 'apologize',
    maxTurns: 10,
    contextRetention: true,
  },
  steps: [],
};

// ─────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────

export function UnifiedAgentBuilder() {
  const [showSetupModal, setShowSetupModal] = useState(true);
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
  const [activeSection, setActiveSection] = useState<ConfigSection>('setup');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // ─────────────────────────────────────────────────────────────────────
  // Validation (Req #9)
  // ─────────────────────────────────────────────────────────────────────

  const validateConfig = useCallback((): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!config.name.trim()) {
      errors.push({ field: 'name', message: 'Agent name is required', severity: 'error' });
    }
    if (!config.persona.trim()) {
      errors.push({ field: 'persona', message: 'Define the agent persona', severity: 'warning' });
    }
    if (!config.goal.trim()) {
      errors.push({ field: 'goal', message: 'Specify what the agent should do', severity: 'error' });
    }
    if (!config.completionCriteria.trim()) {
      errors.push({ field: 'completionCriteria', message: 'Define completion criteria', severity: 'warning' });
    }
    if (config.type === 'embedded_knowledge' && config.knowledgeSources.length === 0) {
      errors.push({ field: 'sources', message: 'Add at least one knowledge source', severity: 'error' });
    }
    if (config.type === 'workflow_executor' && config.actions.length === 0) {
      errors.push({ field: 'actions', message: 'Add at least one action', severity: 'error' });
    }

    return errors;
  }, [config]);

  // ─────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────

  const handleSetupComplete = (setupConfig: Partial<AgentConfig>) => {
    const newConfig = {
      ...config,
      ...setupConfig,
      id: `agent-${Date.now()}`,
      steps: generateInitialSteps(setupConfig.type!),
    };
    setConfig(newConfig);
    setShowSetupModal(false);

    // Initial AI greeting
    setChatMessages([{
      id: '1',
      role: 'assistant',
      content: `I'll help you build "${setupConfig.name}". I've set up the basic workflow based on your configuration. You can:\n\n• Edit the configuration on the left\n• See the workflow in the center\n• Ask me questions here\n• Test your agent when ready`,
      timestamp: new Date(),
    }]);
  };

  const handleChatSend = () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: chatInput,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: generateAIResponse(chatInput, config),
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, aiResponse]);
    }, 800);
  };

  const handleRunTest = () => {
    setIsRunningTest(true);
    setShowTestPanel(true);

    // Simulate test execution
    setTimeout(() => {
      const result: TestResult = {
        id: `test-${Date.now()}`,
        input: 'How do I reset my password?',
        output: config.type === 'workflow_executor'
          ? 'I\'ll help you reset your password. Running AD_Password_Reset workflow...'
          : 'To reset your password, follow these steps: 1. Go to the IT portal...',
        confidence: 0.94,
        reasoning: [
          'Identified intent: password_reset (94% confidence)',
          `Matched knowledge source: ${config.knowledgeSources[0]?.name || 'IT Policies'}`,
          config.type === 'workflow_executor' ? 'Selected action: AD_Password_Reset' : 'Generated response from knowledge base',
        ],
        status: 'passed',
        timestamp: new Date(),
      };
      setTestResults(prev => [result, ...prev]);
      setIsRunningTest(false);
    }, 2000);
  };

  const handleStatusChange = (newStatus: LifecycleStatus) => {
    const errors = validateConfig();
    setValidationErrors(errors);

    if (newStatus !== 'draft' && errors.some(e => e.severity === 'error')) {
      return; // Can't advance with errors
    }

    setConfig(prev => ({
      ...prev,
      status: newStatus,
      version: newStatus === 'published' ? prev.version + 1 : prev.version,
    }));
  };

  // ─────────────────────────────────────────────────────────────────────
  // Setup Modal (Req #1)
  // ─────────────────────────────────────────────────────────────────────

  if (showSetupModal) {
    return (
      <SetupModal
        onComplete={handleSetupComplete}
        onCancel={() => setShowSetupModal(false)}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Main Builder UI (Req #2, #10)
  // ─────────────────────────────────────────────────────────────────────

  const selectedType = AGENT_TYPES.find(t => t.value === config.type);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <header className="h-14 bg-white border-b flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-slate-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-slate-500" />
          </button>
          {selectedType && (
            <div className={`w-8 h-8 rounded-lg ${selectedType.color} flex items-center justify-center text-white`}>
              <selectedType.icon className="w-4 h-4" />
            </div>
          )}
          <div>
            <h1 className="font-semibold">{config.name}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{selectedType?.label}</span>
              <span>•</span>
              <span>v{config.version}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Save className="w-4 h-4 mr-1.5" />
            Save
          </Button>
          <Button variant="outline" size="sm">
            <History className="w-4 h-4 mr-1.5" />
            History
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunTest}
            disabled={isRunningTest}
          >
            {isRunningTest ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <TestTube className="w-4 h-4 mr-1.5" />
            )}
            Test
          </Button>
          <Button
            size="sm"
            onClick={() => handleStatusChange('published')}
            disabled={config.status === 'published'}
            className="bg-gradient-to-r from-violet-500 to-purple-600"
          >
            <Rocket className="w-4 h-4 mr-1.5" />
            Publish
          </Button>
        </div>
      </header>

      {/* Lifecycle Bar (Req #8) */}
      <LifecycleBar
        status={config.status}
        onStatusChange={handleStatusChange}
        validationErrors={validationErrors}
      />

      {/* Three-Pane Layout (Req #2) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Configuration Panel */}
        <ConfigPanel
          config={config}
          setConfig={setConfig}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          validationErrors={validationErrors}
        />

        {/* Center: Workflow Visualization (Req #3) */}
        <WorkflowPanel
          config={config}
          setConfig={setConfig}
        />

        {/* Right: Chat + Test Panel (Req #5, #6) */}
        <ChatTestPanel
          chatMessages={chatMessages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          onSendMessage={handleChatSend}
          testResults={testResults}
          showTestPanel={showTestPanel}
          setShowTestPanel={setShowTestPanel}
          isRunningTest={isRunningTest}
          config={config}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Setup Modal (Req #1)
// ─────────────────────────────────────────────────────────────────────

interface SetupModalProps {
  onComplete: (config: Partial<AgentConfig>) => void;
  onCancel: () => void;
}

function SetupModal({ onComplete, onCancel }: SetupModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    type: null as AgentType | null,
    persona: '',
    goal: '',
    completionCriteria: '',
  });

  const canProceed = () => {
    switch (step) {
      case 1: return formData.name && formData.type;
      case 2: return formData.persona && formData.goal;
      case 3: return formData.completionCriteria;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete(formData);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-slate-100">
      <Card className="w-full max-w-lg shadow-2xl border-0 overflow-hidden">
        {/* Progress */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Step 1: Type & Name */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-2">Create New Agent</h2>
                <p className="text-slate-500">Choose the type and give it a name</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Agent Type</label>
                <div className="space-y-2">
                  {AGENT_TYPES.map(t => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setFormData(f => ({ ...f, type: t.value }))}
                        className={`w-full text-left p-4 rounded-xl border-2 transition flex items-center gap-3 ${
                          formData.type === t.value
                            ? 'border-violet-500 bg-violet-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg ${t.color} flex items-center justify-center text-white`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium">{t.label}</div>
                          <div className="text-xs text-slate-500">{t.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Benefits Expert, Password Helper"
                  className="h-12 text-lg"
                />
              </div>
            </div>
          )}

          {/* Step 2: Persona & Goal */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-2">Define the Agent</h2>
                <p className="text-slate-500">Describe its role and what it should do</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Agent Persona / Role
                </label>
                <textarea
                  value={formData.persona}
                  onChange={e => setFormData(f => ({ ...f, persona: e.target.value }))}
                  placeholder="e.g., Acts as a friendly, knowledgeable HR specialist who helps employees understand their benefits options..."
                  rows={3}
                  className="w-full px-4 py-3 border rounded-xl resize-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What should this agent do?
                </label>
                <textarea
                  value={formData.goal}
                  onChange={e => setFormData(f => ({ ...f, goal: e.target.value }))}
                  placeholder="e.g., Answer questions about health benefits, explain coverage options, guide through enrollment process..."
                  rows={3}
                  className="w-full px-4 py-3 border rounded-xl resize-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
            </div>
          )}

          {/* Step 3: Completion Criteria */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-2">Completion Criteria</h2>
                <p className="text-slate-500">How does the agent know when it's done?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  When is the job complete?
                </label>
                <textarea
                  value={formData.completionCriteria}
                  onChange={e => setFormData(f => ({ ...f, completionCriteria: e.target.value }))}
                  placeholder="e.g., When the user confirms their question has been answered, or when they complete enrollment, or after providing contact information for follow-up..."
                  rows={4}
                  className="w-full px-4 py-3 border rounded-xl resize-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="font-medium text-sm mb-2">Common completion patterns:</h4>
                <div className="space-y-2">
                  {[
                    'User explicitly confirms satisfaction',
                    'Requested action completes successfully',
                    'User reaches a specific page or state',
                    'After maximum number of exchanges',
                  ].map((pattern, i) => (
                    <button
                      key={i}
                      onClick={() => setFormData(f => ({ ...f, completionCriteria: pattern }))}
                      className="block w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-slate-100 transition"
                    >
                      {pattern}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-slate-50 flex items-center justify-between">
          <Button variant="ghost" onClick={step > 1 ? () => setStep(step - 1) : onCancel}>
            {step > 1 ? '← Back' : 'Cancel'}
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Step {step} of 3</span>
            <Button onClick={handleNext} disabled={!canProceed()}>
              {step === 3 ? 'Create Agent' : 'Continue'} →
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Lifecycle Bar (Req #8)
// ─────────────────────────────────────────────────────────────────────

interface LifecycleBarProps {
  status: LifecycleStatus;
  onStatusChange: (status: LifecycleStatus) => void;
  validationErrors: ValidationError[];
}

function LifecycleBar({ status, onStatusChange, validationErrors }: LifecycleBarProps) {
  const currentIndex = LIFECYCLE_STATES.findIndex(s => s.value === status);
  const hasErrors = validationErrors.some(e => e.severity === 'error');

  return (
    <div className="px-4 py-2 bg-white border-b flex items-center justify-between">
      <div className="flex items-center gap-1">
        {LIFECYCLE_STATES.map((state, i) => {
          const isActive = state.value === status;
          const isPast = i < currentIndex;
          const canClick = i <= currentIndex + 1 && !hasErrors;

          return (
            <div key={state.value} className="flex items-center">
              <button
                onClick={() => canClick && onStatusChange(state.value)}
                disabled={!canClick}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                  isActive
                    ? `${state.color} text-white`
                    : isPast
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-slate-100 text-slate-400'
                } ${canClick && !isActive ? 'hover:opacity-80 cursor-pointer' : ''}`}
              >
                {isPast && <Check className="w-3.5 h-3.5" />}
                {isActive && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                <span>{state.label}</span>
              </button>
              {i < LIFECYCLE_STATES.length - 1 && (
                <ArrowRight className={`w-4 h-4 mx-1 ${isPast ? 'text-slate-400' : 'text-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {hasErrors && (
        <div className="flex items-center gap-2 text-sm text-amber-600">
          <AlertTriangle className="w-4 h-4" />
          <span>{validationErrors.filter(e => e.severity === 'error').length} issues to resolve</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Config Panel (Req #2, #7)
// ─────────────────────────────────────────────────────────────────────

interface ConfigPanelProps {
  config: AgentConfig;
  setConfig: React.Dispatch<React.SetStateAction<AgentConfig>>;
  activeSection: ConfigSection;
  setActiveSection: (section: ConfigSection) => void;
  validationErrors: ValidationError[];
}

function ConfigPanel({ config, setConfig, activeSection, setActiveSection, validationErrors }: ConfigPanelProps) {
  const sections: { id: ConfigSection; label: string; icon: typeof Settings }[] = [
    { id: 'setup', label: 'Setup', icon: Bot },
    { id: 'sources', label: 'Sources', icon: Database },
    { id: 'actions', label: 'Actions', icon: Zap },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const getErrorsForSection = (section: ConfigSection) => {
    const fieldMap: Record<ConfigSection, string[]> = {
      setup: ['name', 'persona', 'goal', 'completionCriteria'],
      sources: ['sources'],
      actions: ['actions'],
      settings: [],
    };
    return validationErrors.filter(e => fieldMap[section].includes(e.field));
  };

  return (
    <div className="w-80 bg-white border-r flex flex-col shrink-0">
      {/* Section Tabs */}
      <div className="flex border-b">
        {sections.map(s => {
          const errors = getErrorsForSection(s.id);
          const hasError = errors.some(e => e.severity === 'error');
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex-1 py-3 text-xs font-medium border-b-2 transition relative ${
                activeSection === s.id
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <s.icon className="w-4 h-4 mx-auto mb-0.5" />
              {s.label}
              {hasError && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Section Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeSection === 'setup' && (
          <SetupSection config={config} setConfig={setConfig} errors={getErrorsForSection('setup')} />
        )}
        {activeSection === 'sources' && (
          <SourcesSection config={config} setConfig={setConfig} errors={getErrorsForSection('sources')} />
        )}
        {activeSection === 'actions' && (
          <ActionsSection config={config} setConfig={setConfig} errors={getErrorsForSection('actions')} />
        )}
        {activeSection === 'settings' && (
          <SettingsSection config={config} setConfig={setConfig} />
        )}
      </div>
    </div>
  );
}

// Config Sections

function SetupSection({ config, setConfig, errors }: { config: AgentConfig; setConfig: React.Dispatch<React.SetStateAction<AgentConfig>>; errors: ValidationError[] }) {
  const getError = (field: string) => errors.find(e => e.field === field);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
        <Input
          value={config.name}
          onChange={e => setConfig(c => ({ ...c, name: e.target.value }))}
          className={getError('name') ? 'border-red-500' : ''}
        />
        {getError('name') && (
          <p className="text-xs text-red-500 mt-1">{getError('name')?.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Persona</label>
        <textarea
          value={config.persona}
          onChange={e => setConfig(c => ({ ...c, persona: e.target.value }))}
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg text-sm resize-none ${getError('persona') ? 'border-amber-500' : ''}`}
        />
        {getError('persona') && (
          <p className="text-xs text-amber-500 mt-1">{getError('persona')?.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Goal</label>
        <textarea
          value={config.goal}
          onChange={e => setConfig(c => ({ ...c, goal: e.target.value }))}
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg text-sm resize-none ${getError('goal') ? 'border-red-500' : ''}`}
        />
        {getError('goal') && (
          <p className="text-xs text-red-500 mt-1">{getError('goal')?.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Completion Criteria</label>
        <textarea
          value={config.completionCriteria}
          onChange={e => setConfig(c => ({ ...c, completionCriteria: e.target.value }))}
          rows={2}
          className={`w-full px-3 py-2 border rounded-lg text-sm resize-none ${getError('completionCriteria') ? 'border-amber-500' : ''}`}
        />
      </div>
    </div>
  );
}

function SourcesSection({ config, setConfig, errors }: { config: AgentConfig; setConfig: React.Dispatch<React.SetStateAction<AgentConfig>>; errors: ValidationError[] }) {
  const addSource = () => {
    const newSource: KnowledgeSource = {
      id: `source-${Date.now()}`,
      name: `Document_${config.knowledgeSources.length + 1}.pdf`,
      type: 'file',
      status: 'active',
    };
    setConfig(c => ({ ...c, knowledgeSources: [...c.knowledgeSources, newSource] }));
  };

  const hasError = errors.some(e => e.field === 'sources');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Knowledge Sources</h3>
        <Button variant="outline" size="sm" onClick={addSource}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add
        </Button>
      </div>

      {hasError && (
        <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded-lg text-xs">
          <AlertCircle className="w-4 h-4" />
          <span>Add at least one knowledge source</span>
        </div>
      )}

      <div className="space-y-2">
        {config.knowledgeSources.map(source => (
          <div key={source.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-sm">{source.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-xs rounded ${
                source.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {source.status}
              </span>
              <button
                onClick={() => setConfig(c => ({
                  ...c,
                  knowledgeSources: c.knowledgeSources.filter(s => s.id !== source.id)
                }))}
                className="text-slate-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full p-4 border-2 border-dashed rounded-xl text-slate-500 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 transition">
        <Upload className="w-6 h-6 mx-auto mb-1" />
        <div className="text-sm font-medium">Upload Document</div>
        <div className="text-xs">PDF, DOCX, TXT, Markdown</div>
      </button>
    </div>
  );
}

function ActionsSection({ config, setConfig, errors }: { config: AgentConfig; setConfig: React.Dispatch<React.SetStateAction<AgentConfig>>; errors: ValidationError[] }) {
  const availableActions = [
    { name: 'AD_Password_Reset', type: 'resolve_workflow' as const, permissions: ['Active Directory'] },
    { name: 'ServiceNow_Create_Ticket', type: 'resolve_workflow' as const, permissions: ['ServiceNow'] },
    { name: 'Okta_Unlock_Account', type: 'resolve_workflow' as const, permissions: ['Okta'] },
    { name: 'Slack_Send_Message', type: 'notification' as const, permissions: ['Slack'] },
  ];

  const addAction = (action: typeof availableActions[0]) => {
    const newAction: AgentAction = {
      id: `action-${Date.now()}`,
      name: action.name,
      type: action.type,
      permissions: action.permissions,
      enabled: true,
    };
    setConfig(c => ({ ...c, actions: [...c.actions, newAction] }));
  };

  const hasError = errors.some(e => e.field === 'actions');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Actions</h3>
      </div>

      {hasError && config.type === 'workflow_executor' && (
        <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded-lg text-xs">
          <AlertCircle className="w-4 h-4" />
          <span>Add at least one action</span>
        </div>
      )}

      {/* Selected Actions */}
      {config.actions.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400 uppercase">Selected</label>
          {config.actions.map(action => (
            <div key={action.id} className="p-3 bg-violet-50 border border-violet-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-violet-500" />
                  <span className="text-sm font-medium">{action.name}</span>
                </div>
                <button
                  onClick={() => setConfig(c => ({
                    ...c,
                    actions: c.actions.filter(a => a.id !== action.id)
                  }))}
                  className="text-slate-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-slate-400" />
                <span className="text-xs text-slate-500">
                  Requires: {action.permissions.join(', ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Available Actions */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-400 uppercase">Available</label>
        {availableActions
          .filter(a => !config.actions.some(ca => ca.name === a.name))
          .map(action => (
            <button
              key={action.name}
              onClick={() => addAction(action)}
              className="w-full text-left p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition flex items-center justify-between"
            >
              <span className="text-sm">{action.name}</span>
              <span className="text-violet-600 text-sm font-medium">+ Add</span>
            </button>
          ))}
      </div>
    </div>
  );
}

function SettingsSection({ config, setConfig }: { config: AgentConfig; setConfig: React.Dispatch<React.SetStateAction<AgentConfig>> }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Interaction Style</label>
        <select
          value={config.settings.tone}
          onChange={e => setConfig(c => ({ ...c, settings: { ...c.settings, tone: e.target.value as AgentSettings['tone'] } }))}
          className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
        >
          <option value="friendly">Friendly and conversational</option>
          <option value="professional">Professional and formal</option>
          <option value="concise">Concise and direct</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">When content is insufficient</label>
        <select
          value={config.settings.fallbackBehavior}
          onChange={e => setConfig(c => ({ ...c, settings: { ...c.settings, fallbackBehavior: e.target.value as AgentSettings['fallbackBehavior'] } }))}
          className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
        >
          <option value="apologize">Apologize and offer alternatives</option>
          <option value="escalate">Escalate to human agent</option>
          <option value="create_ticket">Create a support ticket</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Max conversation turns</label>
        <Input
          type="number"
          value={config.settings.maxTurns}
          onChange={e => setConfig(c => ({ ...c, settings: { ...c.settings, maxTurns: parseInt(e.target.value) || 10 } }))}
          min={1}
          max={50}
        />
      </div>

      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
        <div>
          <div className="text-sm font-medium">Context Retention</div>
          <div className="text-xs text-slate-500">Remember conversation history</div>
        </div>
        <button
          onClick={() => setConfig(c => ({ ...c, settings: { ...c.settings, contextRetention: !c.settings.contextRetention } }))}
          className={`w-10 h-6 rounded-full transition-colors ${config.settings.contextRetention ? 'bg-violet-600' : 'bg-slate-300'}`}
        >
          <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${config.settings.contextRetention ? 'translate-x-5' : 'translate-x-1'}`} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Workflow Panel (Req #3)
// ─────────────────────────────────────────────────────────────────────

interface WorkflowPanelProps {
  config: AgentConfig;
  setConfig: React.Dispatch<React.SetStateAction<AgentConfig>>;
}

function WorkflowPanel({ config, setConfig: _setConfig }: WorkflowPanelProps) {
  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      <div className="p-3 border-b bg-white flex items-center justify-between">
        <h3 className="font-medium text-sm">Workflow</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Step
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-md mx-auto space-y-3">
          {config.steps.map((step, idx) => (
            <WorkflowStepCard key={step.id} step={step} index={idx} isLast={idx === config.steps.length - 1} />
          ))}

          {config.steps.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No workflow steps yet</p>
              <p className="text-sm">Steps will appear as you configure your agent</p>
            </div>
          )}
        </div>
      </div>

      {/* Transparency Panel (Req #6) */}
      {config.knowledgeSources.length > 0 || config.actions.length > 0 ? (
        <div className="border-t bg-white p-4">
          <h4 className="text-xs font-medium text-slate-400 uppercase mb-2">Agent Uses</h4>
          <div className="flex flex-wrap gap-2">
            {config.knowledgeSources.map(s => (
              <span key={s.id} className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {s.name}
              </span>
            ))}
            {config.actions.map(a => (
              <span key={a.id} className="px-2 py-1 bg-violet-100 text-violet-700 rounded text-xs flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {a.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WorkflowStepCard({ step, index: _index, isLast }: { step: WorkflowStep; index: number; isLast: boolean }) {
  const stepConfig: Record<string, { icon: typeof Play; color: string; bg: string }> = {
    start: { icon: Play, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    rag: { icon: FileQuestion, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    action: { icon: Zap, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
    condition: { icon: GitBranch, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    response: { icon: MessageSquare, color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200' },
    end: { icon: Square, color: 'text-slate-600', bg: 'bg-slate-100 border-slate-200' },
  };

  const cfg = stepConfig[step.type] || stepConfig.response;
  const Icon = cfg.icon;

  return (
    <div className="relative">
      <div className={`p-4 rounded-xl border ${cfg.bg} transition-all hover:shadow-md`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center ${cfg.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="font-medium text-sm">{step.label}</div>
            <div className="text-xs text-slate-500 capitalize">{step.type.replace('_', ' ')}</div>
          </div>
        </div>
      </div>
      {!isLast && (
        <div className="flex justify-center py-1">
          <ArrowRight className="w-4 h-4 text-slate-300 rotate-90" />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Chat + Test Panel (Req #5, #6)
// ─────────────────────────────────────────────────────────────────────

interface ChatTestPanelProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (input: string) => void;
  onSendMessage: () => void;
  testResults: TestResult[];
  showTestPanel: boolean;
  setShowTestPanel: (show: boolean) => void;
  isRunningTest: boolean;
  config: AgentConfig;
}

function ChatTestPanel({
  chatMessages,
  chatInput,
  setChatInput,
  onSendMessage,
  testResults,
  showTestPanel,
  setShowTestPanel,
  isRunningTest,
  config: _config,
}: ChatTestPanelProps) {
  return (
    <div className="w-96 bg-white border-l flex flex-col shrink-0">
      {/* Tab Toggle */}
      <div className="flex border-b">
        <button
          onClick={() => setShowTestPanel(false)}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${
            !showTestPanel
              ? 'border-violet-600 text-violet-600'
              : 'border-transparent text-slate-500'
          }`}
        >
          <Sparkles className="w-4 h-4 inline mr-1.5" />
          AI Assistant
        </button>
        <button
          onClick={() => setShowTestPanel(true)}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${
            showTestPanel
              ? 'border-violet-600 text-violet-600'
              : 'border-transparent text-slate-500'
          }`}
        >
          <TestTube className="w-4 h-4 inline mr-1.5" />
          Test & Validate
          {testResults.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 rounded text-xs">
              {testResults.length}
            </span>
          )}
        </button>
      </div>

      {/* Chat Panel */}
      {!showTestPanel && (
        <>
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t p-3">
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onSendMessage()}
                placeholder="Ask for help..."
                className="flex-1"
              />
              <Button onClick={onSendMessage} disabled={!chatInput} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Test Panel (Req #5) */}
      {showTestPanel && (
        <>
          <div className="flex-1 overflow-auto">
            {testResults.length === 0 && !isRunningTest ? (
              <div className="h-full flex items-center justify-center p-4">
                <div className="text-center">
                  <TestTube className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium text-slate-600">No tests run yet</p>
                  <p className="text-sm text-slate-400 mt-1">Click "Test" to validate your agent</p>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {isRunningTest && (
                  <div className="p-4 bg-violet-50 rounded-xl border border-violet-200">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-violet-600 animate-spin" />
                      <div>
                        <div className="font-medium text-sm">Running test...</div>
                        <div className="text-xs text-slate-500">Executing workflow with sample input</div>
                      </div>
                    </div>
                  </div>
                )}

                {testResults.map(result => (
                  <TestResultCard key={result.id} result={result} />
                ))}
              </div>
            )}
          </div>

          {testResults.length > 0 && (
            <div className="border-t p-3 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Re-run All
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Save className="w-4 h-4 mr-1.5" />
                Save Results
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TestResultCard({ result }: { result: TestResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border overflow-hidden ${
      result.status === 'passed' ? 'border-emerald-200 bg-emerald-50' :
      result.status === 'failed' ? 'border-red-200 bg-red-50' :
      'border-slate-200 bg-slate-50'
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {result.status === 'passed' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : result.status === 'failed' ? (
              <XCircle className="w-5 h-5 text-red-600" />
            ) : (
              <Clock className="w-5 h-5 text-slate-400" />
            )}
            <span className="font-medium text-sm">
              {result.status === 'passed' ? 'Test Passed' : result.status === 'failed' ? 'Test Failed' : 'Pending'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {Math.round(result.confidence * 100)}% confidence
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        <div className="text-sm text-slate-600">
          <div className="font-medium text-xs text-slate-400 mb-1">Input</div>
          <div className="bg-white/50 rounded px-2 py-1">{result.input}</div>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 space-y-3">
          <div className="pt-3">
            <div className="font-medium text-xs text-slate-400 mb-1">Output</div>
            <div className="bg-white rounded p-2 text-sm">{result.output}</div>
          </div>

          {/* Reasoning Trace (Req #6) */}
          <div>
            <div className="font-medium text-xs text-slate-400 mb-1">Reasoning</div>
            <div className="bg-white rounded p-2 space-y-1">
              {result.reasoning.map((r, i) => (
                <div key={i} className="text-xs text-slate-600 flex items-start gap-2">
                  <span className="text-slate-400">{i + 1}.</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50">
              <Check className="w-4 h-4 mr-1" />
              Approve
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-red-600 border-red-300 hover:bg-red-50">
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────

function generateInitialSteps(type: AgentType): WorkflowStep[] {
  const baseSteps: WorkflowStep[] = [
    { id: 'start', type: 'start', label: 'User Message' },
  ];

  switch (type) {
    case 'embedded_knowledge':
      return [
        ...baseSteps,
        { id: 'rag', type: 'rag', label: 'Search Knowledge Base' },
        { id: 'response', type: 'response', label: 'Generate Response' },
        { id: 'end', type: 'end', label: 'End' },
      ];
    case 'workflow_executor':
      return [
        ...baseSteps,
        { id: 'condition', type: 'condition', label: 'Identify Intent' },
        { id: 'action', type: 'action', label: 'Execute Action' },
        { id: 'response', type: 'response', label: 'Confirm Result' },
        { id: 'end', type: 'end', label: 'End' },
      ];
    default:
      return [
        ...baseSteps,
        { id: 'rag', type: 'rag', label: 'Retrieve Context' },
        { id: 'response', type: 'response', label: 'Format Response' },
        { id: 'end', type: 'end', label: 'End' },
      ];
  }
}

function generateAIResponse(input: string, config: AgentConfig): string {
  const lower = input.toLowerCase();

  if (lower.includes('persona') || lower.includes('role')) {
    return "The persona defines how your agent presents itself. A good persona includes:\n\n• Tone (friendly, professional)\n• Expertise area\n• Communication style\n\nYour current persona: \"" + (config.persona || 'Not defined yet') + "\"";
  }
  if (lower.includes('test') || lower.includes('try')) {
    return "To test your agent:\n\n1. Click the 'Test' button in the header\n2. A sample conversation will run\n3. Review the output and reasoning\n4. Approve or reject the result\n\nTests help validate behavior before publishing.";
  }
  if (lower.includes('publish') || lower.includes('deploy')) {
    return "Before publishing, ensure:\n\n• All required fields are filled\n• At least one test has passed\n• You've reviewed the workflow\n\nOnce published, the agent will be available in production.";
  }

  return "I can help you configure your agent. Ask me about:\n\n• Writing a good persona\n• Testing your agent\n• Understanding the workflow\n• Publishing your agent";
}

export default UnifiedAgentBuilder;
