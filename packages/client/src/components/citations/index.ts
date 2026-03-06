/**
 * Citations - A/B testable citation components
 *
 * Export the main Citations wrapper and all variant implementations.
 */

export {
	type CitationSource,
	Citations,
	type CitationsProps,
} from "./Citations";

export { CollapsibleListCitations } from "./variants/CollapsibleListCitations";
export { HoverCardCitations } from "./variants/HoverCardCitations";
export { ModalCitations } from "./variants/ModalCitations";
export { RightPanelCitations } from "./variants/RightPanelCitations";
