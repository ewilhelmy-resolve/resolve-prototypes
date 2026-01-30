/**
 * MermaidRenderer
 *
 * Renders Mermaid diagrams with optional fullscreen expansion.
 * Supports same-origin host modal injection for iframe context.
 */

import { Check, Copy, Maximize2, Minimize2 } from "lucide-react";
import mermaid from "mermaid";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { canAccessParentDocument, isInIframe } from "../../utils/hostModal";
import { Button } from "../ui/button";

// Initialize mermaid with default config
mermaid.initialize({
	startOnLoad: false,
	theme: "default",
	securityLevel: "strict",
	fontFamily: "inherit",
});

interface MermaidRendererProps {
	code: string;
	title?: string;
	expandable?: boolean;
	className?: string;
}

// Fullscreen modal styles for host injection
const FULLSCREEN_MODAL_STYLES = `
  #rita-mermaid-modal-overlay {
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
    animation: ritaMermaidFadeIn 0.2s ease;
  }
  @keyframes ritaMermaidFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  #rita-mermaid-modal {
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
  #rita-mermaid-modal-header {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  #rita-mermaid-modal-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
  }
  #rita-mermaid-modal-close {
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
  #rita-mermaid-modal-close:hover {
    background: #cbd5e1;
    color: #1e293b;
  }
  #rita-mermaid-modal-body {
    flex: 1;
    overflow: auto;
    padding: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #rita-mermaid-modal-body svg {
    max-width: 100%;
    max-height: 100%;
  }
  @media (prefers-color-scheme: dark) {
    #rita-mermaid-modal {
      background: #1e293b;
    }
    #rita-mermaid-modal-header {
      background: #0f172a;
      border-color: #334155;
    }
    #rita-mermaid-modal-header h3 {
      color: #f1f5f9;
    }
    #rita-mermaid-modal-close {
      background: #334155;
      color: #94a3b8;
    }
    #rita-mermaid-modal-close:hover {
      background: #475569;
      color: #f1f5f9;
    }
  }
`;

export function MermaidRenderer({
	code,
	title,
	expandable = true,
	className,
}: MermaidRendererProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [svgContent, setSvgContent] = useState<string>("");
	const [error, setError] = useState<string | null>(null);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [copied, setCopied] = useState(false);

	// Render mermaid diagram
	useEffect(() => {
		const renderDiagram = async () => {
			try {
				const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
				const { svg } = await mermaid.render(id, code);
				setSvgContent(svg);
				setError(null);
			} catch (err) {
				console.error("[MermaidRenderer] Render error:", err);
				setError(
					err instanceof Error ? err.message : "Failed to render diagram",
				);
			}
		};

		renderDiagram();
	}, [code]);

	// Copy code to clipboard
	const handleCopy = useCallback(async () => {
		await navigator.clipboard.writeText(code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [code]);

	// Open fullscreen in host document (iframe context)
	const openFullscreenInHost = useCallback(() => {
		if (!canAccessParentDocument()) {
			// Fallback: open in local fullscreen mode
			setIsFullscreen(true);
			return;
		}

		const parentDoc = window.parent.document;

		// Inject styles if not present
		if (!parentDoc.getElementById("rita-mermaid-modal-styles")) {
			const style = parentDoc.createElement("style");
			style.id = "rita-mermaid-modal-styles";
			style.textContent = FULLSCREEN_MODAL_STYLES;
			parentDoc.head.appendChild(style);
		}

		// Remove existing modal
		parentDoc.getElementById("rita-mermaid-modal-overlay")?.remove();

		// Create modal
		const overlay = parentDoc.createElement("div");
		overlay.id = "rita-mermaid-modal-overlay";
		overlay.innerHTML = `
			<div id="rita-mermaid-modal">
				<div id="rita-mermaid-modal-header">
					<h3>${title || "Diagram"}</h3>
					<button id="rita-mermaid-modal-close">×</button>
				</div>
				<div id="rita-mermaid-modal-body">
					${svgContent}
				</div>
			</div>
		`;

		// Close handlers
		const closeModal = () => {
			overlay.style.animation = "ritaMermaidFadeIn 0.15s ease reverse";
			setTimeout(() => overlay.remove(), 150);
		};

		overlay.addEventListener("click", (e) => {
			if (e.target === overlay) closeModal();
		});

		const closeBtn = overlay.querySelector("#rita-mermaid-modal-close");
		closeBtn?.addEventListener("click", closeModal);

		const escHandler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				closeModal();
				parentDoc.removeEventListener("keydown", escHandler);
			}
		};
		parentDoc.addEventListener("keydown", escHandler);

		parentDoc.body.appendChild(overlay);
	}, [svgContent, title]);

	// Handle fullscreen toggle
	const handleFullscreen = useCallback(() => {
		if (isInIframe()) {
			openFullscreenInHost();
		} else {
			setIsFullscreen(!isFullscreen);
		}
	}, [isFullscreen, openFullscreenInHost]);

	// Close local fullscreen
	const closeLocalFullscreen = useCallback(() => {
		setIsFullscreen(false);
	}, []);

	// Handle backdrop click/keydown for fullscreen overlay
	const handleBackdropInteraction = useCallback(
		(e: React.MouseEvent | React.KeyboardEvent) => {
			if (e.target === e.currentTarget) {
				if ("key" in e && e.key !== "Escape" && e.key !== "Enter") return;
				closeLocalFullscreen();
			}
		},
		[closeLocalFullscreen],
	);

	if (error) {
		return (
			<div
				className={cn(
					"rounded-lg border border-destructive/50 bg-destructive/10 p-4",
					className,
				)}
			>
				<div className="text-sm text-destructive font-medium mb-2">
					Diagram Error
				</div>
				<pre className="text-xs text-muted-foreground overflow-x-auto">
					{error}
				</pre>
				<details className="mt-2">
					<summary className="text-xs text-muted-foreground cursor-pointer">
						View code
					</summary>
					<pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
						{code}
					</pre>
				</details>
			</div>
		);
	}

	return (
		<>
			<div
				ref={containerRef}
				className={cn(
					"rounded-lg border bg-card overflow-hidden w-full",
					className,
				)}
			>
				{/* Header with title and actions */}
				<div className="bg-muted/50 border-b px-3 py-2 flex items-center justify-between">
					<span className="text-xs font-medium text-muted-foreground">
						{title || "Diagram"}
					</span>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={handleCopy}
							className="h-6 w-6 p-0"
							title="Copy diagram code"
						>
							{copied ? (
								<Check className="h-3 w-3 text-green-600" />
							) : (
								<Copy className="h-3 w-3" />
							)}
						</Button>
						{expandable && (
							<Button
								variant="ghost"
								size="sm"
								onClick={handleFullscreen}
								className="h-6 w-6 p-0"
								title="Expand diagram"
							>
								<Maximize2 className="h-3 w-3" />
							</Button>
						)}
					</div>
				</div>

				{/* Diagram content */}
				<div
					className="p-4 overflow-x-auto flex justify-center"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized svg from mermaid
					dangerouslySetInnerHTML={{ __html: svgContent }}
				/>
			</div>

			{/* Local fullscreen overlay (non-iframe) */}
			{isFullscreen && (
				<div
					role="dialog"
					aria-modal="true"
					aria-label={title || "Diagram fullscreen view"}
					className="fixed inset-0 bg-black/80 z-[10001] flex items-center justify-center animate-in fade-in duration-200"
					onClick={handleBackdropInteraction}
					onKeyDown={handleBackdropInteraction}
				>
					<div className="bg-card rounded-xl w-[95%] max-w-[1200px] h-[90%] max-h-[800px] flex flex-col overflow-hidden shadow-2xl">
						<div className="bg-muted border-b px-4 py-3 flex justify-between items-center">
							<h3 className="text-sm font-semibold">{title || "Diagram"}</h3>
							<Button
								variant="ghost"
								size="sm"
								onClick={closeLocalFullscreen}
								className="h-7 w-7 p-0"
							>
								<Minimize2 className="h-4 w-4" />
							</Button>
						</div>
						<div
							className="flex-1 overflow-auto p-6 flex items-center justify-center"
							// biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized svg from mermaid
							dangerouslySetInnerHTML={{ __html: svgContent }}
						/>
					</div>
				</div>
			)}
		</>
	);
}

export default MermaidRenderer;
