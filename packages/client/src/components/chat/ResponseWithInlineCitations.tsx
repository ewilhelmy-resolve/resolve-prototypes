/**
 * ResponseWithInlineCitations - Response component with inline citation support
 *
 * This component enhances the standard Response component by parsing citation
 * markers in the text and replacing them with interactive inline citations.
 *
 * Supported citation formats:
 * - [1], [2], [3] - Numbered citations
 * - [source], [doc] - Named citations
 *
 * Example message:
 * "According to recent studies [1], AI has shown remarkable progress [2]."
 */

import { useQueryClient } from "@tanstack/react-query";
import { ExternalLinkIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Streamdown } from "streamdown";
import {
	InlineCitation,
	InlineCitationCard,
	InlineCitationCardBody,
	InlineCitationCardTrigger,
} from "@/components/ai-elements/inline-citation";
import { Response } from "@/components/ai-elements/response";
import type { CitationSource } from "@/components/citations/Citations";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	documentMetadataKeys,
	useDocumentMetadata,
} from "@/hooks/api/useDocumentMetadata";
import { cn } from "@/lib/utils";

/**
 * Get document ID from source (supports both old and new formats)
 * Prefers blob_metadata_id (new), falls back to blob_id (legacy)
 */
function getDocumentId(source: CitationSource): string | undefined {
  return source.blob_metadata_id || source.blob_id
}

export interface ResponseWithInlineCitationsProps {
	/** Message text with citation markers */
	children: string;
	/** Array of citation sources */
	sources?: CitationSource[];
	/** Optional CSS class */
	className?: string;
	/** Message ID for tracking */
	messageId?: string;
}

/**
 * Parse text to find citation markers like [1], [2], etc.
 */
function parseCitationMarkers(text: string): {
	segments: Array<{
		type: "text" | "citation";
		content: string;
		index?: number;
	}>;
} {
	// Match citation markers: [1], [2], [3], etc.
	const citationRegex = /\[(\d+)\]/g;
	const segments: Array<{
		type: "text" | "citation";
		content: string;
		index?: number;
	}> = [];

	let lastIndex = 0;

	// Use matchAll for cleaner iteration without regex state issues
	const matches = Array.from(text.matchAll(citationRegex));

	for (const match of matches) {
		// Skip if match.index is undefined (shouldn't happen with matchAll, but TypeScript safety)
		if (match.index === undefined) continue;

		// Add text before citation
		if (match.index > lastIndex) {
			segments.push({
				type: "text",
				content: text.slice(lastIndex, match.index),
			});
		}

		// Add citation marker
		segments.push({
			type: "citation",
			content: match[0], // The full match like [1]
			index: parseInt(match[1], 10), // The number inside like 1
		});

		lastIndex = match.index + match[0].length;
	}

	// Add remaining text
	if (lastIndex < text.length) {
		segments.push({
			type: "text",
			content: text.slice(lastIndex),
		});
	}

	return { segments };
}

/**
 * ResponseWithInlineCitations - Render message text with interactive inline citations
 *
 * @example
 * ```tsx
 * <ResponseWithInlineCitations
 *   sources={[
 *     { url: 'https://example.com', title: 'Example Source' }
 *   ]}
 * >
 *   According to recent studies [1], AI has improved significantly.
 * </ResponseWithInlineCitations>
 * ```
 */

/**
 * InlineCitationItem - Individual citation item with metadata fetching
 * Uses TanStack Query to fetch document metadata for blob_metadata_id/blob_id sources
 */
function InlineCitationItem({
	source,
	index,
	messageId,
	onViewDocument,
}: {
	source: CitationSource;
	index: number;
	messageId?: string;
	onViewDocument: (source: CitationSource) => void;
}) {
	const { t } = useTranslation("chat");
  const documentId = getDocumentId(source)
  // Fetch document metadata if source has document ID but no title
  const { data: metadata, isError, isLoading } = useDocumentMetadata(
    documentId && !source.title ? documentId : undefined
  )

  // If metadata fetch failed, hide this inline citation and log warning
  if (isError) {
    console.warn('Inline citation source not found:', {
      blob_metadata_id: source.blob_metadata_id,
      blob_id: source.blob_id,
      messageId,
      index,
    })
    return null
  }

	// Get display title - prefer fetched metadata, then source.title, then loading state
	const displayTitle =
		metadata?.filename ||
		source.title ||
		(isLoading ? t("citations.loading") : undefined);

  // If no title can be determined (shouldn't happen after loading), hide the citation
  if (!displayTitle) {
    console.warn('Inline citation source has no title:', {
      blob_metadata_id: source.blob_metadata_id,
      blob_id: source.blob_id,
      messageId,
      index,
    })
    return null
  }

	return (
		<InlineCitation key={index}>
			<InlineCitationCard>
				<InlineCitationCardTrigger sources={source.url ? [source.url] : []} />
				<InlineCitationCardBody>
					<div className="p-4 space-y-2">
						{/* Title as header */}
						<h4 className="font-semibold text-sm text-foreground">
							{displayTitle}
						</h4>

            {/* Show snippet if present, otherwise show URL or blob info */}
            {source.snippet ? (
              <blockquote className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3 py-1">
                {source.snippet}
              </blockquote>
            ) : source.url ? (
              <p className="text-xs text-muted-foreground break-all">
                {source.url}
              </p>
            ) : documentId ? (
              <p className="text-xs text-muted-foreground">
                {t("citations.fullDocumentAvailable")}
              </p>
            ) : null}

						{/* Action links */}
						<div className="flex flex-col gap-2 pt-2">
							{/* View source link - only show if URL exists */}
							{source.url && (
								<a
									href={source.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-xs text-primary hover:underline inline-flex items-center gap-1"
									onClick={() => {
										// Audit logging
										console.log("Inline citation clicked:", {
											messageId,
											sourceUrl: source.url,
											sourceTitle: source.title,
											citationIndex: index,
											timestamp: new Date().toISOString(),
										});
									}}
								>
									{t("citations.viewSource")}
									<ExternalLinkIcon className="h-3 w-3" />
								</a>
							)}

              {/* View full document button if document ID exists */}
              {documentId && (
                <button
                  type="button"
                  onClick={() => onViewDocument(source)}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 text-left"
                >
                  {t("citations.viewFullDocument")}
                </button>
              )}
            </div>
          </div>
        </InlineCitationCardBody>
      </InlineCitationCard>
    </InlineCitation>
  )
}

export function ResponseWithInlineCitations({
	children,
	sources = [],
	className,
	messageId,
}: ResponseWithInlineCitationsProps) {
	const { t } = useTranslation("chat");
	const queryClient = useQueryClient();
	const [modalOpen, setModalOpen] = useState(false);
	const [modalContent, setModalContent] = useState<{
		title: string;
		content: string;
	} | null>(null);
	const [isLoadingDocument, setIsLoadingDocument] = useState(false);

	// If no sources or no citation markers, render as regular Response
	if (!sources || sources.length === 0 || !children.includes("[")) {
		return <Response className={className}>{children}</Response>;
	}

	const { segments } = parseCitationMarkers(children);

	// If no citation markers found, render as regular Response
	if (segments.every((seg) => seg.type === "text")) {
		return <Response className={className}>{children}</Response>;
	}

  // Handle "View full document" click
  const handleViewFullDocument = async (source: CitationSource) => {
    const documentId = getDocumentId(source)
    if (!documentId) return

		setIsLoadingDocument(true);

    // Get cached metadata or fetch it
    const cachedMetadata = queryClient.getQueryData(documentMetadataKeys.detail(documentId))
    const displayTitle = (cachedMetadata as any)?.filename || source.title || 'Document'

    try {
      // Fetch/use cached metadata
      const metadata = await queryClient.ensureQueryData({
        queryKey: documentMetadataKeys.detail(documentId),
        queryFn: async () => {
          const { fileApi } = await import('@/services/api')
          return await fileApi.getDocumentMetadata(documentId)
        },
      })

			const content =
				metadata.metadata?.content ||
				t("citations.documentProcessing");

			setModalContent({
				title: metadata.filename,
				content,
			});
		} catch (error) {
			console.error("Error loading document:", error);
			setModalContent({
				title: displayTitle,
				content: t("citations.errorLoading"),
			});
		} finally {
			setIsLoadingDocument(false);
			// Open modal AFTER content is loaded/set (fixes race condition)
			setModalOpen(true);
		}

    // Audit logging
    console.log('Full document requested:', {
      messageId,
      sourceTitle: displayTitle,
      documentId: documentId,
      blob_metadata_id: source.blob_metadata_id,
      blob_id: source.blob_id,
      timestamp: new Date().toISOString(),
    })
  }

	// Render text and citations inline together
	return (
		<>
			<div className={cn("prose dark:prose-invert", className)}>
				{segments.map((segment, idx) => {
					if (segment.type === "text") {
						// Render text as plain text to keep it inline
						return <span key={idx}>{segment.content}</span>;
					}

					// Citation segment - render inline badge
					if (segment.index === undefined) {
						return (
							<span key={idx} className="text-muted-foreground text-xs">
								{segment.content}
							</span>
						);
					}
					const citationIndex = segment.index - 1; // Convert 1-based to 0-based
					const source = sources[citationIndex];

					// If source doesn't exist, just show the marker as text
					if (!source) {
						return (
							<span key={idx} className="text-muted-foreground text-xs">
								{segment.content}
							</span>
						);
					}

					return (
						<InlineCitationItem
							key={idx}
							source={source}
							index={citationIndex}
							messageId={messageId}
							onViewDocument={handleViewFullDocument}
						/>
					);
				})}
			</div>

			{/* Modal for full document view */}
			<Dialog open={modalOpen} onOpenChange={setModalOpen}>
				<DialogContent className="sm:max-w-5xl max-h-[80vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{modalContent?.title || t("citations.documentTitle")}</DialogTitle>
						<DialogDescription>{t("citations.fullDocumentContent")}</DialogDescription>
					</DialogHeader>
					<div className="prose dark:prose-invert max-w-none">
						{isLoadingDocument ? (
							<div className="flex items-center justify-center py-8">
								<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
							</div>
						) : modalContent?.content ? (
							<Streamdown>{modalContent.content}</Streamdown>
						) : (
							<p className="text-muted-foreground">{t("citations.noContent")}</p>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
