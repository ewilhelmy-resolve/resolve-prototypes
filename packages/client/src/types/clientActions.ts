/**
 * Client-Side Action Types
 *
 * Actions that are handled purely on the client without backend involvement.
 * These actions do not trigger API calls or webhooks - they only update local UI state.
 */

/**
 * Category 6: Navigation actions - multi-step form navigation
 * Handled client-side only - no API calls
 */
export enum NavigationActionType {
	NEXT = "next",
	PREVIOUS = "previous",
	FINISH = "finish",
}

/**
 * Category 7: Cancel/Dismiss actions - form cancellation
 * Handled client-side only - no API calls
 */
export enum CancelActionType {
	CANCEL = "cancel",
	CLOSE = "close",
	DISMISS = "dismiss",
}

/**
 * Category 8: Clear actions - form/state reset
 * Handled client-side only - no API calls
 */
export enum ClearActionType {
	CLEAR = "clear",
	SETSTATE = "setState",
}

/**
 * Category 9: External link actions - open external URLs
 * Handled client-side only - no API calls
 */
export enum ExternalLinkActionType {
	OPEN_LINK = "open_link",
	OPEN_EXTERNAL = "open_external",
}

export enum PreviewActionType {
	SHOW_PREVIEW = "showPreview",
}
/**
 * All client-side action types
 */
export type ClientActionType =
	| NavigationActionType
	| CancelActionType
	| ClearActionType
	| ExternalLinkActionType
	| PreviewActionType
	| string;

/**
 * Client-side action payload
 */
export interface ClientActionPayload {
	action: ClientActionType;
	data?: Record<string, unknown>;
	timestamp: string;
}

/**
 * Navigation state for multi-step forms
 */
export interface NavigationState {
	currentStep: number;
	totalSteps: number;
	canGoNext: boolean;
	canGoPrevious: boolean;
	isFinished: boolean;
}

/**
 * Client-side action handler result
 */
export interface ClientActionResult {
	success: boolean;
	shouldCloseForm?: boolean;
	shouldClearForm?: boolean;
	externalUrl?: string;
	navigationState?: NavigationState;
}
