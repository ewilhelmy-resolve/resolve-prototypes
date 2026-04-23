/**
 * Client-Side Action Handler
 *
 * Handles navigation and cancel/dismiss actions purely on the client.
 * These actions do not trigger API calls - they only update local state.
 */

import {
	CancelActionType,
	ClearActionType,
	type ClientActionPayload,
	type ClientActionResult,
	ExternalLinkActionType,
	NavigationActionType,
	type NavigationState,
	PreviewActionType,
} from "../types/clientActions";

/**
 * Check if an action is a client-side only action
 */
export function isClientSideAction(action: string): boolean {
	const navigationActions = Object.values(NavigationActionType) as string[];
	const cancelActions = Object.values(CancelActionType) as string[];
	const clearActions = Object.values(ClearActionType) as string[];
	const externalLinkActions = Object.values(ExternalLinkActionType) as string[];
	const showPreview = Object.values(PreviewActionType) as string[];

	return [
		...navigationActions,
		...cancelActions,
		...clearActions,
		...externalLinkActions,
		...showPreview,
	].includes(action);
}

/**
 * Check if an action is a navigation action
 */
export function isNavigationAction(action: string): boolean {
	return (Object.values(NavigationActionType) as string[]).includes(action);
}

/**
 * Check if an action is a cancel/dismiss action
 */
export function isCancelAction(action: string): boolean {
	return (Object.values(CancelActionType) as string[]).includes(action);
}

/**
 * Check if an action is a clear action
 */
export function isClearAction(action: string): boolean {
	return (Object.values(ClearActionType) as string[]).includes(action);
}

/**
 * Check if an action is an external link action
 */
export function isExternalLinkAction(action: string): boolean {
	return (Object.values(ExternalLinkActionType) as string[]).includes(action);
}

/**
 * Handle navigation actions
 */
export function handleNavigationAction(
	payload: ClientActionPayload,
	currentState: NavigationState,
): ClientActionResult {
	const { action } = payload;

	switch (action) {
		case NavigationActionType.NEXT: {
			// Move to next step if possible
			if (!currentState.canGoNext) {
				return { success: false };
			}

			const nextStep = currentState.currentStep + 1;
			const navigationState: NavigationState = {
				currentStep: nextStep,
				totalSteps: currentState.totalSteps,
				canGoNext: nextStep < currentState.totalSteps - 1,
				canGoPrevious: true,
				isFinished: nextStep === currentState.totalSteps - 1,
			};

			return {
				success: true,
				navigationState,
			};
		}

		case NavigationActionType.PREVIOUS: {
			// Move to previous step if possible
			if (!currentState.canGoPrevious) {
				return { success: false };
			}

			const prevStep = currentState.currentStep - 1;
			const navigationState: NavigationState = {
				currentStep: prevStep,
				totalSteps: currentState.totalSteps,
				canGoNext: true,
				canGoPrevious: prevStep > 0,
				isFinished: false,
			};

			return {
				success: true,
				navigationState,
			};
		}

		case NavigationActionType.FINISH: {
			// Complete the multi-step flow
			return {
				success: true,
				shouldCloseForm: true,
				navigationState: {
					...currentState,
					isFinished: true,
				},
			};
		}

		default:
			return { success: false };
	}
}

/**
 * Handle cancel/dismiss actions
 */
export function handleCancelAction(
	payload: ClientActionPayload,
): ClientActionResult {
	const { action } = payload;

	// All cancel actions result in closing the form
	if (isCancelAction(action)) {
		return {
			success: true,
			shouldCloseForm: true,
		};
	}

	return { success: false };
}

/**
 * Handle clear actions
 */
export function handleClearAction(
	payload: ClientActionPayload,
): ClientActionResult {
	const { action } = payload;

	// All clear actions result in resetting form/state
	if (isClearAction(action)) {
		return {
			success: true,
			shouldClearForm: true,
		};
	}

	return { success: false };
}

/**
 * Handle external link actions
 */
export function handleExternalLinkAction(
	payload: ClientActionPayload,
): ClientActionResult {
	const { action, data } = payload;

	// External link actions require a URL in the data
	if (isExternalLinkAction(action)) {
		const url = data?.url as string | undefined;

		if (!url) {
			console.warn("External link action requires a 'url' field in data");
			return { success: false };
		}

		return {
			success: true,
			externalUrl: url,
		};
	}

	return { success: false };
}

/**
 * Main client-side action handler
 * Routes action to appropriate handler based on type
 */
export function handleClientAction(
	payload: ClientActionPayload,
	navigationState?: NavigationState,
): ClientActionResult {
	const { action } = payload;

	// Route to navigation handler
	if (isNavigationAction(action)) {
		if (!navigationState) {
			console.warn(
				"Navigation action received but no navigation state provided",
			);
			return { success: false };
		}
		return handleNavigationAction(payload, navigationState);
	}

	// Route to cancel handler
	if (isCancelAction(action)) {
		return handleCancelAction(payload);
	}

	// Route to clear handler
	if (isClearAction(action)) {
		return handleClearAction(payload);
	}

	// Route to external link handler
	if (isExternalLinkAction(action)) {
		return handleExternalLinkAction(payload);
	}

	// Unknown client-side action
	console.warn(`Unknown client-side action: ${action}`);
	return { success: false };
}
