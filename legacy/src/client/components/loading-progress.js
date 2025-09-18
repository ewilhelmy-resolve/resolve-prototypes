/**
 * Loading Progress Component
 * Shows animated progress steps during setup/loading processes
 */

export class LoadingProgress {
    constructor(config) {
        this.config = {
            containerId: config.containerId,
            steps: config.steps || [],
            onComplete: config.onComplete || null,
            onStepComplete: config.onStepComplete || null,
            autoStart: config.autoStart || false,
            showCheckmarks: config.showCheckmarks !== false,
            animateSteps: config.animateSteps !== false
        };
        
        this.currentStep = 0;
        this.isRunning = false;
        this.completedSteps = new Set();
        
        this.init();
    }

    init() {
        this.container = document.getElementById(this.config.containerId);
        if (!this.container) {
            console.error('LoadingProgress: Container element not found');
            return;
        }
        
        this.render();
        
        if (this.config.autoStart) {
            this.start();
        }
    }

    render() {
        const stepsHtml = this.config.steps.map((step, index) => `
            <div class="progress-step" data-step-id="${step.id}" data-step-index="${index}">
                <div class="step-indicator">
                    <div class="step-spinner" style="display: none;">
                        <div class="mini-spinner"></div>
                    </div>
                    <div class="step-checkmark" style="display: none;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17L4 12" stroke="#00ff88" stroke-width="3" 
                                  stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="step-pending">
                        <div class="pending-dot"></div>
                    </div>
                </div>
                <div class="step-label">${step.label}</div>
            </div>
        `).join('');
        
        this.container.innerHTML = `
            <div class="loading-progress-container">
                ${stepsHtml}
            </div>
        `;
        
        // Store references to step elements
        this.stepElements = this.container.querySelectorAll('.progress-step');
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.currentStep = 0;
        this.processNextStep();
    }

    processNextStep() {
        if (this.currentStep >= this.config.steps.length) {
            this.complete();
            return;
        }
        
        const step = this.config.steps[this.currentStep];
        const stepElement = this.stepElements[this.currentStep];
        
        // Start this step
        this.setStepState(stepElement, 'loading');
        
        // Simulate processing with the specified duration
        setTimeout(() => {
            // Complete this step
            this.setStepState(stepElement, 'complete');
            this.completedSteps.add(step.id);
            
            // Call step complete callback if provided
            if (this.config.onStepComplete) {
                this.config.onStepComplete(step, this.currentStep);
            }
            
            // Move to next step
            this.currentStep++;
            this.processNextStep();
            
        }, step.duration || 2000);
    }

    setStepState(stepElement, state) {
        const spinner = stepElement.querySelector('.step-spinner');
        const checkmark = stepElement.querySelector('.step-checkmark');
        const pending = stepElement.querySelector('.step-pending');
        
        // Hide all indicators first
        spinner.style.display = 'none';
        checkmark.style.display = 'none';
        pending.style.display = 'none';
        
        // Remove all state classes
        stepElement.classList.remove('loading', 'complete', 'pending');
        
        switch(state) {
            case 'loading':
                spinner.style.display = 'block';
                stepElement.classList.add('loading');
                if (this.config.animateSteps) {
                    stepElement.style.animation = 'pulseStep 1s ease-in-out infinite';
                }
                break;
                
            case 'complete':
                if (this.config.showCheckmarks) {
                    checkmark.style.display = 'block';
                    checkmark.style.animation = 'checkmarkPop 0.3s ease-out';
                }
                stepElement.classList.add('complete');
                stepElement.style.animation = '';
                break;
                
            case 'pending':
            default:
                pending.style.display = 'block';
                stepElement.classList.add('pending');
                break;
        }
    }

    complete() {
        this.isRunning = false;
        
        // Mark all as complete if not already
        this.stepElements.forEach((element, index) => {
            if (!element.classList.contains('complete')) {
                this.setStepState(element, 'complete');
            }
        });
        
        // Call complete callback
        if (this.config.onComplete) {
            this.config.onComplete(this.completedSteps);
        }
    }

    reset() {
        this.isRunning = false;
        this.currentStep = 0;
        this.completedSteps.clear();
        
        // Reset all steps to pending
        this.stepElements.forEach(element => {
            this.setStepState(element, 'pending');
        });
    }

    pause() {
        this.isRunning = false;
    }

    resume() {
        if (!this.isRunning && this.currentStep < this.config.steps.length) {
            this.isRunning = true;
            this.processNextStep();
        }
    }

    // Get current progress percentage
    getProgress() {
        return (this.completedSteps.size / this.config.steps.length) * 100;
    }

    // Check if a specific step is complete
    isStepComplete(stepId) {
        return this.completedSteps.has(stepId);
    }
}

// Inject required animations if not present
export function injectProgressAnimations() {
    if (document.getElementById('progress-animations')) return;
    
    const style = document.createElement('style');
    style.id = 'progress-animations';
    style.textContent = `
        @keyframes pulseStep {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.02); }
        }
        
        @keyframes checkmarkPop {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .mini-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(0, 102, 255, 0.2);
            border-top: 2px solid #0066ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
    `;
    
    document.head.appendChild(style);
}

// Auto-inject animations when module loads
injectProgressAnimations();