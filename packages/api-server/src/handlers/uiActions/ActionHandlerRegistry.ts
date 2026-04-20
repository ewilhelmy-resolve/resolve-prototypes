/**
 * Action Handler Registry
 *
 * Central routing system for UI action handlers
 * Routes actions to appropriate handlers based on action type
 *
 * Current: Category 1 (Submit Actions)
 * Future: Will expand with CRUD, Workflow, Navigation handlers
 */

import { logger } from "../../config/logger.js";
import type {
	ActionHandlerContext,
	ActionHandlerResult,
	UIActionHandler,
} from "../../types/uiAction.js";
import {
	ApprovalActionType,
	DeleteActionType,
	SubmitActionType,
	WorkflowActionType,
} from "../../types/uiAction.js";
import { BaseActionHandler } from "./BaseActionHandler.js";

export class ActionHandlerRegistry {
	private handlers: UIActionHandler[] = [];

	constructor() {
		// Register handlers in priority order (first match wins)
		this.handlers = [
			new BaseActionHandler(Object.values(SubmitActionType)),
			new BaseActionHandler(Object.values(WorkflowActionType)),
			new BaseActionHandler(Object.values(ApprovalActionType)),
			new BaseActionHandler(Object.values(DeleteActionType)),
		];
	}

	/**
	 * Route action to appropriate handler
	 * Falls back to logging if no handler matches
	 */
	async handleAction(
		context: ActionHandlerContext,
	): Promise<ActionHandlerResult> {
		const { payload } = context;

		// Find first handler that can process this action
		const handler = this.handlers.find((h) => h.canHandle(payload.action));

		if (handler) {
			logger.info(
				{
					action: payload.action,
					handler: handler.constructor.name,
				},
				"Routing action to handler",
			);
			return handler.handle(context);
		}

		// No handler found - log warning
		logger.warn(
			{ action: payload.action },
			"No handler found for action - action not processed",
		);

		return {
			success: false,
			webhookSent: false,
			error: `No handler registered for action: ${payload.action}`,
		};
	}

	/**
	 * Register custom handler (for future extensibility)
	 */
	registerHandler(handler: UIActionHandler): void {
		this.handlers.unshift(handler); // Add to front for priority
	}
}

// Singleton instance
let registry: ActionHandlerRegistry | null = null;

export function getActionHandlerRegistry(): ActionHandlerRegistry {
	if (!registry) {
		registry = new ActionHandlerRegistry();
	}
	return registry;
}
