/**
 * MermaidRenderer
 *
 * Renders Mermaid diagrams with optional fullscreen expansion.
 * Uses generic hostModal utilities for fullscreen in iframe context.
 */

import { Check, Copy, Maximize2, Minimize2 } from "lucide-react";
import mermaid from "mermaid";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { isInIframe, openFullscreenContent } from "../../utils/hostModal";
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
		const result = openFullscreenContent(svgContent, title || "Diagram");
		// If not in iframe, fall back to local fullscreen
		if (result === "none") {
			setIsFullscreen(true);
		}
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
