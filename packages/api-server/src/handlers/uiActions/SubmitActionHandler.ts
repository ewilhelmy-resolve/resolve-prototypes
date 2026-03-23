/**
 * Submit Action Handler
 *
 * Category 1: Submit/Save Actions
 * Handles form data submission actions with webhooks
 *
 * Webhook: YES | Data Required: YES (form data)
 */

import { SubmitActionType } from "../../types/uiAction.js";
import { BaseActionHandler } from "./BaseActionHandler.js";

export class SubmitActionHandler extends BaseActionHandler {
	protected readonly actionTypes = Object.values(SubmitActionType);

	// Inherits all 5-step pattern logic from BaseActionHandler
	// Can override methods if Submit actions need special handling
}
