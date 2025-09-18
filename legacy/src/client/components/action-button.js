class ActionButton {
    constructor(options = {}) {
        this.text = options.text || 'Button';
        this.icon = options.icon || null;
        this.variant = options.variant || 'primary';
        this.size = options.size || 'medium';
        this.fullWidth = options.fullWidth || false;
        this.onClick = options.onClick || (() => {});
        this.className = options.className || '';
        this.id = options.id || '';
    }

    render() {
        const button = document.createElement('button');
        
        button.className = `action-btn action-btn-${this.variant} action-btn-${this.size}`;
        if (this.fullWidth) button.classList.add('action-btn-full');
        if (this.className) button.className += ` ${this.className}`;
        
        if (this.id) button.id = this.id;
        
        button.addEventListener('click', this.onClick);
        
        if (this.icon) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'action-btn-icon';
            iconSpan.innerHTML = this.icon;
            button.appendChild(iconSpan);
        }
        
        if (this.text) {
            const textSpan = document.createElement('span');
            textSpan.className = 'action-btn-text';
            textSpan.textContent = this.text;
            button.appendChild(textSpan);
        }
        
        return button;
    }
    
    static createFromHTML(selector, options = {}) {
        const element = document.querySelector(selector);
        if (!element) return null;
        
        const text = element.textContent.trim();
        const icon = element.querySelector('svg') ? element.querySelector('svg').outerHTML : null;
        const onClick = element.onclick;
        
        const button = new ActionButton({
            ...options,
            text: options.text || text,
            icon: options.icon || icon,
            onClick: options.onClick || onClick,
            className: options.className || element.className,
            id: options.id || element.id
        });
        
        const newButton = button.render();
        element.parentNode.replaceChild(newButton, element);
        
        return button;
    }
}

function createActionButton(text, icon, onClick, options = {}) {
    return `
        <button class="action-btn action-btn-${options.variant || 'primary'} action-btn-${options.size || 'medium'} ${options.fullWidth ? 'action-btn-full' : ''} ${options.className || ''}" 
                ${options.id ? `id="${options.id}"` : ''}
                ${onClick ? `onclick="${onClick}"` : ''}>
            ${icon ? `<span class="action-btn-icon">${icon}</span>` : ''}
            ${text ? `<span class="action-btn-text">${text}</span>` : ''}
        </button>
    `;
}

window.ActionButton = ActionButton;
window.createActionButton = createActionButton;