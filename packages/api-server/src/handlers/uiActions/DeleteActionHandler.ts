/**
 * Delete Action Handler
 *
 * Category 4: Delete Actions
 * Handles destructive entity operations with webhooks
 *
 * Webhook: YES | Data Required: YES (entity ID)
 *
 * Actions handled:
 * - delete: Delete generic entity
 * - remove: Remove item/entity
 * - delete_account: Delete user account
 * - delete_workflow: Delete workflow definition
 */

import { DeleteActionType } from "../../types/uiAction.js";
import { BaseActionHandler } from "./BaseActionHandler.js";

export class DeleteActionHandler extends BaseActionHandler {
	protected readonly actionTypes = Object.values(DeleteActionType);

	// Inherits all 5-step pattern logic from BaseActionHandler
	// Required data typically includes:
	// - entity_id: string (ID of entity to delete)
	// - entity_type: string (type of entity: user, workflow, etc.)
	// Optional data:
	// - confirm: boolean (confirmation flag)
	// - reason: string (reason for deletion)
}
