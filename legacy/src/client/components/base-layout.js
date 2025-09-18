/**
 * Base Layout Component
 * Provides the standard two-panel layout structure for onboarding pages
 */

import { RitaChat } from './rita-chat.js';
import { WorkflowBackground } from './workflow-background.js';
import { injectWorkflowAnimations } from './workflow-background.js';

export class BaseLayout {
    constructor(config) {
        this.config = {
            containerId: config.containerId || 'app',
            theme: config.theme || 'dark',
            leftContent: config.leftContent || null,
            rightPanelType: config.rightPanelType || 'rita', // 'rita' or 'custom'
            rightContent: config.rightContent || null,
            ritaOptions: config.ritaOptions || {},
            workflowOptions: config.workflowOptions || {},
            onReady: config.onReady || null
        };
        
        this.components = {};
        this.init();
    }

    init() {
        this.container = document.getElementById(this.config.containerId);
        if (!this.container) {
            console.error('BaseLayout: Container element not found');
            return;
        }
        
        this.render();
        this.initializeComponents();
        
        if (this.config.onReady) {
            this.config.onReady(this);
        }
    }

    render() {
        const html = `
            <div class="rt-Theme" data-radius="medium" data-appearance="${this.config.theme}">
                <div class="onboarding-container">
                    <!-- Left side - Form -->
                    <div class="form-section">
                        <div class="form-container" id="left-content">
                            ${this.config.leftContent || ''}
                        </div>
                    </div>

                    <!-- Right side - Graphic/Rita -->
                    <div class="graphic-section">
                        <div class="rita-container">
                            <!-- Background workflow nodes -->
                            <div id="workflow-background"></div>
                            
                            <!-- Main content area -->
                            <div id="right-panel-content">
                                ${this.config.rightPanelType === 'custom' ? 
                                    (this.config.rightContent || '') : 
                                    '<div id="rita-chat-container"></div>'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
    }

    initializeComponents() {
        // Initialize workflow background
        injectWorkflowAnimations();
        this.components.workflowBackground = new WorkflowBackground(
            'workflow-background', 
            this.config.workflowOptions
        );
        
        // Initialize Rita chat if needed
        if (this.config.rightPanelType === 'rita') {
            this.components.ritaChat = new RitaChat(
                'rita-chat-container',
                this.config.ritaOptions
            );
        }
    }

    updateLeftContent(content) {
        const leftContainer = document.getElementById('left-content');
        if (leftContainer) {
            leftContainer.innerHTML = content;
        }
    }

    updateRightContent(content) {
        const rightContainer = document.getElementById('right-panel-content');
        if (rightContainer) {
            rightContainer.innerHTML = content;
        }
    }

    getRitaChat() {
        return this.components.ritaChat;
    }

    getWorkflowBackground() {
        return this.components.workflowBackground;
    }

    setTheme(theme) {
        const themeContainer = this.container.querySelector('.rt-Theme');
        if (themeContainer) {
            themeContainer.setAttribute('data-appearance', theme);
        }
    }

    destroy() {
        // Clean up components
        Object.values(this.components).forEach(component => {
            if (component && component.destroy) {
                component.destroy();
            }
        });
        
        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

/**
 * Page Builder - Helper class to quickly build standard pages
 */
export class PageBuilder {
    constructor() {
        this.layout = null;
        this.formComponents = [];
    }

    static createStandardPage(config) {
        const builder = new PageBuilder();
        return builder.build(config);
    }

    build(config) {
        // Create the base layout
        this.layout = new BaseLayout({
            containerId: config.containerId || 'app',
            leftContent: this.buildLeftContent(config),
            ritaOptions: config.ritaOptions || {},
            workflowOptions: config.workflowOptions || {},
            onReady: (layout) => {
                this.attachFormEvents(layout, config);
                if (config.onReady) {
                    config.onReady(layout, this);
                }
            }
        });
        
        return this.layout;
    }

    buildLeftContent(config) {
        const parts = [];
        
        // Add step header if provided
        if (config.stepHeader) {
            parts.push(config.stepHeader);
        }
        
        // Add form content
        if (config.formContent) {
            parts.push(config.formContent);
        }
        
        // Add navigation buttons if provided
        if (config.navigationButtons) {
            parts.push(config.navigationButtons);
        }
        
        return parts.join('');
    }

    attachFormEvents(layout, config) {
        // Attach any form-specific event handlers
        if (config.formHandlers) {
            config.formHandlers.forEach(handler => {
                handler(layout);
            });
        }
    }

    addFormComponent(component) {
        this.formComponents.push(component);
        return this;
    }

    getFormValues() {
        const values = {};
        this.formComponents.forEach(component => {
            if (component.getValue) {
                values[component.name] = component.getValue();
            }
        });
        return values;
    }

    validateForm() {
        let isValid = true;
        this.formComponents.forEach(component => {
            if (component.validate && !component.validate()) {
                isValid = false;
            }
        });
        return isValid;
    }
}

/**
 * Utility function to load all page resources
 */
export async function loadPageResources() {
    // Ensure all required styles are loaded
    const styles = [
        'https://cdn.jsdelivr.net/npm/@radix-ui/themes@3.0.0/styles.css',
        '/fonts.css',
        '/styles.css',
        '/styles/base.css'
    ];
    
    styles.forEach(href => {
        if (!document.querySelector(`link[href="${href}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        }
    });
}