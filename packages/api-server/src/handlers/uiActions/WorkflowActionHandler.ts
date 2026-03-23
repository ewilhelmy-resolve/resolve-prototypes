/**
 * Workflow Action Handler
 *
 * Category 2: Workflow Management Actions
 * Handles workflow control operations with webhooks
 *
 * Webhook: YES | Data Required: OPTIONAL (entity ID, workflow ID)
 *
 * Actions handled:
 * - enable_workflow: Enable/activate workflow
 * - disable_workflow: Disable/deactivate workflow
 * - pause_workflow: Pause workflow execution
 * - resume_workflow: Resume paused workflow
 */

import { WorkflowActionType } from "../../types/uiAction.js";
import { BaseActionHandler } from "./BaseActionHandler.js";

export class WorkflowActionHandler extends BaseActionHandler {
	protected readonly actionTypes = Object.values(WorkflowActionType);

	// Inherits all 5-step pattern logic from BaseActionHandler
	// Optional data typically includes:
	// - workflow_id: string (ID of workflow to control)
	// - entity_id: string (related entity ID)
	// - reason: string (why workflow is being paused/disabled)
}
