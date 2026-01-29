/**
 * UI Schema Types
 *
 * JSON schema format for dynamic UI rendering in workflow activities.
 * Jarvis sends schema, RITA renders corresponding shadcn/ui components.
 */

// Base component with common properties
interface BaseComponent {
	id?: string;
	className?: string;
}

// Text display
export interface TextComponent extends BaseComponent {
	type: "text";
	content: string;
	variant?: "default" | "muted" | "heading" | "subheading";
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
	action: string; // Action identifier sent back to platform
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
	| TableComponent;

// Root schema object
export interface UISchema {
	version?: "1";
	components: UIComponent[];
}

// Action callback payload sent back to platform
export interface UIActionPayload {
	action: string;
	data?: Record<string, unknown>;
	messageId: string;
	conversationId: string;
	timestamp: string;
}
