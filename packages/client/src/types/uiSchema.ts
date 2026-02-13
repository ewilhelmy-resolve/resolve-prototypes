/**
 * UI Schema Types
 *
 * JSON schema format for dynamic UI rendering in workflow activities.
 * Platform sends schema, Jarvis renders corresponding shadcn/ui components.
 *
 * JAR-81: Zod validation for schema integrity
 */

import { z } from "zod";

// ============================================================================
// Zod Schemas (for validation)
// ============================================================================

// Conditional rendering schema
const ConditionalSchema = z.object({
	field: z.string(),
	operator: z.enum([
		"eq",
		"neq",
		"exists",
		"notExists",
		"gt",
		"lt",
		"contains",
	]),
	value: z.unknown().optional(),
});

const BaseComponentSchema = z.object({
	id: z.string().optional(),
	className: z.string().optional(),
	if: ConditionalSchema.optional(),
});

const TextComponentSchema = BaseComponentSchema.extend({
	type: z.literal("text"),
	content: z.string(),
	variant: z
		.enum([
			"default",
			"muted",
			"heading",
			"subheading",
			"code",
			"diff-add",
			"diff-remove",
			"diff-context",
		])
		.optional(),
});

const StatComponentSchema = BaseComponentSchema.extend({
	type: z.literal("stat"),
	label: z.string(),
	value: z.union([z.string(), z.number()]),
	change: z.string().optional(),
	changeType: z.enum(["positive", "negative", "neutral"]).optional(),
});

const InputComponentSchema = BaseComponentSchema.extend({
	type: z.literal("input"),
	name: z.string(),
	label: z.string().optional(),
	placeholder: z.string().optional(),
	inputType: z
		.enum(["text", "email", "number", "password", "textarea"])
		.optional(),
	required: z.boolean().optional(),
	defaultValue: z.string().optional(),
});

const SelectOptionSchema = z.object({
	label: z.string(),
	value: z.string(),
});

const SelectComponentSchema = BaseComponentSchema.extend({
	type: z.literal("select"),
	name: z.string(),
	label: z.string().optional(),
	placeholder: z.string().optional(),
	options: z.array(SelectOptionSchema),
	required: z.boolean().optional(),
	defaultValue: z.string().optional(),
});

const ButtonComponentSchema = BaseComponentSchema.extend({
	type: z.literal("button"),
	label: z.string(),
	action: z.string().optional(), // Optional if opensModal is used
	opensModal: z.string().optional(), // Modal ID to open
	variant: z
		.enum(["default", "destructive", "outline", "secondary", "ghost"])
		.optional(),
	disabled: z.boolean().optional(),
});

const TableColumnSchema = z.object({
	key: z.string(),
	label: z.string(),
});

const TableComponentSchema = BaseComponentSchema.extend({
	type: z.literal("table"),
	columns: z.array(TableColumnSchema),
	rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
});

// Use z.any() for children to avoid complex recursive types
// Runtime validation still catches structural issues
const CardComponentSchema = BaseComponentSchema.extend({
	type: z.literal("card"),
	title: z.string().optional(),
	description: z.string().optional(),
	children: z.array(z.any()),
});

const RowComponentSchema = BaseComponentSchema.extend({
	type: z.literal("row"),
	gap: z.number().optional(),
	children: z.array(z.any()),
});

const ColumnComponentSchema = BaseComponentSchema.extend({
	type: z.literal("column"),
	gap: z.number().optional(),
	children: z.array(z.any()),
});

const FormComponentSchema = BaseComponentSchema.extend({
	type: z.literal("form"),
	submitAction: z.string(),
	submitLabel: z.string().optional(),
	children: z.array(z.any()),
});

const DiagramComponentSchema = BaseComponentSchema.extend({
	type: z.literal("diagram"),
	code: z.string(),
	title: z.string().optional(),
	expandable: z.boolean().optional(),
});

const DividerComponentSchema = BaseComponentSchema.extend({
	type: z.literal("divider"),
	spacing: z.enum(["sm", "md", "lg"]).optional(),
});

// Modal definition schema
const ModalDefinitionSchema = z.object({
	title: z.string(),
	description: z.string().optional(),
	size: z.enum(["sm", "md", "lg", "xl", "full"]).optional(), // Default: full
	children: z.array(z.any()),
	submitAction: z.string().optional(),
	submitLabel: z.string().optional(),
	cancelLabel: z.string().optional(),
	submitVariant: z
		.enum(["default", "destructive", "outline", "secondary", "ghost"])
		.optional(),
});

// Component schema using discriminated union
const UIComponentSchema = z.discriminatedUnion("type", [
	TextComponentSchema,
	StatComponentSchema,
	InputComponentSchema,
	SelectComponentSchema,
	ButtonComponentSchema,
	TableComponentSchema,
	CardComponentSchema,
	RowComponentSchema,
	ColumnComponentSchema,
	DiagramComponentSchema,
	DividerComponentSchema,
	FormComponentSchema,
]);

export const UISchemaValidator = z.object({
	version: z.literal("1").optional(),
	components: z.array(UIComponentSchema),
	modals: z.record(z.string(), ModalDefinitionSchema).optional(),
	/** Auto-open a modal when schema renders (for forced credential prompts, etc.) */
	autoOpenModal: z.string().optional(),
});

// ============================================================================
// Validation Function
// ============================================================================

export interface SchemaValidationResult {
	valid: boolean;
	data?: UISchema;
	errors?: z.ZodError;
}

/**
 * Validate a UI schema against the Zod schema
 * @param schema - Raw schema object to validate
 * @returns Validation result with parsed data or errors
 */
export function validateUISchema(schema: unknown): SchemaValidationResult {
	const result = UISchemaValidator.safeParse(schema);
	if (result.success) {
		return { valid: true, data: result.data as UISchema };
	}
	return { valid: false, errors: result.error };
}

// ============================================================================
// TypeScript Interfaces (for type safety in components)
// ============================================================================

// Conditional rendering props
export interface ConditionalProps {
	field: string;
	operator: "eq" | "neq" | "exists" | "notExists" | "gt" | "lt" | "contains";
	value?: unknown;
}

// Base component with common properties
interface BaseComponent {
	id?: string;
	className?: string;
	if?: ConditionalProps;
}

// Text display
export interface TextComponent extends BaseComponent {
	type: "text";
	content: string;
	variant?:
		| "default"
		| "muted"
		| "heading"
		| "subheading"
		| "code"
		| "diff-add"
		| "diff-remove"
		| "diff-context";
}

// Stat card (single metric)
export interface StatComponent extends BaseComponent {
	type: "stat";
	label: string;
	value: string | number;
	change?: string;
	changeType?: "positive" | "negative" | "neutral";
}

// Form input field
export interface InputComponent extends BaseComponent {
	type: "input";
	name: string;
	label?: string;
	placeholder?: string;
	inputType?: "text" | "email" | "number" | "password" | "textarea";
	required?: boolean;
	defaultValue?: string;
}

// Select dropdown
export interface SelectComponent extends BaseComponent {
	type: "select";
	name: string;
	label?: string;
	placeholder?: string;
	options: Array<{ label: string; value: string }>;
	required?: boolean;
	defaultValue?: string;
}

// Button
export interface ButtonComponent extends BaseComponent {
	type: "button";
	label: string;
	action?: string; // Action identifier sent back to platform
	opensModal?: string; // Modal ID to open (alternative to action)
	variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
	disabled?: boolean;
}

// Card container
export interface CardComponent extends BaseComponent {
	type: "card";
	title?: string;
	description?: string;
	children: UIComponent[];
}

// Row layout (horizontal)
export interface RowComponent extends BaseComponent {
	type: "row";
	gap?: number;
	children: UIComponent[];
}

// Column layout (vertical)
export interface ColumnComponent extends BaseComponent {
	type: "column";
	gap?: number;
	children: UIComponent[];
}

// Form container (collects inputs and submits)
export interface FormComponent extends BaseComponent {
	type: "form";
	submitAction: string; // Action identifier for form submission
	submitLabel?: string;
	children: UIComponent[];
}

// Simple table
export interface TableComponent extends BaseComponent {
	type: "table";
	columns: Array<{ key: string; label: string }>;
	rows: Array<Record<string, string | number>>;
}

// Mermaid diagram
export interface DiagramComponent extends BaseComponent {
	type: "diagram";
	code: string; // Mermaid diagram code
	title?: string;
	expandable?: boolean; // Allow fullscreen expansion
}

// Horizontal divider
export interface DividerComponent extends BaseComponent {
	type: "divider";
	spacing?: "sm" | "md" | "lg"; // Vertical spacing around divider
}

// Modal definition (referenced by ID in schema.modals)
export interface ModalDefinition {
	title: string;
	description?: string;
	size?: "sm" | "md" | "lg" | "xl" | "full"; // Default: full
	children: UIComponent[];
	submitAction?: string; // Action to trigger on submit
	submitLabel?: string; // Default: "Submit"
	cancelLabel?: string; // Default: "Cancel"
	submitVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
}

// Union of all component types
export type UIComponent =
	| TextComponent
	| StatComponent
	| InputComponent
	| SelectComponent
	| ButtonComponent
	| CardComponent
	| RowComponent
	| ColumnComponent
	| FormComponent
	| TableComponent
	| DiagramComponent
	| DividerComponent;

// Root schema object
export interface UISchema {
	version?: "1";
	components: UIComponent[];
	modals?: Record<string, ModalDefinition>;
	/** Auto-open a modal when schema renders (for forced credential prompts, etc.) */
	autoOpenModal?: string;
}

// Action callback payload sent back to platform
export interface UIActionPayload {
	action: string;
	data?: Record<string, unknown>;
	messageId: string;
	conversationId: string;
	timestamp: string;
}

// ============================================================================
// V2 Schema Types (json-render.dev nested format)
// ============================================================================

/** Single element in the V2 tree */
export interface UIElement {
	type: string;
	props?: Record<string, unknown>;
	children?: UIElement[];
}

/** V2 root schema */
export interface UISchemaV2 {
	root: UIElement;
	dialogs?: Record<string, UIElement>;
	autoOpenDialog?: string;
}

// ============================================================================
// V2 Zod Validators
// ============================================================================

const UIElementSchema: z.ZodType<UIElement> = z.lazy(() =>
	z.object({
		type: z.string(),
		props: z.record(z.string(), z.unknown()).optional(),
		children: z.array(UIElementSchema).optional(),
	}),
);

export const UISchemaV2Validator = z.object({
	root: UIElementSchema,
	dialogs: z.record(z.string(), UIElementSchema).optional(),
	autoOpenDialog: z.string().optional(),
});

// ============================================================================
// Schema Normalizer (V1 → V2)
// ============================================================================

/** Map lowercase V1 type → PascalCase V2 type */
const TYPE_MAP: Record<string, string> = {
	text: "Text",
	stat: "Stat",
	input: "Input",
	select: "Select",
	button: "Button",
	card: "Card",
	row: "Row",
	column: "Column",
	form: "Form",
	table: "Table",
	diagram: "Diagram",
	divider: "Separator",
	textarea: "Input",
};

/** Convert a V1 component to a V2 UIElement */
function convertComponent(comp: Record<string, unknown>): UIElement {
	const { type: rawType, id, className, children: rawChildren, ...rest } = comp;
	const typeStr = String(rawType || "");

	// Handle "text" with name → Input (InlineFormRequest quirk)
	if (typeStr === "text" && rest.name) {
		const props: Record<string, unknown> = { ...rest };
		if (id) props.id = id;
		if (className) props.className = className;
		props.inputType = props.inputType || "text";
		return { type: "Input", props };
	}

	// Handle "textarea" → Input with inputType
	if (typeStr === "textarea") {
		const props: Record<string, unknown> = { ...rest };
		if (id) props.id = id;
		if (className) props.className = className;
		props.inputType = "textarea";
		return { type: "Input", props };
	}

	const mappedType = TYPE_MAP[typeStr] || typeStr;
	const props: Record<string, unknown> = { ...rest };
	if (id) props.id = id;
	if (className) props.className = className;

	// Rename opensModal → opensDialog
	if (props.opensModal !== undefined) {
		props.opensDialog = props.opensModal;
		delete props.opensModal;
	}

	const element: UIElement = { type: mappedType, props };

	// Convert children recursively
	if (Array.isArray(rawChildren)) {
		element.children = rawChildren.map((c: unknown) =>
			convertComponent(c as Record<string, unknown>),
		);
	}

	return element;
}

/** Convert a V1 ModalDefinition to a V2 UIElement (Form root) */
function convertModal(modal: Record<string, unknown>): UIElement {
	const {
		title,
		description,
		size,
		children: rawChildren,
		fields: rawFields,
		submitAction,
		submitLabel,
		cancelLabel,
		submitVariant,
	} = modal;

	const childArr = (rawChildren ?? rawFields ?? []) as Record<
		string,
		unknown
	>[];
	const convertedChildren = childArr.map((c) => convertComponent(c));

	const props: Record<string, unknown> = {};
	if (title !== undefined) props.title = title;
	if (description !== undefined) props.description = description;
	if (size !== undefined) props.size = size;
	if (submitAction !== undefined) props.submitAction = submitAction;
	if (submitLabel !== undefined) props.submitLabel = submitLabel;
	if (cancelLabel !== undefined) props.cancelLabel = cancelLabel;
	if (submitVariant !== undefined) props.submitVariant = submitVariant;

	return { type: "Form", props, children: convertedChildren };
}

/**
 * Normalize any known schema format into UISchemaV2.
 * - V2 (has `root`) → validate & return
 * - Format 1 (has `components` array) → wrap in Column root
 * - Format 2 (has `modals` only) → take first modal, build Form root
 * - Returns null if unrecognizable
 */
export function normalizeSchema(raw: unknown): UISchemaV2 | null {
	if (!raw || typeof raw !== "object") return null;
	const obj = raw as Record<string, unknown>;

	// Already V2 format
	if (obj.root && typeof obj.root === "object") {
		const parsed = UISchemaV2Validator.safeParse(obj);
		if (parsed.success) return parsed.data;
		// If V2 shape but validation fails, try to use as-is
		return obj as unknown as UISchemaV2;
	}

	// Format 1: { components: [...], modals?: {...}, autoOpenModal?: string }
	if (Array.isArray(obj.components)) {
		const components = obj.components as Record<string, unknown>[];
		const convertedComponents = components.map((c) => convertComponent(c));

		const root: UIElement =
			convertedComponents.length === 1
				? convertedComponents[0]
				: { type: "Column", children: convertedComponents };

		const result: UISchemaV2 = { root };

		// Convert modals → dialogs
		if (obj.modals && typeof obj.modals === "object") {
			const modals = obj.modals as Record<string, Record<string, unknown>>;
			result.dialogs = {};
			for (const [id, modal] of Object.entries(modals)) {
				result.dialogs[id] = convertModal(modal);
			}
		}

		// Map autoOpenModal → autoOpenDialog
		if (obj.autoOpenModal) {
			result.autoOpenDialog = String(obj.autoOpenModal);
		}

		return result;
	}

	// Format 2: { modals: {...} } only (no components)
	if (obj.modals && typeof obj.modals === "object" && !obj.components) {
		const modals = obj.modals as Record<string, Record<string, unknown>>;
		const entries = Object.entries(modals);
		if (entries.length === 0) return null;

		const [, firstModal] = entries[0];
		const root = convertModal(firstModal);

		// If there are more modals, add them as dialogs
		const result: UISchemaV2 = { root };
		if (entries.length > 1) {
			result.dialogs = {};
			for (const [id, modal] of entries.slice(1)) {
				result.dialogs[id] = convertModal(modal);
			}
		}

		return result;
	}

	return null;
}

// ============================================================================
// Conditional Rendering Helper
// ============================================================================

/**
 * Evaluate a conditional expression against form data context
 * @param condition - The condition to evaluate
 * @param context - Form data context (field values)
 * @returns true if condition passes (component should render), false otherwise
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
