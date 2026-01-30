/**
 * SchemaRenderer
 *
 * Renders JSON UI schema as React components.
 * Maps schema types → shadcn/ui components.
 */

import { useState } from "react";
import type {
	ButtonComponent,
	CardComponent,
	ColumnComponent,
	FormComponent,
	InputComponent,
	RowComponent,
	SelectComponent,
	StatComponent,
	TableComponent,
	TextComponent,
	UIActionPayload,
	UIComponent,
	UISchema,
} from "../../types/uiSchema";
import { Button } from "../ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";

interface SchemaRendererProps {
	schema: UISchema;
	messageId: string;
	conversationId: string;
	onAction?: (payload: UIActionPayload) => void;
}

export function SchemaRenderer({
	schema,
	messageId,
	conversationId,
	onAction,
}: SchemaRendererProps) {
	const [formData, setFormData] = useState<Record<string, string>>({});

	const handleAction = (action: string, data?: Record<string, unknown>) => {
		onAction?.({
			action,
			data,
			messageId,
			conversationId,
			timestamp: new Date().toISOString(),
		});
	};

	const handleInputChange = (name: string, value: string) => {
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const renderComponent = (
		component: UIComponent,
		index: number,
	): React.ReactNode => {
		const key = component.id || `${component.type}-${index}`;

		switch (component.type) {
			case "text":
				return <TextRenderer key={key} component={component} />;

			case "stat":
				return <StatRenderer key={key} component={component} />;

			case "input":
				return (
					<InputRenderer
						key={key}
						component={component}
						value={formData[component.name] || ""}
						onChange={(value) => handleInputChange(component.name, value)}
					/>
				);

			case "select":
				return (
					<SelectRenderer
						key={key}
						component={component}
						value={formData[component.name] || ""}
						onChange={(value) => handleInputChange(component.name, value)}
					/>
				);

			case "button":
				return (
					<ButtonRenderer
						key={key}
						component={component}
						onClick={() => handleAction(component.action)}
					/>
				);

			case "card":
				return (
					<CardRenderer key={key} component={component}>
						{component.children.map((child, i) => renderComponent(child, i))}
					</CardRenderer>
				);

			case "row":
				return (
					<RowRenderer key={key} component={component}>
						{component.children.map((child, i) => renderComponent(child, i))}
					</RowRenderer>
				);

			case "column":
				return (
					<ColumnRenderer key={key} component={component}>
						{component.children.map((child, i) => renderComponent(child, i))}
					</ColumnRenderer>
				);

			case "form":
				return (
					<FormRenderer
						key={key}
						component={component}
						onSubmit={() => handleAction(component.submitAction, formData)}
					>
						{component.children.map((child, i) => renderComponent(child, i))}
					</FormRenderer>
				);

			case "table":
				return <TableRenderer key={key} component={component} />;

			default:
				return (
					<div key={key} className="text-sm text-muted-foreground">
						Unknown component type: {(component as UIComponent).type}
					</div>
				);
		}
	};

	if (!schema?.components?.length) {
		return null;
	}

	return (
		<div className="schema-renderer space-y-3 w-full overflow-hidden">
			{schema.components.map((component, index) =>
				renderComponent(component, index),
			)}
		</div>
	);
}

// Individual component renderers

function TextRenderer({ component }: { component: TextComponent }) {
	const variants: Record<string, string> = {
		default: "text-sm",
		muted: "text-sm text-muted-foreground",
		heading: "text-lg font-semibold",
		subheading: "text-base font-medium",
		code: "text-xs font-mono bg-muted px-1 py-0.5 rounded",
		"diff-add":
			"text-xs font-mono bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 border-l-2 border-green-500",
		"diff-remove":
			"text-xs font-mono bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 border-l-2 border-red-500",
		"diff-context":
			"text-xs font-mono bg-muted/50 text-muted-foreground px-2 py-0.5",
	};
	return (
		<p
			className={`${variants[component.variant || "default"]} ${component.className || ""}`}
		>
			{component.content}
		</p>
	);
}

function StatRenderer({ component }: { component: StatComponent }) {
	const changeColors = {
		positive: "text-green-600",
		negative: "text-red-600",
		neutral: "text-muted-foreground",
	};
	return (
		<div
			className={`p-4 rounded-lg border bg-card flex-1 min-w-0 ${component.className || ""}`}
		>
			<div className="text-xs text-muted-foreground uppercase tracking-wide">
				{component.label}
			</div>
			<div className="text-2xl font-bold mt-1">{component.value}</div>
			{component.change && (
				<div
					className={`text-xs mt-1 ${changeColors[component.changeType || "neutral"]}`}
				>
					{component.change}
				</div>
			)}
		</div>
	);
}

function InputRenderer({
	component,
	value,
	onChange,
}: {
	component: InputComponent;
	value: string;
	onChange: (value: string) => void;
}) {
	const InputEl = component.inputType === "textarea" ? Textarea : Input;
	return (
		<div className={`space-y-1.5 ${component.className || ""}`}>
			{component.label && (
				<Label htmlFor={component.name}>{component.label}</Label>
			)}
			<InputEl
				id={component.name}
				name={component.name}
				type={component.inputType || "text"}
				placeholder={component.placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				required={component.required}
			/>
		</div>
	);
}

function SelectRenderer({
	component,
	value,
	onChange,
}: {
	component: SelectComponent;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<div className={`space-y-1.5 ${component.className || ""}`}>
			{component.label && <Label>{component.label}</Label>}
			<Select value={value} onValueChange={onChange}>
				<SelectTrigger>
					<SelectValue placeholder={component.placeholder || "Select..."} />
				</SelectTrigger>
				<SelectContent>
					{component.options.map((opt) => (
						<SelectItem key={opt.value} value={opt.value}>
							{opt.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

function ButtonRenderer({
	component,
	onClick,
}: {
	component: ButtonComponent;
	onClick: () => void;
}) {
	return (
		<Button
			variant={component.variant || "default"}
			disabled={component.disabled}
			onClick={onClick}
			className={component.className}
		>
			{component.label}
		</Button>
	);
}

function CardRenderer({
	component,
	children,
}: {
	component: CardComponent;
	children: React.ReactNode;
}) {
	return (
		<Card className={`w-full overflow-hidden ${component.className || ""}`}>
			{(component.title || component.description) && (
				<CardHeader className="pb-3">
					{component.title && (
						<CardTitle className="text-base">{component.title}</CardTitle>
					)}
					{component.description && (
						<CardDescription>{component.description}</CardDescription>
					)}
				</CardHeader>
			)}
			<CardContent className="space-y-3">{children}</CardContent>
		</Card>
	);
}

function RowRenderer({
	component,
	children,
}: {
	component: RowComponent;
	children: React.ReactNode;
}) {
	return (
		<div
			className={`flex flex-wrap items-start w-full overflow-hidden ${component.className || ""}`}
			style={{ gap: component.gap ?? 12 }}
		>
			{children}
		</div>
	);
}

function ColumnRenderer({
	component,
	children,
}: {
	component: ColumnComponent;
	children: React.ReactNode;
}) {
	return (
		<div
			className={`flex flex-col ${component.className || ""}`}
			style={{ gap: component.gap ?? 12 }}
		>
			{children}
		</div>
	);
}

function FormRenderer({
	component,
	children,
	onSubmit,
}: {
	component: FormComponent;
	children: React.ReactNode;
	onSubmit: () => void;
}) {
	return (
		<form
			className={`space-y-4 ${component.className || ""}`}
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit();
			}}
		>
			{children}
			<Button type="submit">{component.submitLabel || "Submit"}</Button>
		</form>
	);
}

function TableRenderer({ component }: { component: TableComponent }) {
	return (
		<div
			className={`rounded-md border w-full overflow-x-auto ${component.className || ""}`}
		>
			<table className="w-full text-sm min-w-0">
				<thead>
					<tr className="border-b bg-muted/50">
						{component.columns.map((col) => (
							<th key={col.key} className="px-3 py-2 text-left font-medium">
								{col.label}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{component.rows.map((row, i) => (
						<tr key={i} className="border-b last:border-0">
							{component.columns.map((col) => (
								<td key={col.key} className="px-3 py-2">
									{row[col.key]}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export default SchemaRenderer;
