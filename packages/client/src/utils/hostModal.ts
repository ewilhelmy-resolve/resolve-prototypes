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
function injectModalIntoHost(
	iframeSrc: string,
	title: string,
): boolean {
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
	(window.parent as Window & { __ritaCloseModal?: () => void }).__ritaCloseModal = () => {
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
function requestModalViaPostMessage(
	iframeSrc: string,
	title: string,
): void {
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
