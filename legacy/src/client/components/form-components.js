/**
 * Form Components Library
 * Reusable form elements following design system patterns
 */

export class FormField {
    constructor(config) {
        this.config = {
            label: config.label || '',
            type: config.type || 'text',
            placeholder: config.placeholder || '',
            name: config.name || '',
            required: config.required || false,
            value: config.value || '',
            onChange: config.onChange || null,
            validator: config.validator || null,
            errorMessage: config.errorMessage || 'This field is required'
        };
    }

    render() {
        return `
            <div class="form-field" data-field-name="${this.config.name}">
                <label class="rt-Text size-3 weight-medium">
                    ${this.config.label}
                    ${this.config.required ? '<span class="required">*</span>' : ''}
                </label>
                <input 
                    type="${this.config.type}" 
                    class="rt-TextField-Input size-3" 
                    placeholder="${this.config.placeholder}"
                    name="${this.config.name}"
                    value="${this.config.value}"
                    ${this.config.required ? 'required' : ''}
                >
                <span class="error-message" style="display: none;">${this.config.errorMessage}</span>
            </div>
        `;
    }

    attachEvents(container) {
        const input = container.querySelector(`[name="${this.config.name}"]`);
        if (!input) return;

        // Change handler
        if (this.config.onChange) {
            input.addEventListener('change', (e) => this.config.onChange(e.target.value, e));
        }

        // Input validation
        input.addEventListener('blur', () => this.validate(input));
        
        // Clear error on input
        input.addEventListener('input', () => {
            input.classList.remove('error');
            const errorMsg = input.parentElement.querySelector('.error-message');
            if (errorMsg) errorMsg.style.display = 'none';
        });
    }

    validate(input) {
        const value = input.value.trim();
        let isValid = true;
        let errorMessage = this.config.errorMessage;

        // Required validation
        if (this.config.required && !value) {
            isValid = false;
        }

        // Custom validator
        if (this.config.validator && value) {
            const validationResult = this.config.validator(value);
            if (typeof validationResult === 'string') {
                isValid = false;
                errorMessage = validationResult;
            } else {
                isValid = validationResult;
            }
        }

        // Show/hide error
        if (!isValid) {
            input.classList.add('error');
            const errorMsg = input.parentElement.querySelector('.error-message');
            if (errorMsg) {
                errorMsg.textContent = errorMessage;
                errorMsg.style.display = 'block';
            }
        }

        return isValid;
    }
}

export class StepHeader {
    constructor(config) {
        this.config = {
            currentStep: config.currentStep || 1,
            totalSteps: config.totalSteps || 2,
            title: config.title || '',
            subtitle: config.subtitle || ''
        };
    }

    render() {
        return `
            <div class="step-header">
                <div class="rt-Badge rt-variant-outline" data-accent-color="blue">
                    Step ${this.config.currentStep} of ${this.config.totalSteps}
                </div>
                
                <div class="header-text">
                    <h1 class="rt-Heading size-7 season-heading">${this.config.title}</h1>
                    <p class="rt-Text size-3">${this.config.subtitle}</p>
                </div>
            </div>
        `;
    }
}

export class NavigationButtons {
    constructor(config) {
        this.config = {
            showBack: config.showBack !== false,
            showContinue: config.showContinue !== false,
            showConfigureLater: config.showConfigureLater || false,
            backText: config.backText || 'Back',
            continueText: config.continueText || 'Continue',
            configureLaterText: config.configureLaterText || 'Configure later',
            onBack: config.onBack || null,
            onContinue: config.onContinue || null,
            onConfigureLater: config.onConfigureLater || null,
            continueDisabled: config.continueDisabled || false
        };
    }

    render() {
        const rightButtons = [];
        
        if (this.config.showConfigureLater) {
            rightButtons.push(`
                <button class="rt-Button rt-variant-ghost size-2" id="configure-later-btn">
                    ${this.config.configureLaterText}
                </button>
            `);
        }
        
        if (this.config.showContinue) {
            rightButtons.push(`
                <button class="rt-Button rt-variant-outline size-2 ${this.config.continueDisabled ? 'disabled' : ''}" 
                        id="continue-btn">
                    ${this.config.continueText}
                </button>
            `);
        }

        return `
            <div class="nav-buttons">
                ${this.config.showBack ? `
                    <button class="rt-Button rt-variant-ghost size-2" id="back-btn">
                        ${this.config.backText}
                    </button>
                ` : '<div></div>'}
                
                ${rightButtons.length > 1 ? `
                    <div class="nav-buttons-right">
                        ${rightButtons.join('')}
                    </div>
                ` : rightButtons.join('')}
            </div>
        `;
    }

    attachEvents(container) {
        // Back button
        if (this.config.showBack && this.config.onBack) {
            const backBtn = container.querySelector('#back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', this.config.onBack);
            }
        }

        // Continue button
        if (this.config.showContinue && this.config.onContinue) {
            const continueBtn = container.querySelector('#continue-btn');
            if (continueBtn) {
                continueBtn.addEventListener('click', (e) => {
                    if (!continueBtn.classList.contains('disabled')) {
                        this.config.onContinue(e);
                    }
                });
            }
        }

        // Configure later button
        if (this.config.showConfigureLater && this.config.onConfigureLater) {
            const configureLaterBtn = container.querySelector('#configure-later-btn');
            if (configureLaterBtn) {
                configureLaterBtn.addEventListener('click', this.config.onConfigureLater);
            }
        }
    }

    enableContinue() {
        const btn = document.querySelector('#continue-btn');
        if (btn) {
            btn.classList.remove('disabled');
        }
    }

    disableContinue() {
        const btn = document.querySelector('#continue-btn');
        if (btn) {
            btn.classList.add('disabled');
        }
    }
}

export class ConnectionCard {
    constructor(config) {
        this.config = {
            id: config.id || '',
            title: config.title || '',
            description: config.description || '',
            fields: config.fields || [],
            onSelect: config.onSelect || null,
            onFieldChange: config.onFieldChange || null
        };
        
        this.isExpanded = false;
        this.fieldValues = {};
    }

    render() {
        const fieldsHtml = this.config.fields.map(field => `
            <div class="expanded-field">
                <input type="text" 
                       class="expanded-input" 
                       placeholder="${field.placeholder}"
                       data-field="${field.name}">
            </div>
        `).join('');

        return `
            <div class="connection-card" data-connection-id="${this.config.id}">
                <div class="card-header">
                    <div class="card-content">
                        <h3 class="card-title">${this.config.title}</h3>
                        <p class="card-description">${this.config.description}</p>
                    </div>
                    <div class="card-radio">
                        <input type="radio" name="connection" value="${this.config.id}">
                    </div>
                </div>
                <div class="card-expanded">
                    ${fieldsHtml}
                </div>
            </div>
        `;
    }

    attachEvents(container) {
        const card = container.querySelector(`[data-connection-id="${this.config.id}"]`);
        if (!card) return;

        // Card click handler
        card.addEventListener('click', (e) => {
            // Don't toggle if clicking on input
            if (e.target.tagName === 'INPUT' && e.target.type === 'text') {
                return;
            }

            this.toggle(container);
        });

        // Field change handlers
        const inputs = card.querySelectorAll('.expanded-input');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const fieldName = e.target.dataset.field;
                this.fieldValues[fieldName] = e.target.value;
                
                if (this.config.onFieldChange) {
                    this.config.onFieldChange(fieldName, e.target.value, this.areAllFieldsFilled());
                }
            });

            // Prevent card toggle on input click
            input.addEventListener('click', (e) => e.stopPropagation());
        });
    }

    toggle(container) {
        // Close all other cards
        container.querySelectorAll('.connection-card').forEach(c => {
            c.classList.remove('selected', 'expanded');
        });

        // Open this card
        const card = container.querySelector(`[data-connection-id="${this.config.id}"]`);
        card.classList.add('selected', 'expanded');
        
        // Check radio
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;

        this.isExpanded = true;

        if (this.config.onSelect) {
            this.config.onSelect(this.config.id, this);
        }
    }

    areAllFieldsFilled() {
        return this.config.fields.every(field => 
            this.fieldValues[field.name] && this.fieldValues[field.name].trim() !== ''
        );
    }

    getValues() {
        return this.fieldValues;
    }
}

export class FormValidator {
    static email(value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return 'Please enter a valid email address';
        }
        return true;
    }

    static password(value) {
        if (value.length < 8) {
            return 'Password must be at least 8 characters';
        }
        return true;
    }

    static url(value) {
        try {
            new URL(value);
            return true;
        } catch {
            return 'Please enter a valid URL';
        }
    }

    static required(value) {
        if (!value || value.trim() === '') {
            return 'This field is required';
        }
        return true;
    }
}