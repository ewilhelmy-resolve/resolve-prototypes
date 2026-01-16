/**
 * ChatDrivenBuilder - Modern chat-centric agent builder
 *
 * Phases: Describe → Content → Build → Test/Publish
 *
 * Based on Espressive flow but modernized with rich inline actions
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Check, ChevronRight, FileText,
  Sparkles, Play, Upload, X, Plus, Loader2, Edit2,
  MessageSquare, Settings, Rocket,
} from 'lucide-react';
import type { AgentDefinition, AgentType } from './types';
import { AGENT_TYPE_META } from './types';

interface ChatDrivenBuilderProps {
  initialAgent?: Partial<AgentDefinition>;
}

type BuilderPhase = 'describe' | 'content' | 'build' | 'publish';

type ChatMessageType =
  | 'text'
  | 'persona-form'
  | 'summary-confirmation'
  | 'trigger-phrases'
  | 'exceptions'
  | 'file-upload'
  | 'workflow-picker'
  | 'config-panel'
  | 'priorities-preview'
  | 'publish-ready'
  | 'test-chat';

interface ChatMessage {
  id: string;
  role: 'agent' | 'user';
  type: ChatMessageType;
  content: string;
  data?: unknown;
  completed?: boolean;
}

interface PersonaFields {
  role: string;
  purpose: string;
  completionCriteria: string;
}

interface AgentConfig {
  contentSource: 'rag' | 'embedded' | 'automation';
  insufficientContent: string;
  interactionStyle: string;
  missingData: string;
  followUpBehavior: string;
  contextSwitching: boolean;
  ticketCreation: boolean;
}

const AVAILABLE_WORKFLOWS = [
  { id: 'get_weather', name: 'Get Weather Data', description: 'Retrieves weather information based on zip/postal code', icon: '🌤️' },
  { id: 'password_reset', name: 'Password Reset', description: 'Reset user password via ServiceNow', icon: '🔐' },
  { id: 'ticket_create', name: 'Create Ticket', description: 'Open a new support ticket', icon: '🎫' },
  { id: 'account_unlock', name: 'Unlock Account', description: 'Unlock locked AD account', icon: '🔓' },
  { id: 'vpn_access', name: 'VPN Access Request', description: 'Request VPN access approval', icon: '🌐' },
];

const DEFAULT_CONFIG: AgentConfig = {
  contentSource: 'rag',
  insufficientContent: 'Tell user no data available for that topic',
  interactionStyle: 'Conversational and friendly',
  missingData: 'Ask user for clarification',
  followUpBehavior: 'Go back to source for more data',
  contextSwitching: true,
  ticketCreation: false,
};

export function ChatDrivenBuilder({ initialAgent }: ChatDrivenBuilderProps) {
  const [agent, setAgent] = useState<Partial<AgentDefinition>>({
    name: initialAgent?.name || '',
    type: initialAgent?.type,
    status: 'draft',
  });

  const [phase, setPhase] = useState<BuilderPhase>('describe');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [persona, setPersona] = useState<PersonaFields>({ role: '', purpose: '', completionCriteria: '' });
  const [triggerPhrases, setTriggerPhrases] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start conversation when agent type is selected
  useEffect(() => {
    if (agent.type && messages.length === 0) {
      startDescribePhase();
    }
  }, [agent.type]);

  const addMessage = (msg: Omit<ChatMessage, 'id'>) => {
    setMessages(prev => [...prev, { ...msg, id: `${Date.now()}-${Math.random()}` }]);
  };

  const markCompleted = (type: ChatMessageType) => {
    setMessages(prev => prev.map(m => m.type === type ? { ...m, completed: true } : m));
  };

  // ─────────────────────────────────────────────────────────────────────
  // PHASE: DESCRIBE
  // ─────────────────────────────────────────────────────────────────────

  const startDescribePhase = () => {
    const typeLabel = AGENT_TYPE_META[agent.type!].label;
    addMessage({
      role: 'agent',
      type: 'text',
      content: `Let's set up your ${typeLabel}. First, tell me about the agent's persona.`,
    });
    setTimeout(() => {
      addMessage({
        role: 'agent',
        type: 'persona-form',
        content: '',
      });
    }, 300);
  };

  const handlePersonaSubmit = async () => {
    if (!persona.role || !persona.purpose || !persona.completionCriteria) return;

    markCompleted('persona-form');
    addMessage({
      role: 'user',
      type: 'text',
      content: `Role: ${persona.role.slice(0, 50)}...`,
    });

    setIsProcessing(true);

    // Simulate AI processing
    await new Promise(r => setTimeout(r, 1500));

    addMessage({
      role: 'agent',
      type: 'text',
      content: `Here's my understanding of your ${agent.name || 'agent'}:`,
    });

    setTimeout(() => {
      addMessage({
        role: 'agent',
        type: 'summary-confirmation',
        content: '',
        data: { persona },
      });
      setIsProcessing(false);
    }, 300);
  };

  const handleSummaryConfirm = async () => {
    markCompleted('summary-confirmation');
    addMessage({ role: 'user', type: 'text', content: 'Looks correct' });

    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 1200));

    // Generate trigger phrases
    const generated = generateTriggerPhrases(persona);
    setTriggerPhrases(generated);

    addMessage({
      role: 'agent',
      type: 'text',
      content: 'I\'ve generated sample phrases that will trigger this agent. Review and edit as needed:',
    });

    setTimeout(() => {
      addMessage({
        role: 'agent',
        type: 'trigger-phrases',
        content: '',
        data: { phrases: generated },
      });
      setIsProcessing(false);
    }, 300);
  };

  const handleTriggersConfirm = async () => {
    markCompleted('trigger-phrases');
    addMessage({ role: 'user', type: 'text', content: `${triggerPhrases.length} trigger phrases confirmed` });

    // Ask about exceptions
    addMessage({
      role: 'agent',
      type: 'text',
      content: 'Do you have other agents with similar capabilities? If so, define exceptions to avoid overlap.',
    });

    setTimeout(() => {
      addMessage({
        role: 'agent',
        type: 'exceptions',
        content: '',
      });
    }, 300);
  };

  const handleExceptionsComplete = async (hasExceptions: boolean) => {
    markCompleted('exceptions');
    addMessage({ role: 'user', type: 'text', content: hasExceptions ? 'Exceptions defined' : 'No exceptions needed' });

    setIsProcessing(true);
    addMessage({
      role: 'agent',
      type: 'text',
      content: 'Building agent description...',
    });

    await new Promise(r => setTimeout(r, 2000));
    setIsProcessing(false);

    addMessage({
      role: 'agent',
      type: 'text',
      content: `✓ Description phase complete! ${agent.type === 'answer_formatter' ? 'Moving to Build phase (no content needed for Post-RAG).' : 'Now let\'s add content.'}`,
    });

    setPhase(agent.type === 'answer_formatter' ? 'build' : 'content');

    setTimeout(() => {
      if (agent.type === 'answer_formatter') {
        startBuildPhase();
      } else {
        startContentPhase();
      }
    }, 500);
  };

  // ─────────────────────────────────────────────────────────────────────
  // PHASE: CONTENT
  // ─────────────────────────────────────────────────────────────────────

  const startContentPhase = () => {
    if (agent.type === 'embedded_knowledge') {
      addMessage({
        role: 'agent',
        type: 'text',
        content: 'Upload the files this agent should use to answer questions:',
      });
      setTimeout(() => {
        addMessage({
          role: 'agent',
          type: 'file-upload',
          content: '',
        });
      }, 300);
    } else if (agent.type === 'workflow_executor') {
      addMessage({
        role: 'agent',
        type: 'text',
        content: 'Select the Resolve Actions workflow(s) this agent should execute:',
      });
      setTimeout(() => {
        addMessage({
          role: 'agent',
          type: 'workflow-picker',
          content: '',
        });
      }, 300);
    }
  };

  const handleFilesConfirm = async () => {
    if (uploadedFiles.length === 0) return;

    markCompleted('file-upload');
    addMessage({ role: 'user', type: 'text', content: `Uploaded ${uploadedFiles.length} file(s)` });

    setIsProcessing(true);
    addMessage({
      role: 'agent',
      type: 'text',
      content: 'Processing and indexing files...',
    });

    await new Promise(r => setTimeout(r, 2000));
    setIsProcessing(false);

    addMessage({
      role: 'agent',
      type: 'text',
      content: '✓ Content indexed! Moving to Build phase.',
    });

    setPhase('build');
    setTimeout(() => startBuildPhase(), 500);
  };

  const handleWorkflowsConfirm = async () => {
    if (selectedWorkflows.length === 0) return;

    markCompleted('workflow-picker');
    const names = selectedWorkflows.map(id => AVAILABLE_WORKFLOWS.find(w => w.id === id)?.name).join(', ');
    addMessage({ role: 'user', type: 'text', content: `Selected: ${names}` });

    setIsProcessing(true);
    addMessage({
      role: 'agent',
      type: 'text',
      content: 'Validating workflow connections...',
    });

    await new Promise(r => setTimeout(r, 1500));
    setIsProcessing(false);

    addMessage({
      role: 'agent',
      type: 'text',
      content: '✓ Workflows connected! Moving to Build phase.',
    });

    setPhase('build');
    setTimeout(() => startBuildPhase(), 500);
  };

  // ─────────────────────────────────────────────────────────────────────
  // PHASE: BUILD
  // ─────────────────────────────────────────────────────────────────────

  const startBuildPhase = () => {
    // Set default config based on agent type
    const typeConfig = { ...DEFAULT_CONFIG };
    if (agent.type === 'embedded_knowledge') {
      typeConfig.contentSource = 'embedded';
    } else if (agent.type === 'workflow_executor') {
      typeConfig.contentSource = 'automation';
      typeConfig.insufficientContent = 'Get more data from automation';
      typeConfig.followUpBehavior = 'Go back to automation if no results';
    }
    setConfig(typeConfig);

    addMessage({
      role: 'agent',
      type: 'text',
      content: 'Here\'s the recommended configuration. Make any changes you need:',
    });

    setTimeout(() => {
      addMessage({
        role: 'agent',
        type: 'config-panel',
        content: '',
        data: { config: typeConfig },
      });
    }, 300);
  };

  const handleConfigConfirm = async () => {
    markCompleted('config-panel');
    addMessage({ role: 'user', type: 'text', content: 'Configuration confirmed' });

    setIsProcessing(true);
    addMessage({
      role: 'agent',
      type: 'text',
      content: 'Generating agent priorities (rules)...',
    });

    await new Promise(r => setTimeout(r, 2500));

    addMessage({
      role: 'agent',
      type: 'text',
      content: 'Here\'s the agent structure:',
    });

    setTimeout(() => {
      addMessage({
        role: 'agent',
        type: 'priorities-preview',
        content: '',
      });
      setIsProcessing(false);
    }, 300);
  };

  const handlePrioritiesConfirm = async () => {
    markCompleted('priorities-preview');
    addMessage({ role: 'user', type: 'text', content: 'Structure looks good' });

    setIsProcessing(true);
    addMessage({
      role: 'agent',
      type: 'text',
      content: 'Building agent... This may take a moment.',
    });

    await new Promise(r => setTimeout(r, 3000));
    setIsProcessing(false);

    addMessage({
      role: 'agent',
      type: 'text',
      content: '✓ Agent built successfully! Ready to publish.',
    });

    setPhase('publish');
    setTimeout(() => {
      addMessage({
        role: 'agent',
        type: 'publish-ready',
        content: '',
      });
    }, 500);
  };

  // ─────────────────────────────────────────────────────────────────────
  // PHASE: PUBLISH
  // ─────────────────────────────────────────────────────────────────────

  const handlePublish = async () => {
    markCompleted('publish-ready');
    addMessage({ role: 'user', type: 'text', content: 'Publish now' });

    setIsProcessing(true);
    addMessage({
      role: 'agent',
      type: 'text',
      content: 'Publishing agent...',
    });

    await new Promise(r => setTimeout(r, 2000));
    setIsProcessing(false);

    addMessage({
      role: 'agent',
      type: 'text',
      content: `🎉 ${agent.name || 'Your agent'} is now live! Try it out:`,
    });

    setTimeout(() => {
      addMessage({
        role: 'agent',
        type: 'test-chat',
        content: '',
      });
    }, 300);
  };

  // ─────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────

  const generateTriggerPhrases = (p: PersonaFields): string[] => {
    // Mock generation based on persona
    if (p.purpose.toLowerCase().includes('weather')) {
      return [
        'What\'s the weather like today?',
        'Will it rain tomorrow?',
        'What\'s the forecast for this weekend?',
        'Temperature in San Francisco',
        'Is it going to be sunny?',
      ];
    }
    if (p.purpose.toLowerCase().includes('pizza') || p.purpose.toLowerCase().includes('menu')) {
      return [
        'What pizzas do you have?',
        'Show me the menu',
        'What toppings are available?',
        'How much is a large pizza?',
        'Do you have vegetarian options?',
      ];
    }
    if (p.purpose.toLowerCase().includes('benefit') || p.purpose.toLowerCase().includes('hr')) {
      return [
        'What\'s my deductible?',
        'How do I enroll in benefits?',
        'When is open enrollment?',
        'What dental plans are available?',
        'How do I submit a PTO request?',
        'What is our PTO policy?',
      ];
    }
    return [
      'Help me with this',
      'I have a question',
      'Can you assist me?',
      'I need information about...',
    ];
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    addMessage({ role: 'user', type: 'text', content: inputValue });
    setInputValue('');
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-muted/30 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Agent Name</label>
            <input
              type="text"
              className="text-xl font-semibold bg-transparent border-none outline-none w-full placeholder:text-muted-foreground/50"
              placeholder="Enter agent name..."
              value={agent.name}
              onChange={(e) => setAgent(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Agent Type</label>
            <div className="flex gap-2">
              {(Object.entries(AGENT_TYPE_META) as [AgentType, typeof AGENT_TYPE_META[AgentType]][]).map(
                ([type, meta]) => (
                  <button
                    key={type}
                    onClick={() => {
                      setAgent(prev => ({ ...prev, type }));
                      setMessages([]);
                      setPhase('describe');
                      setPersona({ role: '', purpose: '', completionCriteria: '' });
                      setTriggerPhrases([]);
                      setUploadedFiles([]);
                      setSelectedWorkflows([]);
                      setConfig(DEFAULT_CONFIG);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      agent.type === type
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {meta.icon} {meta.label}
                  </button>
                )
              )}
            </div>
          </div>

          <Button variant="outline" size="sm">
            Save Draft
          </Button>
        </div>

        {/* Phase Indicator */}
        {agent.type && (
          <div className="flex items-center gap-4 mt-4">
            {(['describe', 'content', 'build', 'publish'] as BuilderPhase[]).map((p, i) => {
              const isActive = phase === p;
              const isPast = ['describe', 'content', 'build', 'publish'].indexOf(phase) > i;
              const icons = { describe: MessageSquare, content: FileText, build: Settings, publish: Rocket };
              const Icon = icons[p];
              const skipContent = agent.type === 'answer_formatter' && p === 'content';

              return (
                <div
                  key={p}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                    skipContent ? 'opacity-30 line-through' :
                    isActive ? 'bg-primary text-primary-foreground' :
                    isPast ? 'bg-green-100 text-green-700' :
                    'bg-muted text-muted-foreground'
                  }`}
                >
                  {isPast && !isActive ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className="capitalize">{p}</span>
                </div>
              );
            })}
          </div>
        )}
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto py-6 px-4 space-y-4">
          {/* Empty State */}
          {!agent.type && (
            <div className="text-center py-20 text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select an agent type to get started</p>
              <p className="text-sm mt-2">
                <strong>Post-RAG:</strong> Uses existing corporate content (SharePoint, Confluence)<br/>
                <strong>Embedded Knowledge:</strong> Upload files specific to this agent<br/>
                <strong>Workflow:</strong> Connects to Resolve Actions automation
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <MessageComponent
              key={message.id}
              message={message}
              agent={agent}
              persona={persona}
              setPersona={setPersona}
              triggerPhrases={triggerPhrases}
              setTriggerPhrases={setTriggerPhrases}
              uploadedFiles={uploadedFiles}
              setUploadedFiles={setUploadedFiles}
              selectedWorkflows={selectedWorkflows}
              setSelectedWorkflows={setSelectedWorkflows}
              config={config}
              setConfig={setConfig}
              onPersonaSubmit={handlePersonaSubmit}
              onSummaryConfirm={handleSummaryConfirm}
              onTriggersConfirm={handleTriggersConfirm}
              onExceptionsComplete={handleExceptionsComplete}
              onFilesConfirm={handleFilesConfirm}
              onWorkflowsConfirm={handleWorkflowsConfirm}
              onConfigConfirm={handleConfigConfirm}
              onPrioritiesConfirm={handlePrioritiesConfirm}
              onPublish={handlePublish}
              isProcessing={isProcessing}
            />
          ))}

          {isProcessing && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm flex-shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="flex-1">
                <div className="bg-muted rounded-lg px-4 py-3 inline-block">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="animate-pulse">Processing...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input */}
      {agent.type && (
        <div className="border-t bg-background px-4 py-3">
          <div className="max-w-3xl mx-auto flex gap-2">
            <input
              type="text"
              className="flex-1 px-4 py-2 border rounded-lg"
              placeholder="Type to make changes or ask questions..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button onClick={handleSend}>Send</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Message Component
// ─────────────────────────────────────────────────────────────────────

interface MessageComponentProps {
  message: ChatMessage;
  agent: Partial<AgentDefinition>;
  persona: PersonaFields;
  setPersona: React.Dispatch<React.SetStateAction<PersonaFields>>;
  triggerPhrases: string[];
  setTriggerPhrases: React.Dispatch<React.SetStateAction<string[]>>;
  uploadedFiles: File[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  selectedWorkflows: string[];
  setSelectedWorkflows: React.Dispatch<React.SetStateAction<string[]>>;
  config: AgentConfig;
  setConfig: React.Dispatch<React.SetStateAction<AgentConfig>>;
  onPersonaSubmit: () => void;
  onSummaryConfirm: () => void;
  onTriggersConfirm: () => void;
  onExceptionsComplete: (has: boolean) => void;
  onFilesConfirm: () => void;
  onWorkflowsConfirm: () => void;
  onConfigConfirm: () => void;
  onPrioritiesConfirm: () => void;
  onPublish: () => void;
  isProcessing: boolean;
}

function MessageComponent({
  message,
  agent,
  persona,
  setPersona,
  triggerPhrases,
  setTriggerPhrases,
  uploadedFiles,
  setUploadedFiles,
  selectedWorkflows,
  setSelectedWorkflows,
  config,
  setConfig,
  onPersonaSubmit,
  onSummaryConfirm,
  onTriggersConfirm,
  onExceptionsComplete,
  onFilesConfirm,
  onWorkflowsConfirm,
  onConfigConfirm,
  onPrioritiesConfirm,
  onPublish,
  isProcessing,
}: MessageComponentProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-2xl rounded-br-md max-w-[80%]">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm flex-shrink-0">
        🤖
      </div>
      <div className="flex-1 space-y-3">
        {message.type === 'text' && (
          <p className="text-foreground">{message.content}</p>
        )}

        {message.type === 'persona-form' && !message.completed && (
          <PersonaFormAction
            persona={persona}
            setPersona={setPersona}
            onSubmit={onPersonaSubmit}
            isProcessing={isProcessing}
          />
        )}

        {message.type === 'summary-confirmation' && (
          <SummaryConfirmAction
            persona={persona}
            completed={message.completed}
            onConfirm={onSummaryConfirm}
          />
        )}

        {message.type === 'trigger-phrases' && (
          <TriggerPhrasesAction
            phrases={triggerPhrases}
            setPhrases={setTriggerPhrases}
            completed={message.completed}
            onConfirm={onTriggersConfirm}
          />
        )}

        {message.type === 'exceptions' && !message.completed && (
          <ExceptionsAction onComplete={onExceptionsComplete} />
        )}

        {message.type === 'file-upload' && (
          <FileUploadAction
            files={uploadedFiles}
            setFiles={setUploadedFiles}
            completed={message.completed}
            onConfirm={onFilesConfirm}
          />
        )}

        {message.type === 'workflow-picker' && (
          <WorkflowPickerAction
            selected={selectedWorkflows}
            setSelected={setSelectedWorkflows}
            completed={message.completed}
            onConfirm={onWorkflowsConfirm}
          />
        )}

        {message.type === 'config-panel' && (
          <ConfigPanelAction
            config={config}
            setConfig={setConfig}
            agentType={agent.type}
            completed={message.completed}
            onConfirm={onConfigConfirm}
          />
        )}

        {message.type === 'priorities-preview' && (
          <PrioritiesPreviewAction
            agentType={agent.type}
            completed={message.completed}
            onConfirm={onPrioritiesConfirm}
          />
        )}

        {message.type === 'publish-ready' && !message.completed && (
          <PublishReadyAction agentName={agent.name} onPublish={onPublish} />
        )}

        {message.type === 'test-chat' && (
          <TestChatAction agentName={agent.name} config={config} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Action Components
// ─────────────────────────────────────────────────────────────────────

function PersonaFormAction({
  persona,
  setPersona,
  onSubmit,
  isProcessing,
}: {
  persona: PersonaFields;
  setPersona: React.Dispatch<React.SetStateAction<PersonaFields>>;
  onSubmit: () => void;
  isProcessing: boolean;
}) {
  return (
    <Card className="p-4 space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Describe the role/persona of the agent</label>
        <textarea
          className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
          rows={2}
          placeholder="e.g., Acts as a friendly, knowledgeable benefits expert for employees..."
          value={persona.role}
          onChange={(e) => setPersona(prev => ({ ...prev, role: e.target.value }))}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">What do you want the agent to do?</label>
        <textarea
          className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
          rows={2}
          placeholder="e.g., Assist employees with questions about health insurance, PTO policies..."
          value={persona.purpose}
          onChange={(e) => setPersona(prev => ({ ...prev, purpose: e.target.value }))}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">When is the agent's job complete?</label>
        <textarea
          className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
          rows={2}
          placeholder="e.g., When the employee says they're done and ready to enroll..."
          value={persona.completionCriteria}
          onChange={(e) => setPersona(prev => ({ ...prev, completionCriteria: e.target.value }))}
        />
      </div>

      <Button
        className="w-full"
        onClick={onSubmit}
        disabled={!persona.role || !persona.purpose || !persona.completionCriteria || isProcessing}
      >
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Continue <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </Card>
  );
}

function SummaryConfirmAction({
  persona,
  completed,
  onConfirm,
}: {
  persona: PersonaFields;
  completed?: boolean;
  onConfirm: () => void;
}) {
  if (completed) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <Check className="w-4 h-4 text-green-600" />
        Summary confirmed
      </div>
    );
  }

  return (
    <Card className="p-4 space-y-3 bg-blue-50/50 border-blue-200">
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">Persona:</span>{' '}
          <span className="text-muted-foreground">{persona.role}</span>
        </div>
        <div>
          <span className="font-medium">Purpose:</span>{' '}
          <span className="text-muted-foreground">{persona.purpose}</span>
        </div>
        <div>
          <span className="font-medium">Completion:</span>{' '}
          <span className="text-muted-foreground">{persona.completionCriteria}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Edit2 className="w-3 h-3 mr-1" /> Edit
        </Button>
        <Button size="sm" onClick={onConfirm}>
          Correct <Check className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </Card>
  );
}

function TriggerPhrasesAction({
  phrases,
  setPhrases,
  completed,
  onConfirm,
}: {
  phrases: string[];
  setPhrases: React.Dispatch<React.SetStateAction<string[]>>;
  completed?: boolean;
  onConfirm: () => void;
}) {
  const [newPhrase, setNewPhrase] = useState('');

  if (completed) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <Check className="w-4 h-4 text-green-600" />
        {phrases.length} trigger phrases configured
      </div>
    );
  }

  const addPhrase = () => {
    if (newPhrase.trim()) {
      setPhrases(prev => [...prev, newPhrase.trim()]);
      setNewPhrase('');
    }
  };

  const removePhrase = (index: number) => {
    setPhrases(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {phrases.map((phrase, i) => (
          <div
            key={i}
            className="flex items-center gap-1 px-3 py-1.5 bg-muted rounded-full text-sm group"
          >
            <span>{phrase}</span>
            <button
              onClick={() => removePhrase(i)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
          placeholder="Add a trigger phrase..."
          value={newPhrase}
          onChange={(e) => setNewPhrase(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addPhrase()}
        />
        <Button variant="outline" size="sm" onClick={addPhrase}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <Button className="w-full" onClick={onConfirm} disabled={phrases.length === 0}>
        Confirm Phrases <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </Card>
  );
}

function ExceptionsAction({ onComplete }: { onComplete: (has: boolean) => void }) {
  return (
    <Card className="p-4 space-y-3">
      <p className="text-sm text-muted-foreground">
        Exceptions help avoid overlap when you have multiple similar agents.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => onComplete(false)}>
          No exceptions needed
        </Button>
        <Button variant="outline" onClick={() => onComplete(true)}>
          Define exceptions
        </Button>
      </div>
    </Card>
  );
}

function FileUploadAction({
  files,
  setFiles,
  completed,
  onConfirm,
}: {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  completed?: boolean;
  onConfirm: () => void;
}) {
  if (completed) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <Check className="w-4 h-4 text-green-600" />
        {files.length} file(s) uploaded
      </div>
    );
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...dropped]);
  };

  return (
    <Card className="p-4 space-y-3">
      <div
        className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">Drop files here or click to upload</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, CSV supported</p>
        <input
          id="file-input"
          type="file"
          multiple
          className="hidden"
          onChange={(e) => setFiles(prev => [...prev, ...Array.from(e.target.files || [])])}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-sm truncate">{file.name}</span>
              <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}>
                <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button className="w-full" onClick={onConfirm} disabled={files.length === 0}>
        Continue <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </Card>
  );
}

function WorkflowPickerAction({
  selected,
  setSelected,
  completed,
  onConfirm,
}: {
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  completed?: boolean;
  onConfirm: () => void;
}) {
  if (completed) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <Check className="w-4 h-4 text-green-600" />
        {selected.length} workflow(s) connected
      </div>
    );
  }

  const toggleWorkflow = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };

  return (
    <Card className="p-4 space-y-3">
      {AVAILABLE_WORKFLOWS.map((workflow) => {
        const isSelected = selected.includes(workflow.id);
        return (
          <button
            key={workflow.id}
            onClick={() => toggleWorkflow(workflow.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
              isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xl">
              {workflow.icon}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{workflow.name}</div>
              <div className="text-xs text-muted-foreground">{workflow.description}</div>
            </div>
            {isSelected && <Check className="w-5 h-5 text-primary" />}
          </button>
        );
      })}

      <Button className="w-full" onClick={onConfirm} disabled={selected.length === 0}>
        Continue <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </Card>
  );
}

function ConfigPanelAction({
  config,
  setConfig,
  agentType: _agentType,
  completed,
  onConfirm,
}: {
  config: AgentConfig;
  setConfig: React.Dispatch<React.SetStateAction<AgentConfig>>;
  agentType?: AgentType;
  completed?: boolean;
  onConfirm: () => void;
}) {
  const [editingStyle, setEditingStyle] = useState(false);
  const [customStyle, setCustomStyle] = useState('');

  if (completed) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <Check className="w-4 h-4 text-green-600" />
        Configuration confirmed
      </div>
    );
  }

  const styleOptions = ['Conversational and friendly', 'Professional', 'Concise', 'Comical', 'Like Spock', 'Shakespearean'];

  return (
    <Card className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Content Source</label>
          <div className="mt-1 px-3 py-2 bg-muted rounded-lg text-sm">
            {config.contentSource === 'rag' ? 'RAG (Corporate Content)' :
             config.contentSource === 'embedded' ? 'Embedded Knowledge' : 'Automation'}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">If Insufficient Content</label>
          <div className="mt-1 px-3 py-2 bg-muted rounded-lg text-sm truncate">
            {config.insufficientContent}
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Interaction Style</label>
        {editingStyle ? (
          <div className="mt-1 space-y-2">
            <div className="flex flex-wrap gap-2">
              {styleOptions.map(style => (
                <button
                  key={style}
                  onClick={() => {
                    setConfig(prev => ({ ...prev, interactionStyle: style }));
                    setEditingStyle(false);
                  }}
                  className="px-3 py-1 bg-muted hover:bg-primary hover:text-primary-foreground rounded-full text-sm transition-colors"
                >
                  {style}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                placeholder="Or type custom style..."
                value={customStyle}
                onChange={(e) => setCustomStyle(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (customStyle) {
                    setConfig(prev => ({ ...prev, interactionStyle: customStyle }));
                    setEditingStyle(false);
                    setCustomStyle('');
                  }
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditingStyle(true)}
            className="mt-1 w-full px-3 py-2 bg-muted rounded-lg text-sm text-left flex items-center justify-between hover:bg-muted/80"
          >
            <span>{config.interactionStyle}</span>
            <Edit2 className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between py-2">
        <span className="text-sm">Context Switching</span>
        <Switch
          checked={config.contextSwitching}
          onCheckedChange={(checked) => setConfig(prev => ({ ...prev, contextSwitching: checked }))}
        />
      </div>

      <div className="flex items-center justify-between py-2">
        <span className="text-sm">Ticket Creation</span>
        <Switch
          checked={config.ticketCreation}
          onCheckedChange={(checked) => setConfig(prev => ({ ...prev, ticketCreation: checked }))}
        />
      </div>

      <Button className="w-full" onClick={onConfirm}>
        Proceed <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </Card>
  );
}

function PrioritiesPreviewAction({
  agentType,
  completed,
  onConfirm,
}: {
  agentType?: AgentType;
  completed?: boolean;
  onConfirm: () => void;
}) {
  const priorities = agentType === 'workflow_executor' ? [
    { num: 1, label: 'Start with automation check', icon: '🔍' },
    { num: 2, label: 'Execute the automation', icon: '⚡' },
    { num: 3, label: 'Generate the answer', icon: '💬' },
  ] : agentType === 'embedded_knowledge' ? [
    { num: 1, label: 'Search embedded content', icon: '📚' },
    { num: 2, label: 'Extract relevant information', icon: '🔍' },
    { num: 3, label: 'Generate response in selected style', icon: '💬' },
  ] : [
    { num: 1, label: 'Query RAG for relevant content', icon: '🔍' },
    { num: 2, label: 'Format and enhance response', icon: '✨' },
    { num: 3, label: 'Apply interaction style', icon: '💬' },
  ];

  if (completed) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <Check className="w-4 h-4 text-green-600" />
        Agent structure confirmed
      </div>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="text-xs font-medium text-muted-foreground uppercase">Agent Priorities</div>

      <div className="space-y-2">
        {priorities.map((p, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-lg">
              {p.icon}
            </div>
            <div className="flex-1">
              <span className="text-xs text-muted-foreground">Priority {p.num}</span>
              <div className="text-sm font-medium">{p.label}</div>
            </div>
          </div>
        ))}
      </div>

      <Button className="w-full" onClick={onConfirm}>
        Looks Good <Check className="w-4 h-4 ml-1" />
      </Button>
    </Card>
  );
}

function PublishReadyAction({
  agentName,
  onPublish,
}: {
  agentName?: string;
  onPublish: () => void;
}) {
  return (
    <Card className="p-6 text-center space-y-4 bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
      <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto">
        <Rocket className="w-8 h-8 text-violet-600" />
      </div>
      <div>
        <h3 className="font-semibold text-lg">{agentName || 'Your agent'} is ready!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Publish to make it available to users
        </p>
      </div>
      <Button size="lg" onClick={onPublish}>
        <Rocket className="w-4 h-4 mr-2" /> Publish Agent
      </Button>
    </Card>
  );
}

function TestChatAction({
  agentName,
  config,
}: {
  agentName?: string;
  config: AgentConfig;
}) {
  const [testMessages, setTestMessages] = useState<{ role: 'user' | 'agent'; text: string }[]>([]);
  const [testInput, setTestInput] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  const handleTestSend = async () => {
    if (!testInput.trim()) return;

    const userMsg = testInput;
    setTestMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setTestInput('');
    setIsResponding(true);

    // Simulate response
    await new Promise(r => setTimeout(r, 1500));

    let response = `Based on available data, I can help you with that question about "${userMsg.slice(0, 30)}..."`;

    if (config.interactionStyle.toLowerCase().includes('spock')) {
      response = `Fascinating. The most logical response to your query would be that ${userMsg.toLowerCase().includes('pto') ? 'PTO requests are submitted through the HR portal' : 'I would need more specific parameters to compute an accurate response'}.`;
    } else if (config.interactionStyle.toLowerCase().includes('shakespeare')) {
      response = `Good morrow, noble patron! Permit me to illuminate thee upon this matter...`;
    } else if (config.interactionStyle.toLowerCase().includes('comical')) {
      response = `Ha! Great question! Let me put on my thinking cap... 🎩 *adjusts invisible monocle*`;
    }

    setTestMessages(prev => [...prev, { role: 'agent', text: response }]);
    setIsResponding(false);
  };

  return (
    <Card className="p-4 space-y-4 border-green-200 bg-green-50/30">
      <div className="flex items-center gap-2 text-green-700">
        <Check className="w-5 h-5" />
        <span className="font-medium">{agentName} is live!</span>
      </div>

      <div className="bg-white rounded-lg border p-4 space-y-3 min-h-[200px] max-h-[300px] overflow-auto">
        {testMessages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Start a test conversation</p>
          </div>
        )}

        {testMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
              msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {isResponding && (
          <div className="flex justify-start">
            <div className="bg-muted px-3 py-2 rounded-lg text-sm flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 px-3 py-2 border rounded-lg text-sm"
          placeholder="Test your agent..."
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTestSend()}
        />
        <Button size="sm" onClick={handleTestSend} disabled={isResponding}>
          <Play className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

export default ChatDrivenBuilder;
