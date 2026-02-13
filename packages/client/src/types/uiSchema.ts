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
	visible?: VisibleCondition; // json-render.dev visibility conditional
	on?: Record<string, Record<string, unknown>>; // json-render.dev event handlers
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

/** json-render.dev `visible` conditional format */
export interface VisibleCondition {
	path: string; // e.g. "$data.form.isDirty"
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
	visible: z
		.object({
			path: z.string(),
			operator: z.string(),
			value: z.unknown().optional(),
		})
		.optional(),
	on: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
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

/** Parse and validate raw input as UISchema. Returns null if invalid.
 *  Handles:
 *  - Standard: { root, elements }
 *  - Flat single element: { elements: { type, props, children } }
 *  - Bare element: { type, props, children }
 */
export function parseSchema(raw: unknown): UISchema | null {
	if (!raw || typeof raw !== "object") return null;

	const obj = raw as Record<string, unknown>;

	// Bare element: { type, props }
	if ("type" in obj && typeof obj.type === "string") {
		return {
			root: "main",
			elements: { main: obj as unknown as UIElement },
		};
	}

	// Flat single element: { elements: { type, props } }
	if (
		"elements" in obj &&
		obj.elements &&
		typeof obj.elements === "object" &&
		"type" in (obj.elements as Record<string, unknown>)
	) {
		return {
			root: "main",
			elements: { main: obj.elements as unknown as UIElement },
		};
	}

	const result = UISchemaValidator.safeParse(raw);
	return result.success ? (result.data as UISchema) : null;
}
