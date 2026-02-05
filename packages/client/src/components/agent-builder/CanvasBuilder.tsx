/**
 * CanvasBuilder - Visual workflow canvas for Workflow Executor agents
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { AgentDefinition, WorkflowStep, StepType } from './types';
import { STEP_TYPE_META } from './types';

interface CanvasBuilderProps {
  agent: Partial<AgentDefinition>;
  onChange: (agent: Partial<AgentDefinition>) => void;
  onBack: () => void;
  onNext: () => void;
}

export function CanvasBuilder({ agent, onChange, onBack, onNext }: CanvasBuilderProps) {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [draggedStepType, setDraggedStepType] = useState<StepType | null>(null);

  const steps = agent.steps || [];
  const selectedStep = steps.find((s) => s.id === selectedStepId);

  const handleAddStep = (type: StepType, position?: { x: number; y: number }) => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      type,
      name: `New ${STEP_TYPE_META[type].label}`,
      position: position || { x: 100 + steps.length * 180, y: 150 },
      connections: [],
    };
    onChange({ ...agent, steps: [...steps, newStep] });
    setSelectedStepId(newStep.id);
  };

  const handleUpdateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    onChange({
      ...agent,
      steps: steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)),
    });
  };

  const handleDeleteStep = (stepId: string) => {
    onChange({
      ...agent,
      steps: steps.filter((s) => s.id !== stepId).map((s) => ({
        ...s,
        connections: s.connections.filter((c) => c.targetStepId !== stepId),
      })),
    });
    setSelectedStepId(null);
  };

  const handleConnect = (sourceId: string, targetId: string, label?: string) => {
    const source = steps.find((s) => s.id === sourceId);
    if (source && sourceId !== targetId) {
      // Avoid duplicate connections
      if (!source.connections.some((c) => c.targetStepId === targetId)) {
        handleUpdateStep(sourceId, {
          connections: [...source.connections, { targetStepId: targetId, label }],
        });
      }
    }
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedStepType) {
      const rect = e.currentTarget.getBoundingClientRect();
      handleAddStep(draggedStepType, {
        x: e.clientX - rect.left - 75,
        y: e.clientY - rect.top - 30,
      });
      setDraggedStepType(null);
    }
  };

  return (
    <div className="h-full flex">
      {/* Left: Step Palette */}
      <aside className="w-56 border-r bg-muted/20 flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-medium text-sm">Add Step</h3>
          <p className="text-xs text-muted-foreground mt-1">Drag onto canvas or click to add</p>
        </div>

        <div className="flex-1 overflow-auto p-2 space-y-1">
          {(Object.entries(STEP_TYPE_META) as [StepType, typeof STEP_TYPE_META[StepType]][]).map(
            ([type, meta]) => (
              <div
                key={type}
                draggable
                onDragStart={() => setDraggedStepType(type)}
                onDragEnd={() => setDraggedStepType(null)}
                onClick={() => handleAddStep(type)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-muted border ${meta.color}`}
              >
                <span>{meta.icon}</span>
                <span className="text-sm font-medium">{meta.label}</span>
              </div>
            )
          )}
        </div>

        <div className="p-4 border-t">
          <h4 className="font-medium text-sm mb-2">Actions Library</h4>
          <div className="space-y-1 text-sm">
            {[
              'servicenow.ticket.create',
              'servicenow.password.reset',
              'resolve.identity.verify',
              'resolve.email.send',
            ].map((action) => (
              <button
                key={action}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-xs font-mono truncate"
                onClick={() => {
                  handleAddStep('action');
                }}
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Center: Canvas */}
      <main
        className="flex-1 relative overflow-auto bg-[radial-gradient(circle,#e5e5e5_1px,transparent_1px)] bg-[size:20px_20px]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleCanvasDrop}
        onClick={() => setSelectedStepId(null)}
      >
        {/* Connection Lines (SVG) */}
        <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
          {steps.flatMap((step) =>
            step.connections.map((conn) => {
              const target = steps.find((s) => s.id === conn.targetStepId);
              if (!target) return null;
              return (
                <g key={`${step.id}-${conn.targetStepId}`}>
                  <line
                    x1={step.position.x + 75}
                    y1={step.position.y + 60}
                    x2={target.position.x + 75}
                    y2={target.position.y}
                    stroke="#94a3b8"
                    strokeWidth={2}
                    markerEnd="url(#arrowhead)"
                  />
                  {conn.label && (
                    <text
                      x={(step.position.x + target.position.x) / 2 + 75}
                      y={(step.position.y + target.position.y) / 2 + 30}
                      className="text-xs fill-muted-foreground"
                      textAnchor="middle"
                    >
                      {conn.label}
                    </text>
                  )}
                </g>
              );
            })
          )}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
            </marker>
          </defs>
        </svg>

        {/* Step Nodes */}
        {steps.map((step) => (
          <StepNode
            key={step.id}
            step={step}
            isSelected={step.id === selectedStepId}
            onSelect={() => setSelectedStepId(step.id)}
            onMove={(pos) => handleUpdateStep(step.id, { position: pos })}
            onConnect={(targetId, label) => handleConnect(step.id, targetId, label)}
            allSteps={steps}
          />
        ))}

        {/* Empty State */}
        {steps.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="text-4xl mb-4">🔧</div>
              <p className="font-medium">Start building your workflow</p>
              <p className="text-sm mt-1">Drag steps from the left panel or click to add</p>
              <Button variant="outline" className="mt-4" onClick={() => handleAddStep('prompt')}>
                + Add First Step
              </Button>
            </div>
          </div>
        )}

        {/* Canvas Controls */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <Button variant="outline" size="sm">
            Zoom In
          </Button>
          <Button variant="outline" size="sm">
            Zoom Out
          </Button>
          <Button variant="outline" size="sm">
            Fit View
          </Button>
        </div>
      </main>

      {/* Right: Step Inspector */}
      {selectedStep && (
        <aside className="w-72 border-l bg-background flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-medium">Configure Step</h3>
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedStepId(null)}
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Step Name</label>
              <input
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-lg"
                value={selectedStep.name}
                onChange={(e) => handleUpdateStep(selectedStep.id, { name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Type</label>
              <div className="mt-1 px-3 py-2 bg-muted rounded-lg text-sm flex items-center gap-2">
                <span>{STEP_TYPE_META[selectedStep.type].icon}</span>
                <span>{STEP_TYPE_META[selectedStep.type].label}</span>
              </div>
            </div>

            {selectedStep.type === 'action' && (
              <ActionStepConfig step={selectedStep} onChange={(updates) => handleUpdateStep(selectedStep.id, updates)} />
            )}

            {selectedStep.type === 'condition' && (
              <ConditionStepConfig step={selectedStep} onChange={(updates) => handleUpdateStep(selectedStep.id, updates)} />
            )}

            {selectedStep.type === 'prompt' && (
              <PromptStepConfig step={selectedStep} onChange={(updates) => handleUpdateStep(selectedStep.id, updates)} />
            )}

            <div>
              <label className="text-sm font-medium">Connections</label>
              <div className="mt-2 space-y-2">
                {selectedStep.connections.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No outgoing connections</p>
                ) : (
                  selectedStep.connections.map((conn) => {
                    const target = steps.find((s) => s.id === conn.targetStepId);
                    return (
                      <div
                        key={conn.targetStepId}
                        className="flex items-center justify-between px-2 py-1.5 bg-muted rounded text-sm"
                      >
                        <span>→ {target?.name || 'Unknown'}</span>
                        {conn.label && (
                          <span className="text-xs text-muted-foreground">{conn.label}</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="p-4 border-t">
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => handleDeleteStep(selectedStep.id)}
            >
              Delete Step
            </Button>
          </div>
        </aside>
      )}

      {/* Footer */}
      <div className="absolute bottom-0 left-56 right-0 p-4 border-t bg-background flex gap-2">
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button className="flex-1" onClick={onNext}>
          Preview Workflow →
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step Node Component
// ─────────────────────────────────────────────────────────────────────

interface StepNodeProps {
  step: WorkflowStep;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (position: { x: number; y: number }) => void;
  onConnect: (targetId: string, label?: string) => void;
  allSteps: WorkflowStep[];
}

function StepNode({ step, isSelected, onSelect, onMove, onConnect, allSteps }: StepNodeProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showConnectMenu, setShowConnectMenu] = useState(false);
  const meta = STEP_TYPE_META[step.type];

  const handleDrag = (e: React.DragEvent) => {
    if (isDragging) {
      const rect = e.currentTarget.parentElement?.getBoundingClientRect();
      if (rect) {
        onMove({
          x: e.clientX - rect.left - 75,
          y: e.clientY - rect.top - 30,
        });
      }
    }
  };

  return (
    <div
      className={`absolute w-[150px] cursor-move transition-shadow ${
        isSelected ? 'z-10' : ''
      }`}
      style={{ left: step.position.x, top: step.position.y }}
      draggable
      onDragStart={() => setIsDragging(true)}
      onDrag={handleDrag}
      onDragEnd={() => setIsDragging(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <Card
        className={`p-3 border-2 ${meta.color} ${
          isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span>{meta.icon}</span>
          <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
        </div>
        <div className="font-medium text-sm truncate">{step.name}</div>
      </Card>

      {/* Connection Port */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
        <button
          className="w-4 h-4 rounded-full bg-primary border-2 border-background hover:scale-125 transition-transform"
          onClick={(e) => {
            e.stopPropagation();
            setShowConnectMenu(!showConnectMenu);
          }}
        />

        {showConnectMenu && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-background border rounded-lg shadow-lg p-2 min-w-[150px] z-20">
            <p className="text-xs text-muted-foreground mb-2">Connect to:</p>
            {allSteps
              .filter((s) => s.id !== step.id)
              .map((s) => (
                <button
                  key={s.id}
                  className="w-full text-left px-2 py-1 text-sm rounded hover:bg-muted"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConnect(s.id);
                    setShowConnectMenu(false);
                  }}
                >
                  {s.name}
                </button>
              ))}
            {allSteps.length <= 1 && (
              <p className="text-xs text-muted-foreground">Add more steps first</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step Config Components
// ─────────────────────────────────────────────────────────────────────

function ActionStepConfig({ step: _step, onChange: _onChange }: { step: WorkflowStep; onChange: (u: Partial<WorkflowStep>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">Action</label>
        <select className="w-full mt-1 px-3 py-2 border rounded-lg">
          <option>servicenow.ticket.create</option>
          <option>servicenow.password.reset</option>
          <option>resolve.identity.verify</option>
          <option>resolve.email.send</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Input</label>
        <input
          type="text"
          className="w-full mt-1 px-3 py-2 border rounded-lg font-mono text-xs"
          placeholder="{{ user.email }}"
        />
      </div>
      <div>
        <label className="text-sm font-medium">On Error</label>
        <select className="w-full mt-1 px-3 py-2 border rounded-lg">
          <option>Fail</option>
          <option>Skip</option>
          <option>Retry</option>
          <option>Branch</option>
        </select>
      </div>
    </div>
  );
}

function ConditionStepConfig({ step: _step, onChange: _onChange }: { step: WorkflowStep; onChange: (u: Partial<WorkflowStep>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">Expression</label>
        <input
          type="text"
          className="w-full mt-1 px-3 py-2 border rounded-lg font-mono text-xs"
          placeholder="{{ result.valid }} === true"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Branches</label>
        <div className="mt-1 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-16 text-green-600 font-medium">Yes →</span>
            <select className="flex-1 px-2 py-1 border rounded text-xs">
              <option>Next step</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-16 text-red-600 font-medium">No →</span>
            <select className="flex-1 px-2 py-1 border rounded text-xs">
              <option>Escalate</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function PromptStepConfig({ step: _step, onChange: _onChange }: { step: WorkflowStep; onChange: (u: Partial<WorkflowStep>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">Message</label>
        <textarea
          className="w-full mt-1 px-3 py-2 border rounded-lg resize-none"
          rows={2}
          placeholder="What would you like to ask the user?"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Input Type</label>
        <select className="w-full mt-1 px-3 py-2 border rounded-lg">
          <option>Text</option>
          <option>Choice</option>
          <option>Confirmation (Yes/No)</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Timeout (seconds)</label>
        <input
          type="number"
          className="w-full mt-1 px-3 py-2 border rounded-lg"
          defaultValue={60}
        />
      </div>
    </div>
  );
}
