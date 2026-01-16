/**
 * GuidedBuilder - Espressive-style tabbed form builder
 *
 * Create modal → Tab workflow (Describe → Content → Build → Test) → Preview panel
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  ArrowLeft, MessageSquare, FileText, Zap, Save, Rocket,
  Upload, X, Sparkles, ChevronRight, ToggleRight, Send,
  FileQuestion, Bot,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────
// Types & Config
// ─────────────────────────────────────────────────────────────────────

const AGENT_TYPES = [
  {
    value: 'answer_formatter',
    label: 'Answer Formatter',
    desc: 'Reformats RAG/ITSM responses',
    icon: MessageSquare,
    color: 'bg-blue-500',
  },
  {
    value: 'embedded_knowledge',
    label: 'Embedded Knowledge',
    desc: 'Uses uploaded documents',
    icon: FileText,
    color: 'bg-amber-500',
  },
  {
    value: 'workflow_executor',
    label: 'Workflow Executor',
    desc: 'Runs automations & workflows',
    icon: Zap,
    color: 'bg-violet-500',
  },
];

const TABS: Record<string, string[]> = {
  answer_formatter: ['Describe', 'Content', 'Build', 'Test'],
  embedded_knowledge: ['Describe', 'Content', 'Build', 'Test'],
  workflow_executor: ['Describe', 'Actions', 'Build', 'Test'],
};

interface AgentConfig {
  name: string;
  type: string;
  persona: string;
  goal: string;
  completion: string;
  knowledge: string[];
  actions: string[];
  tone: string;
  fallback: string;
}

interface Message {
  role: 'user' | 'agent';
  content: string;
}

// ─────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────

export function GuidedBuilder() {
  const [showCreateModal, setShowCreateModal] = useState(true);
  const [activeTab, setActiveTab] = useState('Describe');
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<Message[]>([]);
  const [aiInput, setAiInput] = useState('');

  const [config, setConfig] = useState<AgentConfig>({
    name: '',
    type: '',
    persona: '',
    goal: '',
    completion: '',
    knowledge: [],
    actions: [],
    tone: 'friendly',
    fallback: 'apologize',
  });

  const [previewMessages, setPreviewMessages] = useState<Message[]>([]);
  const [previewInput, setPreviewInput] = useState('');
  const [previewTyping, setPreviewTyping] = useState(false);

  const tabs = config.type ? TABS[config.type] : ['Describe', 'Content', 'Build', 'Test'];
  const selectedType = AGENT_TYPES.find(t => t.value === config.type);
  const isReady = config.name && config.type && config.persona && config.goal;

  // ─────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────

  const handleCreate = () => {
    if (config.name && config.type) {
      setShowCreateModal(false);
      setAiMessages([{
        role: 'agent',
        content: `I'll help you build "${config.name}". Fill out the fields above, or ask me anything!`
      }]);
    }
  };

  const handleAiSend = () => {
    if (!aiInput.trim()) return;
    setAiMessages(prev => [...prev, { role: 'user', content: aiInput }]);
    const question = aiInput;
    setAiInput('');

    setTimeout(() => {
      let response = '';
      if (question.toLowerCase().includes('persona') || question.toLowerCase().includes('role')) {
        response = "For the persona, describe how your agent should present itself. For example:\n\n\"Friendly IT specialist who explains technical concepts simply and always confirms before taking actions.\"";
      } else if (question.toLowerCase().includes('goal') || question.toLowerCase().includes('do')) {
        response = "Describe what tasks this agent should accomplish. Be specific about the scope. For example:\n\n\"Help employees reset passwords, unlock accounts, and troubleshoot common VPN issues.\"";
      } else if (question.toLowerCase().includes('complete') || question.toLowerCase().includes('done')) {
        response = "Define when the agent's job is finished. Common patterns:\n\n• User confirms they're satisfied\n• The requested action completes\n• After a set number of exchanges";
      } else {
        response = "I can help you configure your agent. Try asking about:\n• Writing a good persona\n• Defining the agent's goal\n• Setting up knowledge sources\n• Choosing actions";
      }
      setAiMessages(prev => [...prev, { role: 'agent', content: response }]);
    }, 500);
  };

  const handlePreviewSend = () => {
    if (!previewInput.trim()) return;
    setPreviewMessages(prev => [...prev, { role: 'user', content: previewInput }]);
    const query = previewInput;
    setPreviewInput('');
    setPreviewTyping(true);

    setTimeout(() => {
      setPreviewTyping(false);
      let response = config.persona ? `${config.persona.slice(0, 30)}... ` : '';
      if (config.type === 'workflow_executor' && config.actions.length > 0) {
        response += `I'll run **${config.actions[0]}** for you. ✅ Done!`;
      } else {
        response += `I'd be happy to help with "${query}".`;
      }
      setPreviewMessages(prev => [...prev, { role: 'agent', content: response }]);
    }, 800);
  };

  const addKnowledge = () => {
    setConfig(c => ({ ...c, knowledge: [...c.knowledge, `Document_${c.knowledge.length + 1}.pdf`] }));
  };

  const addAction = (action: string) => {
    if (!config.actions.includes(action)) {
      setConfig(c => ({ ...c, actions: [...c.actions, action] }));
    }
  };

  const removeAction = (action: string) => {
    setConfig(c => ({ ...c, actions: c.actions.filter(a => a !== action) }));
  };

  // ─────────────────────────────────────────────────────────────────────
  // Create Modal
  // ─────────────────────────────────────────────────────────────────────

  if (showCreateModal) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md shadow-xl border-0">
          <div className="p-6 border-b">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Create New Agent</h2>
                <p className="text-sm text-slate-500">Give it a name and choose the type</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
              <Input
                type="text"
                value={config.name}
                onChange={e => setConfig(c => ({ ...c, name: e.target.value }))}
                placeholder="e.g., Benefits Expert, Password Helper..."
                className="h-12"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
              <div className="space-y-2">
                {AGENT_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setConfig(c => ({ ...c, type: t.value }))}
                      className={`w-full text-left p-4 rounded-xl border-2 transition flex items-center gap-3 ${
                        config.type === t.value
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg ${t.color} flex items-center justify-center text-white`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium">{t.label}</div>
                        <div className="text-xs text-slate-500">{t.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
            <Button variant="outline">Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!config.name || !config.type}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
            >
              Create Agent
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Main Builder
  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b shrink-0">
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          {selectedType && (
            <div className={`w-8 h-8 rounded-lg ${selectedType.color} flex items-center justify-center text-white`}>
              <selectedType.icon className="w-4 h-4" />
            </div>
          )}
          <h1 className="font-semibold">{config.name}</h1>
          <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">
            {selectedType?.label}
          </span>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Save className="w-4 h-4 mr-1.5" />
            Save Draft
          </Button>
          <Button
            disabled={!isReady}
            size="sm"
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
          >
            <Rocket className="w-4 h-4 mr-1.5" />
            Publish
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b px-4">
        <nav className="flex gap-1">
          {tabs.map((tab, idx) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
                activeTab === tab
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                activeTab === tab ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {idx + 1}
              </span>
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Form */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto">

            {/* DESCRIBE TAB */}
            {activeTab === 'Describe' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Agent Definition</h2>
                  <p className="text-sm text-slate-500">Define how this agent behaves and what it does.</p>
                </div>

                <Card className="p-5 space-y-5">
                  <div>
                    <label className="block font-medium text-slate-900 mb-2">
                      Describe the Role or Persona of the agent
                    </label>
                    <textarea
                      value={config.persona}
                      onChange={e => setConfig(c => ({ ...c, persona: e.target.value }))}
                      placeholder="e.g., Acts as a friendly, knowledgeable HR specialist who helps employees understand their benefits..."
                      rows={3}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-900 mb-2">
                      What do you want the Agent to do?
                    </label>
                    <textarea
                      value={config.goal}
                      onChange={e => setConfig(c => ({ ...c, goal: e.target.value }))}
                      placeholder="e.g., Answer questions about health benefits, explain coverage options, guide through enrollment process..."
                      rows={3}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-900 mb-2">
                      When is the job of the Agent Complete?
                    </label>
                    <textarea
                      value={config.completion}
                      onChange={e => setConfig(c => ({ ...c, completion: e.target.value }))}
                      placeholder="e.g., When the user confirms their question has been answered, or when they complete enrollment..."
                      rows={2}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none bg-slate-50 focus:bg-white"
                    />
                  </div>
                </Card>

                {/* Next button */}
                <div className="flex justify-end">
                  <Button onClick={() => setActiveTab(tabs[1])} className="gap-2">
                    Continue to {tabs[1]}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* CONTENT TAB (for non-workflow) */}
            {activeTab === 'Content' && config.type !== 'workflow_executor' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Knowledge Sources</h2>
                  <p className="text-sm text-slate-500">Add documents or connect sources for this agent to reference.</p>
                </div>

                <Card className="p-5">
                  <div className="space-y-3 mb-4">
                    {config.knowledge.map((k, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4 text-slate-400" />
                          {k}
                        </span>
                        <button
                          onClick={() => setConfig(c => ({ ...c, knowledge: c.knowledge.filter((_, idx) => idx !== i) }))}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={addKnowledge}
                    className="w-full p-8 border-2 border-dashed rounded-xl text-slate-500 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 transition"
                  >
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <div className="font-medium">Upload Document</div>
                    <div className="text-xs mt-1">PDF, DOCX, TXT, Markdown</div>
                  </button>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab('Describe')}>
                    Back
                  </Button>
                  <Button onClick={() => setActiveTab('Build')} className="gap-2">
                    Continue to Build
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ACTIONS TAB (for workflow) */}
            {activeTab === 'Actions' && config.type === 'workflow_executor' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Resolve Actions</h2>
                  <p className="text-sm text-slate-500">Select which actions this agent can perform.</p>
                </div>

                <Card className="p-5">
                  {config.actions.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Selected</label>
                      {config.actions.map((a, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-violet-50 rounded-lg border border-violet-200">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <Zap className="w-4 h-4 text-violet-500" />
                            {a}
                          </span>
                          <button onClick={() => removeAction(a)} className="text-slate-400 hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Available Actions</label>
                  <div className="space-y-2 mt-2">
                    {['AD_Password_Reset', 'ServiceNow_Create_Ticket', 'Okta_Unlock_Account', 'Slack_Send_Message']
                      .filter(a => !config.actions.includes(a))
                      .map(action => (
                        <button
                          key={action}
                          onClick={() => addAction(action)}
                          className="w-full text-left p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition flex items-center justify-between"
                        >
                          <span className="text-sm">{action}</span>
                          <span className="text-violet-600 text-sm font-medium">+ Add</span>
                        </button>
                      ))}
                  </div>
                </Card>

                {/* Workflow preview */}
                {config.actions.length > 0 && (
                  <Card className="p-5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">Workflow Preview</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">Trigger</span>
                      {config.actions.map((a, i) => (
                        <span key={i} className="flex items-center gap-2">
                          <span className="text-slate-400">→</span>
                          <span className="px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg text-sm font-medium">{a}</span>
                        </span>
                      ))}
                      <span className="text-slate-400">→</span>
                      <span className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-sm font-medium">End</span>
                    </div>
                  </Card>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab('Describe')}>
                    Back
                  </Button>
                  <Button onClick={() => setActiveTab('Build')} className="gap-2">
                    Continue to Build
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* BUILD TAB */}
            {activeTab === 'Build' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Behavior Settings</h2>
                  <p className="text-sm text-slate-500">Configure how the agent responds and handles edge cases.</p>
                </div>

                <Card className="p-5 space-y-5">
                  <div>
                    <label className="block font-medium text-slate-900 mb-2">Interaction Style</label>
                    <select
                      value={config.tone}
                      onChange={e => setConfig(c => ({ ...c, tone: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    >
                      <option value="friendly">Friendly and conversational</option>
                      <option value="professional">Professional and formal</option>
                      <option value="concise">Concise and direct</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-900 mb-2">When content is insufficient</label>
                    <select
                      value={config.fallback}
                      onChange={e => setConfig(c => ({ ...c, fallback: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    >
                      <option value="apologize">Apologize and offer alternatives</option>
                      <option value="escalate">Escalate to human agent</option>
                      <option value="ticket">Create a support ticket</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">Context Switching</div>
                      <div className="text-xs text-slate-500">Allow users to change topics mid-conversation</div>
                    </div>
                    <ToggleRight className="w-10 h-6 text-violet-600" />
                  </div>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab(tabs[1])}>
                    Back
                  </Button>
                  <Button onClick={() => setActiveTab('Test')} className="gap-2">
                    Continue to Test
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* TEST TAB */}
            {activeTab === 'Test' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Test Your Agent</h2>
                  <p className="text-sm text-slate-500">Try out conversations in the preview panel on the right.</p>
                </div>

                <Card className="p-5">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
                      <FileQuestion className="w-8 h-8 text-violet-600" />
                    </div>
                    <p className="font-medium text-slate-700">Ready to test</p>
                    <p className="text-sm text-slate-500 mt-1">Use the preview panel to simulate conversations</p>
                  </div>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab('Build')}>
                    Back
                  </Button>
                  <Button disabled={!isReady} className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600">
                    <Rocket className="w-4 h-4" />
                    Publish Agent
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="w-80 bg-white border-l flex flex-col shrink-0">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-medium text-sm">Preview</h3>
            {previewMessages.length > 0 && (
              <button onClick={() => setPreviewMessages([])} className="text-xs text-slate-500 hover:text-slate-700">Reset</button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {previewMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center px-4">
                  {selectedType && (
                    <div className={`w-14 h-14 ${selectedType.color} rounded-2xl flex items-center justify-center mx-auto mb-3`}>
                      <selectedType.icon className="w-7 h-7 text-white" />
                    </div>
                  )}
                  <h3 className="font-semibold">{config.name}</h3>
                  <p className="text-xs text-slate-500 mt-2">Test your agent below</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {previewMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      msg.role === 'user' ? 'bg-violet-600 text-white' : 'bg-slate-100'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {previewTyping && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-2xl px-3 py-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t p-3">
            <div className="flex gap-2">
              <Input
                type="text"
                value={previewInput}
                onChange={e => setPreviewInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePreviewSend()}
                placeholder="Test a message..."
                className="flex-1"
              />
              <Button onClick={handlePreviewSend} disabled={!previewInput} size="icon" className="shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating AI Assistant */}
      <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-xl transition-all ${aiChatOpen ? 'h-72' : 'h-auto'}`}>
        <div className="bg-white rounded-2xl shadow-xl border overflow-hidden">
          {aiChatOpen && (
            <div className="h-48 overflow-auto p-4 border-b">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`mb-3 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <span className={`inline-block px-3 py-2 rounded-xl text-sm ${
                    msg.role === 'user' ? 'bg-violet-100 text-violet-900' : 'bg-slate-100'
                  }`}>
                    {msg.content}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 flex items-center gap-3">
            <button
              onClick={() => setAiChatOpen(!aiChatOpen)}
              className="flex items-center gap-2 text-violet-600 shrink-0"
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium">AI Assistant</span>
              <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded">Beta</span>
            </button>
            <Input
              type="text"
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onFocus={() => setAiChatOpen(true)}
              onKeyDown={e => e.key === 'Enter' && handleAiSend()}
              placeholder="Ask for help..."
              className="flex-1 bg-slate-50 border-0"
            />
            <Button onClick={handleAiSend} disabled={!aiInput} variant="ghost" size="icon" className="text-violet-600">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GuidedBuilder;
