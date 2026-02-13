/**
 * UI Schema Types — json-render.dev compatible format
 *
 * Flat element map with string-reference children.
 * Platform sends schema, RITA renders shadcn/ui components.
 *
 * @see https://json-render.dev/docs/schemas
 */

import { z } from "zod";

// ============================================================================
// Core Types
// ============================================================================

/** Single element definition */
export interface UIElement {
	type: string;
	props?: Record<string, unknown>;
	children?: string[]; // element IDs referencing elements map
}

/**
 * Root UI schema — json-render.dev compatible.
 * `root` is a string ID referencing an element in the `elements` map.
 * `dialogs` and `autoOpenDialog` are RITA extensions for modal support.
 */
export interface UISchema {
	root: string;
	elements: Record<string, UIElement>;
	dialogs?: Record<string, string>; // dialog name → element ID
	autoOpenDialog?: string;
}

/** Action callback payload sent back to platform */
export interface UIActionPayload {
	action: string;
	data?: Record<string, unknown>;
	messageId: string;
	conversationId: string;
	timestamp: string;
}

// ============================================================================
// Conditional Rendering
// ============================================================================

export interface ConditionalProps {
	field: string;
	operator: "eq" | "neq" | "exists" | "notExists" | "gt" | "lt" | "contains";
	value?: unknown;
}

/**
 * Evaluate a conditional expression against form data context.
 * Returns true if condition passes (component should render).
 */
export function evaluateCondition(
	condition: ConditionalProps | undefined,
	context: Record<string, unknown>,
): boolean {
	if (!condition) return true;

	const { field, operator, value } = condition;
	const fieldValue = context[field];

	switch (operator) {
		case "eq":
			return fieldValue === value;
		case "neq":
			return fieldValue !== value;
		case "exists":
			return (
				fieldValue !== undefined && fieldValue !== "" && fieldValue !== null
			);
		case "notExists":
			return (
				fieldValue === undefined || fieldValue === "" || fieldValue === null
			);
		case "gt":
			return Number(fieldValue) > Number(value);
		case "lt":
			return Number(fieldValue) < Number(value);
		case "contains":
			return String(fieldValue ?? "").includes(String(value ?? ""));
		default:
			return true;
	}
}

// ============================================================================
// Zod Validators
// ============================================================================

const UIElementSchema = z.object({
	type: z.string(),
	props: z.record(z.string(), z.unknown()).optional(),
	children: z.array(z.string()).optional(),
});

export const UISchemaValidator = z.object({
	root: z.string(),
	elements: z.record(z.string(), UIElementSchema),
	dialogs: z.record(z.string(), z.string()).optional(),
	autoOpenDialog: z.string().optional(),
});

// ============================================================================
// Schema Parser
// ============================================================================

/** Parse and validate raw input as UISchema. Returns null if invalid. */
export function parseSchema(raw: unknown): UISchema | null {
	if (!raw || typeof raw !== "object") return null;
	const result = UISchemaValidator.safeParse(raw);
	return result.success ? result.data : null;
}
