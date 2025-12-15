import { useState } from "react";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { WandSparkles, Copy, Plus, Check } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";

interface KnowledgeSource {
	id: string;
	label: string;
	description: string;
	checked: boolean;
}

interface CreateKnowledgeArticleSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Ticket group name for context */
	ticketGroupName?: string;
	/** Called when user clicks "Add knowledge" with the content */
	onAddKnowledge?: (content: string) => void;
	/** Called after knowledge is successfully added (for showing banners etc) */
	onKnowledgeAdded?: () => void;
}

const INITIAL_SOURCES: KnowledgeSource[] = [
	{
		id: "historical-tickets",
		label: "Historical Tickets",
		description: "Use past ticket resolutions and patterns from this cluster",
		checked: true,
	},
	{
		id: "web-search",
		label: "Web Search",
		description: "Include relevant information from web sources and documentation",
		checked: true,
	},
];

const MOCK_GENERATED_ARTICLE = `# Network Connectivity Troubleshooting Guide

## Overview
This guide provides step-by-step instructions for resolving common network connectivity issues reported by users.

## Common Symptoms
- Unable to access network resources
- Intermittent connection drops
- Slow network performance
- Cannot connect to VPN

## Troubleshooting Steps

### 1. Check Physical Connections
- Verify ethernet cable is securely connected
- Check for damaged cables or ports
- Ensure WiFi is enabled on the device

### 2. Verify Network Settings
\`\`\`
ipconfig /all...`;

/**
 * Sheet component for creating knowledge articles from ticket patterns
 *
 * Features:
 * - Knowledge source selection (checkboxes)
 * - Generate article button
 * - AI-generated article preview
 * - Copy and Add knowledge actions
 *
 * @component
 */
export function CreateKnowledgeArticleSheet({
	open,
	onOpenChange,
	ticketGroupName = "Software Installation",
	onAddKnowledge,
	onKnowledgeAdded,
}: CreateKnowledgeArticleSheetProps) {
	const [sources, setSources] = useState<KnowledgeSource[]>(INITIAL_SOURCES);
	const [generatedArticle, setGeneratedArticle] = useState<string>("");
	const [isGenerating, setIsGenerating] = useState(false);
	const [isCopied, setIsCopied] = useState(false);

	const handleSourceToggle = (sourceId: string) => {
		setSources((prev) =>
			prev.map((source) =>
				source.id === sourceId
					? { ...source, checked: !source.checked }
					: source
			)
		);
	};

	const handleGenerateArticle = async () => {
		setIsGenerating(true);
		// Simulate API call
		await new Promise((resolve) => setTimeout(resolve, 1000));
		setGeneratedArticle(MOCK_GENERATED_ARTICLE);
		setIsGenerating(false);
	};

	const handleCopy = async () => {
		await copyToClipboard(generatedArticle);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	};

	const handleAddKnowledge = () => {
		onAddKnowledge?.(generatedArticle);
		onKnowledgeAdded?.();
		onOpenChange(false);
		// Reset state
		setGeneratedArticle("");
		setSources(INITIAL_SOURCES);
	};

	const handleCancel = () => {
		onOpenChange(false);
		// Reset state
		setGeneratedArticle("");
		setSources(INITIAL_SOURCES);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="flex flex-col gap-6 sm:max-w-xl w-full p-8 overflow-hidden">
				<SheetHeader className="p-0 flex-shrink-0">
					<SheetTitle className="text-lg font-semibold">
						Create Knowledge Article
					</SheetTitle>
					<SheetDescription className="text-sm text-muted-foreground">
						Generate a knowledge article for "{ticketGroupName}" to enable automation
					</SheetDescription>
				</SheetHeader>

				{/* Scrollable Content Area */}
				<div className="flex-1 flex flex-col gap-6 overflow-y-auto overflow-x-hidden min-h-0">
					{/* Knowledge Sources Section */}
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-1">
							<h3 className="text-sm font-semibold">Knowledge Sources</h3>
							<p className="text-sm text-muted-foreground">
								Select sources to generate comprehensive article
							</p>
						</div>

						<div className="flex flex-col gap-2">
							{sources.map((source) => (
								<label
									key={source.id}
									htmlFor={source.id}
									className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/50 transition-colors"
								>
									<Checkbox
										id={source.id}
										checked={source.checked}
										onCheckedChange={() => handleSourceToggle(source.id)}
										className="mt-0.5"
									/>
									<div className="flex flex-col gap-0.5">
										<span className="text-sm font-medium">{source.label}</span>
										<span className="text-sm text-muted-foreground">
											{source.description}
										</span>
									</div>
								</label>
							))}
						</div>
					</div>

					{/* Generate Article Button */}
					<Button
						variant="outline"
						className="w-full gap-2"
						onClick={handleGenerateArticle}
						disabled={isGenerating || !sources.some((s) => s.checked)}
					>
						<WandSparkles className="h-4 w-4" />
						{isGenerating ? "Generating..." : "Generate Article"}
					</Button>

					{/* AI-Message Section */}
					{generatedArticle && (
						<div className="flex flex-col gap-2 flex-1 min-h-[200px] p-2 md:p-0">
							<label htmlFor="ai-message" className="text-sm font-medium">
								AI-Message
							</label>
							<textarea
								id="ai-message"
								value={generatedArticle}
								onChange={(e) => setGeneratedArticle(e.target.value)}
								className="flex-1 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							/>
						</div>
					)}
				</div>

				{/* Footer Actions */}
				<SheetFooter className="flex-row justify-end gap-2 flex-shrink-0 p-0">
					<Button variant="outline" onClick={handleCancel}>
						Cancel
					</Button>
					{generatedArticle && (
						<>
							<Button variant="outline" className="gap-2" onClick={handleCopy}>
								{isCopied ? (
									<Check className="h-4 w-4 text-primary" />
								) : (
									<Copy className="h-4 w-4" />
								)}
								{isCopied ? "Copied!" : "Copy"}
							</Button>
							<Button className="gap-2" onClick={handleAddKnowledge}>
								<Plus className="h-4 w-4" />
								Add knowledge
							</Button>
						</>
					)}
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

export default CreateKnowledgeArticleSheet;
