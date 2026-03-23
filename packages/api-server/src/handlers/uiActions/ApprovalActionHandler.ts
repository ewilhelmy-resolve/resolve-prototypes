/**
 * Approval Action Handler
 *
 * Category 3: Approval/Review Actions
 * Handles workflow approval, rejection, and review actions with webhooks
 *
 * Webhook: YES | Data Required: OPTIONAL (comments, reason)
 *
 * Actions handled:
 * - approve: Approve a workflow/request
 * - reject: Reject a workflow/request
 * - review: Mark for review
 * - acknowledge: Acknowledge notification/alert
 * - request_changes: Request modifications
 */

import { ApprovalActionType } from "../../types/uiAction.js";
import { BaseActionHandler } from "./BaseActionHandler.js";

export class ApprovalActionHandler extends BaseActionHandler {
	protected readonly actionTypes = Object.values(ApprovalActionType);

	// Inherits all 5-step pattern logic from BaseActionHandler
	// Optional data typically includes:
	// - comments: string (reason for approval/rejection)
	// - reason: string (why changes are requested)
	// - reviewer: string (who performed the review)
}
