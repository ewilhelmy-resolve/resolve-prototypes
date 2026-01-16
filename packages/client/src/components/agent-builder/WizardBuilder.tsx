/**
 * WizardBuilder - Wizard + Live Preview layout for Answer/RAG agents
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type { AgentDefinition, KnowledgeSource, CompletionRule, Guardrail } from './types';

interface WizardBuilderProps {
  agent: Partial<AgentDefinition>;
  onChange: (agent: Partial<AgentDefinition>) => void;
  onBack: () => void;
  onNext: () => void;
}

type WizardTab = 'knowledge' | 'persona' | 'completion' | 'guardrails';

export function WizardBuilder({ agent, onChange, onBack, onNext }: WizardBuilderProps) {
  const [activeTab, setActiveTab] = useState<WizardTab>('knowledge');
  const [previewMessages, setPreviewMessages] = useState<{ role: 'user' | 'agent'; content: string }[]>([]);
  const [previewInput, setPreviewInput] = useState('');

  const tabs: { id: WizardTab; label: string; icon: string }[] = [
    { id: 'knowledge', label: 'Knowledge Sources', icon: '📚' },
    { id: 'persona', label: 'Persona & Tone', icon: '🎭' },
    { id: 'completion', label: 'Completion Rules', icon: '✅' },
    { id: 'guardrails', label: 'Guardrails', icon: '🛡️' },
  ];

  const handlePreviewSend = () => {
    if (!previewInput.trim()) return;
    setPreviewMessages((prev) => [...prev, { role: 'user', content: previewInput }]);
    // Mock response based on persona
    const tone = agent.persona?.tone || 'professional';
    const responses: Record<string, string> = {
      professional: `Based on the available information, I can help you with that. ${previewInput.includes('?') ? 'Let me provide a detailed response.' : ''}`,
      friendly: `Great question! I'd love to help you with that. 😊`,
      concise: `Here's what you need to know:`,
    };
    setTimeout(() => {
      setPreviewMessages((prev) => [...prev, { role: 'agent', content: responses[tone] }]);
    }, 500);
    setPreviewInput('');
  };

  return (
    <div className="h-full flex">
      {/* Left: Config Wizard */}
      <div className="w-[400px] flex flex-col border-r bg-muted/20">
        {/* Tab Navigation */}
        <nav className="p-2 border-b space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'knowledge' && (
            <KnowledgeTab
              sources={agent.knowledgeSources || []}
              onChange={(knowledgeSources) => onChange({ ...agent, knowledgeSources })}
            />
          )}
          {activeTab === 'persona' && (
            <PersonaTab
              persona={agent.persona}
              onChange={(persona) => onChange({ ...agent, persona })}
            />
          )}
          {activeTab === 'completion' && (
            <CompletionTab
              rules={agent.completionRules || []}
              onChange={(completionRules) => onChange({ ...agent, completionRules })}
            />
          )}
          {activeTab === 'guardrails' && (
            <GuardrailsTab
              guardrails={agent.guardrails || []}
              onChange={(guardrails) => onChange({ ...agent, guardrails })}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-2">
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <Button className="flex-1" onClick={onNext}>
            Preview Agent →
          </Button>
        </div>
      </div>

      {/* Right: Live Preview */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
          <div>
            <h3 className="font-medium">Live Preview</h3>
            <p className="text-sm text-muted-foreground">See how your agent responds in real-time</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPreviewMessages([])}>
            Clear
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {previewMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <div className="text-4xl mb-4">💬</div>
              <p>Try a sample question:</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-md">
                {[
                  'What are my health benefits?',
                  'How do I reset my password?',
                  'When is open enrollment?',
                ].map((q) => (
                  <button
                    key={q}
                    className="px-3 py-1.5 bg-muted rounded-full text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => setPreviewInput(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {previewMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.role === 'agent' && (
                      <div className="text-xs text-muted-foreground mb-1">
                        {agent.persona?.name || agent.name || 'Agent'}
                      </div>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 px-4 py-2 border rounded-lg"
              placeholder="Type a test message..."
              value={previewInput}
              onChange={(e) => setPreviewInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePreviewSend()}
            />
            <Button onClick={handlePreviewSend}>Send</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Knowledge Sources Tab
// ─────────────────────────────────────────────────────────────────────

interface KnowledgeTabProps {
  sources: KnowledgeSource[];
  onChange: (sources: KnowledgeSource[]) => void;
}

function KnowledgeTab({ sources, onChange }: KnowledgeTabProps) {
  const availableSources = [
    { id: 'benefits_handbook', name: 'Benefits Handbook 2024.pdf', type: 'file' as const },
    { id: 'hr_confluence', name: 'HR Policies (Confluence)', type: 'confluence' as const },
    { id: 'it_sharepoint', name: 'IT Documentation', type: 'sharepoint' as const },
  ];

  const toggleSource = (source: typeof availableSources[0]) => {
    const exists = sources.find((s) => s.id === source.id);
    if (exists) {
      onChange(sources.filter((s) => s.id !== source.id));
    } else {
      onChange([...sources, { ...source, priority: sources.length + 1 }]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-2">Select Knowledge Sources</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Choose which documents and sources your agent can access
        </p>
      </div>

      <div className="space-y-2">
        {availableSources.map((source) => {
          const isSelected = sources.some((s) => s.id === source.id);
          return (
            <Card
              key={source.id}
              className={`p-3 cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
              onClick={() => toggleSource(source)}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {source.type === 'file' ? '📄' : source.type === 'confluence' ? '🔗' : '📁'}
                </span>
                <div className="flex-1">
                  <div className="font-medium text-sm">{source.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{source.type}</div>
                </div>
                {isSelected && <span className="text-primary">✓</span>}
              </div>
            </Card>
          );
        })}
      </div>

      <Button variant="outline" size="sm" className="w-full">
        + Connect New Source
      </Button>

      {sources.length > 0 && (
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2 text-sm">Priority Order</h4>
          <p className="text-xs text-muted-foreground mb-2">
            Drag to reorder. Higher priority sources are checked first.
          </p>
          <div className="space-y-1">
            {sources.map((source, i) => (
              <div
                key={source.id}
                className="flex items-center gap-2 px-3 py-2 bg-muted rounded text-sm"
              >
                <span className="text-muted-foreground">{i + 1}.</span>
                <span>{source.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Persona Tab
// ─────────────────────────────────────────────────────────────────────

interface PersonaTabProps {
  persona?: AgentDefinition['persona'];
  onChange: (persona: AgentDefinition['persona']) => void;
}

function PersonaTab({ persona, onChange }: PersonaTabProps) {
  const tones: { value: 'professional' | 'friendly' | 'concise'; label: string; example: string }[] = [
    {
      value: 'professional',
      label: 'Professional',
      example: 'I would be happy to assist you with your inquiry.',
    },
    {
      value: 'friendly',
      label: 'Friendly',
      example: "Hey! I'd love to help you out with that! 😊",
    },
    {
      value: 'concise',
      label: 'Concise',
      example: 'Here is the answer:',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium">Agent Display Name</label>
        <input
          type="text"
          className="w-full mt-1 px-3 py-2 border rounded-lg"
          placeholder="e.g., Benefits Bot, HR Helper"
          value={persona?.name || ''}
          onChange={(e) => onChange({ ...persona, name: e.target.value, tone: persona?.tone || 'professional', instructions: persona?.instructions || '' })}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Tone</label>
        <div className="space-y-2">
          {tones.map((tone) => (
            <Card
              key={tone.value}
              className={`p-3 cursor-pointer transition-all ${
                persona?.tone === tone.value ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
              }`}
              onClick={() => onChange({ ...persona, name: persona?.name || '', tone: tone.value, instructions: persona?.instructions || '' })}
            >
              <div className="font-medium text-sm">{tone.label}</div>
              <div className="text-xs text-muted-foreground mt-1 italic">"{tone.example}"</div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Custom Instructions</label>
        <textarea
          className="w-full mt-1 px-3 py-2 border rounded-lg resize-none"
          rows={4}
          placeholder="Add specific instructions for the agent..."
          value={persona?.instructions || ''}
          onChange={(e) => onChange({ ...persona, name: persona?.name || '', tone: persona?.tone || 'professional', instructions: e.target.value })}
        />
        <p className="text-xs text-muted-foreground mt-1">
          E.g., "Always mention the deadline for open enrollment (Nov 15)"
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Completion Rules Tab
// ─────────────────────────────────────────────────────────────────────

interface CompletionTabProps {
  rules: CompletionRule[];
  onChange: (rules: CompletionRule[]) => void;
}

function CompletionTab({ rules, onChange }: CompletionTabProps) {
  const ruleTypes: { type: CompletionRule['type']; label: string; description: string; hasValue?: boolean }[] = [
    {
      type: 'user_confirmed',
      label: 'User Confirmed',
      description: 'Complete when user says "thanks" or clicks 👍',
    },
    {
      type: 'goal_achieved',
      label: 'Goal Achieved',
      description: 'Complete when workflow reaches success state',
    },
    {
      type: 'max_turns',
      label: 'Max Turns',
      description: 'Complete after N conversation turns',
      hasValue: true,
    },
    {
      type: 'timeout',
      label: 'Timeout',
      description: 'Complete after N minutes of inactivity',
      hasValue: true,
    },
  ];

  const toggleRule = (type: CompletionRule['type']) => {
    const existing = rules.find((r) => r.type === type);
    if (existing) {
      onChange(rules.map((r) => (r.type === type ? { ...r, enabled: !r.enabled } : r)));
    } else {
      onChange([...rules, { type, enabled: true, value: type === 'max_turns' ? 10 : type === 'timeout' ? 30 : undefined }]);
    }
  };

  const updateValue = (type: CompletionRule['type'], value: number) => {
    onChange(rules.map((r) => (r.type === type ? { ...r, value } : r)));
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-2">When is the agent "done"?</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Define conditions that complete the conversation
        </p>
      </div>

      <div className="space-y-3">
        {ruleTypes.map((ruleType) => {
          const rule = rules.find((r) => r.type === ruleType.type);
          const isEnabled = rule?.enabled ?? false;

          return (
            <Card key={ruleType.type} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-medium text-sm">{ruleType.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {ruleType.description}
                  </div>
                  {ruleType.hasValue && isEnabled && (
                    <input
                      type="number"
                      className="mt-2 w-20 px-2 py-1 border rounded text-sm"
                      value={rule?.value || 10}
                      onChange={(e) => updateValue(ruleType.type, parseInt(e.target.value))}
                    />
                  )}
                </div>
                <Switch checked={isEnabled} onCheckedChange={() => toggleRule(ruleType.type)} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Guardrails Tab
// ─────────────────────────────────────────────────────────────────────

interface GuardrailsTabProps {
  guardrails: Guardrail[];
  onChange: (guardrails: Guardrail[]) => void;
}

function GuardrailsTab({ guardrails, onChange }: GuardrailsTabProps) {
  const guardrailTypes: { type: Guardrail['type']; label: string; description: string }[] = [
    {
      type: 'pii_redaction',
      label: 'PII Redaction',
      description: 'Automatically mask SSN, credit cards, phone numbers',
    },
    {
      type: 'topic_restriction',
      label: 'Topic Restriction',
      description: 'Block or warn on sensitive topics',
    },
    {
      type: 'escalation_trigger',
      label: 'Escalation Triggers',
      description: 'Auto-escalate on keywords like "manager" or "complaint"',
    },
    {
      type: 'max_turns',
      label: 'Turn Limit',
      description: 'Escalate if conversation exceeds N turns',
    },
  ];

  const toggleGuardrail = (type: Guardrail['type']) => {
    const existing = guardrails.find((g) => g.type === type);
    if (existing) {
      onChange(guardrails.map((g) => (g.type === type ? { ...g, enabled: !g.enabled } : g)));
    } else {
      onChange([...guardrails, { type, enabled: true }]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-2">Safety & Compliance</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Configure guardrails to keep conversations safe
        </p>
      </div>

      <div className="space-y-3">
        {guardrailTypes.map((guardType) => {
          const guard = guardrails.find((g) => g.type === guardType.type);
          const isEnabled = guard?.enabled ?? false;

          return (
            <Card key={guardType.type} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-medium text-sm">{guardType.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {guardType.description}
                  </div>
                </div>
                <Switch checked={isEnabled} onCheckedChange={() => toggleGuardrail(guardType.type)} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
