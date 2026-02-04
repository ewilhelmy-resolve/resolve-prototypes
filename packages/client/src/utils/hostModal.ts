/**
 * Host Modal Utilities
 *
 * Enables RITA iframe to open an expanded modal view in the host page.
 * Uses DOM injection when same-origin, falls back to postMessage when cross-origin.
 */

const MODAL_STYLES = `
  #rita-injected-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: ritaModalFadeIn 0.3s ease;
  }
  @keyframes ritaModalFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes ritaModalScaleIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  #rita-injected-modal {
    background: white;
    border-radius: 16px;
    width: 90%;
    max-width: 900px;
    height: 85%;
    max-height: 750px;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.35);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: ritaModalScaleIn 0.3s ease;
  }
  #rita-injected-modal-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 14px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }
  #rita-injected-modal-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  #rita-injected-modal-close {
    background: rgba(255,255,255,0.2);
    border: none;
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }
  #rita-injected-modal-close:hover {
    background: rgba(255,255,255,0.3);
  }
  #rita-injected-modal-body {
    flex: 1;
    overflow: hidden;
  }
  #rita-injected-modal-body iframe {
    width: 100%;
    height: 100%;
    border: none;
  }
`;

const createModalHTML = (iframeSrc: string, title: string) => `
  <div id="rita-injected-modal-overlay" onclick="if(event.target===this)window.__ritaCloseModal?.()">
    <div id="rita-injected-modal">
      <div id="rita-injected-modal-header">
        <h3>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/>
            <path d="M5 15h14v2H5z"/>
          </svg>
          ${title}
        </h3>
        <button id="rita-injected-modal-close" onclick="window.__ritaCloseModal?.()">×</button>
      </div>
      <div id="rita-injected-modal-body">
        <iframe src="${iframeSrc}"></iframe>
      </div>
    </div>
  </div>
`;

/**
 * Check if we can access the parent document (same-origin)
 */
export function canAccessParentDocument(): boolean {
	if (window.parent === window) return false; // Not in iframe
	try {
		// This will throw if cross-origin
		return !!window.parent.document.body;
	} catch {
		return false;
	}
}

/**
 * Check if we're running inside an iframe
 */
export function isInIframe(): boolean {
	return window.parent !== window;
}

/**
 * Inject modal directly into host page DOM (same-origin only)
 */
function injectModalIntoHost(iframeSrc: string, title: string): boolean {
	if (!canAccessParentDocument()) return false;

	const parentDoc = window.parent.document;

	// Inject styles if not already present
	if (!parentDoc.getElementById("rita-modal-styles")) {
		const style = parentDoc.createElement("style");
		style.id = "rita-modal-styles";
		style.textContent = MODAL_STYLES;
		parentDoc.head.appendChild(style);
	}

	// Remove existing modal if any
	parentDoc.getElementById("rita-injected-modal-overlay")?.remove();

	// Inject modal
	const container = parentDoc.createElement("div");
	container.innerHTML = createModalHTML(iframeSrc, title);
	const overlay = container.firstElementChild;
	if (overlay) {
		parentDoc.body.appendChild(overlay);
	}

	// Set up close function on parent window
	(
		window.parent as Window & { __ritaCloseModal?: () => void }
	).__ritaCloseModal = () => {
		closeModalInHost();
	};

	// Close on ESC key
	const escHandler = (e: KeyboardEvent) => {
		if (e.key === "Escape") {
			closeModalInHost();
			parentDoc.removeEventListener("keydown", escHandler);
		}
	};
	parentDoc.addEventListener("keydown", escHandler);

	return true;
}

/**
 * Remove injected modal from host page
 */
function closeModalInHost(): void {
	try {
		const overlay = window.parent.document.getElementById(
			"rita-injected-modal-overlay",
		);
		if (overlay) {
			overlay.style.animation = "ritaModalFadeIn 0.2s ease reverse";
			setTimeout(() => overlay.remove(), 200);
		}
	} catch {
		// Cross-origin, ignore
	}
}

/**
 * Request host to open modal via postMessage (cross-origin fallback)
 */
function requestModalViaPostMessage(iframeSrc: string, title: string): void {
	window.parent.postMessage(
		{
			type: "RITA_OPEN_MODAL",
			payload: { iframeSrc, title },
		},
		"*",
	);
}

/**
 * Request host to close modal via postMessage
 */
function requestCloseViaPostMessage(): void {
	window.parent.postMessage({ type: "RITA_CLOSE_MODAL" }, "*");
}

/**
 * Open expanded modal view in host page
 * Tries direct DOM injection (same-origin), falls back to postMessage
 *
 * @param sessionKey - Current session key to pass to modal iframe
 * @param title - Modal title
 * @returns Method used: 'inject' | 'postMessage' | 'none'
 */
export function openExpandedModal(
	sessionKey: string,
	title = "RITA Assistant",
): "inject" | "postMessage" | "none" {
	if (!isInIframe()) return "none";

	// Build iframe URL for modal (same page, expanded view)
	const baseUrl = window.location.origin;
	const iframeSrc = `${baseUrl}/iframe/chat?sessionKey=${encodeURIComponent(sessionKey)}&expanded=true`;

	// Try direct injection first (same-origin)
	if (injectModalIntoHost(iframeSrc, title)) {
		return "inject";
	}

	// Fall back to postMessage (cross-origin)
	requestModalViaPostMessage(iframeSrc, title);
	return "postMessage";
}

/**
 * Close expanded modal
 */
export function closeExpandedModal(): void {
	if (!isInIframe()) return;

	if (canAccessParentDocument()) {
		closeModalInHost();
	} else {
		requestCloseViaPostMessage();
	}
}

// ============================================
// Generic Fullscreen Content
// ============================================

const FULLSCREEN_CONTENT_STYLES = `
  #rita-fullscreen-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: ritaFullscreenFadeIn 0.2s ease;
  }
  @keyframes ritaFullscreenFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  #rita-fullscreen-modal {
    background: white;
    border-radius: 12px;
    width: 95%;
    max-width: 1200px;
    height: 90%;
    max-height: 800px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
  }
  #rita-fullscreen-header {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }
  #rita-fullscreen-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
  }
  #rita-fullscreen-close {
    background: #e2e8f0;
    border: none;
    color: #64748b;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }
  #rita-fullscreen-close:hover {
    background: #cbd5e1;
    color: #1e293b;
  }
  #rita-fullscreen-body {
    flex: 1;
    overflow: auto;
    padding: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #rita-fullscreen-body > * {
    max-width: 100%;
    max-height: 100%;
  }
  @media (prefers-color-scheme: dark) {
    #rita-fullscreen-modal {
      background: #1e293b;
    }
    #rita-fullscreen-header {
      background: #0f172a;
      border-color: #334155;
    }
    #rita-fullscreen-header h3 {
      color: #f1f5f9;
    }
    #rita-fullscreen-close {
      background: #334155;
      color: #94a3b8;
    }
    #rita-fullscreen-close:hover {
      background: #475569;
      color: #f1f5f9;
    }
  }
`;

/**
 * Close fullscreen content in host
 */
function closeFullscreenInHost(): void {
	try {
		const overlay = window.parent.document.getElementById(
			"rita-fullscreen-overlay",
		);
		if (overlay) {
			overlay.style.animation = "ritaFullscreenFadeIn 0.15s ease reverse";
			setTimeout(() => overlay.remove(), 150);
		}
	} catch {
		// Cross-origin, ignore
	}
}

/**
 * Open fullscreen content in host page
 * Works for any HTML content (diagrams, code, images, etc.)
 *
 * @param content - HTML content to display
 * @param title - Modal title
 * @param customStyles - Optional additional CSS styles
 * @returns Method used: 'inject' | 'postMessage' | 'none'
 */
export function openFullscreenContent(
	content: string,
	title: string,
	customStyles?: string,
): "inject" | "postMessage" | "none" {
	if (!isInIframe()) return "none";

	// Try direct injection first (same-origin)
	if (canAccessParentDocument()) {
		const parentDoc = window.parent.document;

		// Inject base styles if not present
		if (!parentDoc.getElementById("rita-fullscreen-styles")) {
			const style = parentDoc.createElement("style");
			style.id = "rita-fullscreen-styles";
			style.textContent = FULLSCREEN_CONTENT_STYLES;
			parentDoc.head.appendChild(style);
		}

		// Inject custom styles if provided
		if (customStyles) {
			const existingCustom = parentDoc.getElementById(
				"rita-fullscreen-custom-styles",
			);
			if (existingCustom) existingCustom.remove();
			const customStyle = parentDoc.createElement("style");
			customStyle.id = "rita-fullscreen-custom-styles";
			customStyle.textContent = customStyles;
			parentDoc.head.appendChild(customStyle);
		}

		// Remove existing overlay
		parentDoc.getElementById("rita-fullscreen-overlay")?.remove();

		// Create overlay
		const overlay = parentDoc.createElement("div");
		overlay.id = "rita-fullscreen-overlay";
		overlay.innerHTML = `
			<div id="rita-fullscreen-modal">
				<div id="rita-fullscreen-header">
					<h3>${title}</h3>
					<button id="rita-fullscreen-close">×</button>
				</div>
				<div id="rita-fullscreen-body">
					${content}
				</div>
			</div>
		`;

		// Close handlers
		overlay.addEventListener("click", (e) => {
			if (e.target === overlay) closeFullscreenInHost();
		});

		const closeBtn = overlay.querySelector("#rita-fullscreen-close");
		closeBtn?.addEventListener("click", () => closeFullscreenInHost());

		const escHandler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				closeFullscreenInHost();
				parentDoc.removeEventListener("keydown", escHandler);
			}
		};
		parentDoc.addEventListener("keydown", escHandler);

		parentDoc.body.appendChild(overlay);
		return "inject";
	}

	// Fall back to postMessage (cross-origin)
	window.parent.postMessage(
		{
			type: "RITA_FULLSCREEN_CONTENT",
			payload: { content, title, customStyles },
		},
		"*",
	);
	return "postMessage";
}

/**
 * Close fullscreen content
 */
export function closeFullscreenContent(): void {
	if (!isInIframe()) return;

	if (canAccessParentDocument()) {
		closeFullscreenInHost();
	} else {
		window.parent.postMessage({ type: "RITA_CLOSE_FULLSCREEN" }, "*");
	}
}

// ============================================
// Form Modal in Host Page
// ============================================

const FORM_MODAL_STYLES = `
  #rita-form-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: ritaFormFadeIn 0.2s ease;
  }
  @keyframes ritaFormFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  #rita-form-modal {
    background: white;
    border-radius: 12px;
    width: 95%;
    max-width: 600px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
  }
  #rita-form-modal.size-full {
    max-width: 95vw;
    width: 95vw;
    height: 90vh;
    max-height: 90vh;
  }
  #rita-form-modal.size-xl { max-width: 1200px; }
  #rita-form-modal.size-lg { max-width: 900px; }
  #rita-form-modal.size-md { max-width: 600px; }
  #rita-form-modal.size-sm { max-width: 400px; }
  #rita-form-modal-header {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 16px 20px;
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  #rita-form-modal-header-text h3 {
    margin: 0 0 4px 0;
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
  }
  #rita-form-modal-header-text p {
    margin: 0;
    font-size: 14px;
    color: #64748b;
  }
  #rita-form-modal-close {
    background: #e2e8f0;
    border: none;
    color: #64748b;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  #rita-form-modal-close:hover {
    background: #cbd5e1;
    color: #1e293b;
  }
  #rita-form-modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }
  #rita-form-modal-footer {
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    padding: 12px 20px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-shrink: 0;
  }
  .rita-form-field {
    margin-bottom: 16px;
  }
  .rita-form-field label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 6px;
  }
  .rita-form-field input,
  .rita-form-field select,
  .rita-form-field textarea {
    width: 100%;
    padding: 10px 12px;
    font-size: 14px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    color: #1e293b;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .rita-form-field input:focus,
  .rita-form-field select:focus,
  .rita-form-field textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  .rita-form-field textarea {
    min-height: 100px;
    resize: vertical;
  }
  .rita-form-btn {
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .rita-form-btn-cancel {
    background: white;
    border: 1px solid #d1d5db;
    color: #374151;
  }
  .rita-form-btn-cancel:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }
  .rita-form-btn-submit {
    background: #3b82f6;
    border: 1px solid #3b82f6;
    color: white;
  }
  .rita-form-btn-submit:hover {
    background: #2563eb;
    border-color: #2563eb;
  }
  .rita-form-btn-destructive {
    background: #ef4444;
    border: 1px solid #ef4444;
    color: white;
  }
  .rita-form-btn-destructive:hover {
    background: #dc2626;
    border-color: #dc2626;
  }
  @media (prefers-color-scheme: dark) {
    #rita-form-modal { background: #1e293b; }
    #rita-form-modal-header { background: #0f172a; border-color: #334155; }
    #rita-form-modal-header-text h3 { color: #f1f5f9; }
    #rita-form-modal-header-text p { color: #94a3b8; }
    #rita-form-modal-close { background: #334155; color: #94a3b8; }
    #rita-form-modal-close:hover { background: #475569; color: #f1f5f9; }
    #rita-form-modal-footer { background: #0f172a; border-color: #334155; }
    .rita-form-field label { color: #e2e8f0; }
    .rita-form-field input,
    .rita-form-field select,
    .rita-form-field textarea {
      background: #1e293b;
      border-color: #475569;
      color: #f1f5f9;
    }
    .rita-form-btn-cancel {
      background: #334155;
      border-color: #475569;
      color: #e2e8f0;
    }
    .rita-form-btn-cancel:hover {
      background: #475569;
    }
  }
`;

export interface FormModalField {
	type: "input" | "select" | "textarea";
	name: string;
	label?: string;
	placeholder?: string;
	inputType?: string;
	options?: Array<{ label: string; value: string }>;
	defaultValue?: string;
}

export interface FormModalConfig {
	title: string;
	description?: string;
	size?: "sm" | "md" | "lg" | "xl" | "full";
	fields: FormModalField[];
	submitLabel?: string;
	cancelLabel?: string;
	submitVariant?: "default" | "destructive";
	preventBackdropClose?: boolean; // Prevent closing on backdrop click/ESC (for forced modals)
	onSubmit: (data: Record<string, string>) => void;
	onCancel: () => void;
}

function closeFormModalInHost(): void {
	try {
		const overlay = window.parent.document.getElementById(
			"rita-form-modal-overlay",
		);
		if (overlay) {
			overlay.style.animation = "ritaFormFadeIn 0.15s ease reverse";
			setTimeout(() => overlay.remove(), 150);
		}
	} catch {
		// Cross-origin, ignore
	}
}

function renderFormField(field: FormModalField): string {
	const labelHtml = field.label
		? `<label for="rita-field-${field.name}">${field.label}</label>`
		: "";

	if (field.type === "select" && field.options) {
		const optionsHtml = field.options
			.map(
				(opt) =>
					`<option value="${opt.value}" ${opt.value === field.defaultValue ? "selected" : ""}>${opt.label}</option>`,
			)
			.join("");
		return `
			<div class="rita-form-field">
				${labelHtml}
				<select id="rita-field-${field.name}" name="${field.name}">
					<option value="">${field.placeholder || "Select..."}</option>
					${optionsHtml}
				</select>
			</div>
		`;
	}

	if (field.type === "textarea" || field.inputType === "textarea") {
		return `
			<div class="rita-form-field">
				${labelHtml}
				<textarea
					id="rita-field-${field.name}"
					name="${field.name}"
					placeholder="${field.placeholder || ""}"
				>${field.defaultValue || ""}</textarea>
			</div>
		`;
	}

	return `
		<div class="rita-form-field">
			${labelHtml}
			<input
				type="${field.inputType || "text"}"
				id="rita-field-${field.name}"
				name="${field.name}"
				placeholder="${field.placeholder || ""}"
				value="${field.defaultValue || ""}"
			/>
		</div>
	`;
}

/**
 * Open a form modal in the host page
 * Renders form fields and handles submit/cancel
 */
export function openFormModal(config: FormModalConfig): boolean {
	console.log("[hostModal] openFormModal called:", {
		title: config.title,
		isInIframe: isInIframe(),
		canAccessParent: canAccessParentDocument(),
		fieldCount: config.fields.length,
	});
	if (!isInIframe()) return false;

	if (!canAccessParentDocument()) {
		// Cross-origin: send via postMessage (host must handle rendering)
		console.log("[hostModal] Sending RITA_FORM_MODAL via postMessage");
		window.parent.postMessage(
			{
				type: "RITA_FORM_MODAL",
				payload: {
					title: config.title,
					description: config.description,
					size: config.size,
					fields: config.fields,
					submitLabel: config.submitLabel,
					cancelLabel: config.cancelLabel,
					submitVariant: config.submitVariant,
					preventBackdropClose: config.preventBackdropClose,
				},
			},
			"*",
		);
		return true;
	}

	const parentDoc = window.parent.document;

	// Inject styles if not present
	if (!parentDoc.getElementById("rita-form-modal-styles")) {
		const style = parentDoc.createElement("style");
		style.id = "rita-form-modal-styles";
		style.textContent = FORM_MODAL_STYLES;
		parentDoc.head.appendChild(style);
	}

	// Remove existing overlay
	parentDoc.getElementById("rita-form-modal-overlay")?.remove();

	// Build form fields HTML
	const fieldsHtml = config.fields.map(renderFormField).join("");

	const submitBtnClass =
		config.submitVariant === "destructive"
			? "rita-form-btn rita-form-btn-destructive"
			: "rita-form-btn rita-form-btn-submit";

	// Create overlay
	const overlay = parentDoc.createElement("div");
	overlay.id = "rita-form-modal-overlay";
	overlay.innerHTML = `
		<div id="rita-form-modal" class="size-${config.size || "full"}">
			<div id="rita-form-modal-header">
				<div id="rita-form-modal-header-text">
					<h3>${config.title}</h3>
					${config.description ? `<p>${config.description}</p>` : ""}
				</div>
				<button type="button" id="rita-form-modal-close">×</button>
			</div>
			<form id="rita-form-modal-form">
				<div id="rita-form-modal-body">
					${fieldsHtml}
				</div>
				<div id="rita-form-modal-footer">
					<button type="button" class="rita-form-btn rita-form-btn-cancel" id="rita-form-cancel">
						${config.cancelLabel || "Cancel"}
					</button>
					<button type="submit" class="${submitBtnClass}">
						${config.submitLabel || "Submit"}
					</button>
				</div>
			</form>
		</div>
	`;

	// Close on backdrop click (unless preventBackdropClose is set)
	overlay.addEventListener("click", (e) => {
		if (e.target === overlay && !config.preventBackdropClose) {
			closeFormModalInHost();
			config.onCancel();
		}
	});

	// Cancel button
	const cancelBtn = overlay.querySelector("#rita-form-cancel");
	cancelBtn?.addEventListener("click", () => {
		closeFormModalInHost();
		config.onCancel();
	});

	// Close button (X in corner)
	const closeBtn = overlay.querySelector("#rita-form-modal-close");
	closeBtn?.addEventListener("click", () => {
		closeFormModalInHost();
		config.onCancel();
	});

	// Form submit
	const form = overlay.querySelector(
		"#rita-form-modal-form",
	) as HTMLFormElement;
	form?.addEventListener("submit", (e) => {
		e.preventDefault();
		const formData = new FormData(form);
		const data: Record<string, string> = {};
		formData.forEach((value, key) => {
			data[key] = value.toString();
		});
		closeFormModalInHost();
		config.onSubmit(data);
	});

	// Escape key (unless preventBackdropClose is set)
	const escHandler = (e: KeyboardEvent) => {
		if (e.key === "Escape" && !config.preventBackdropClose) {
			closeFormModalInHost();
			config.onCancel();
			parentDoc.removeEventListener("keydown", escHandler);
		}
	};
	parentDoc.addEventListener("keydown", escHandler);

	parentDoc.body.appendChild(overlay);
	return true;
}

/**
 * Close form modal in host
 */
export function closeFormModal(): void {
	if (!isInIframe()) return;

	if (canAccessParentDocument()) {
		closeFormModalInHost();
	} else {
		window.parent.postMessage({ type: "RITA_CLOSE_FORM_MODAL" }, "*");
	}
}
