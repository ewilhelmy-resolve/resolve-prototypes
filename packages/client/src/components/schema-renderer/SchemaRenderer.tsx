/**
 * SchemaRenderer
 *
 * Renders JSON UI schema as React components.
 * Maps schema types → shadcn/ui components.
 *
 * JAR-81: Validates schema with Zod, handles errors gracefully.
 */

import { AlertCircle } from "lucide-react";
import {
	Component,
	type ErrorInfo,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "../../lib/toast";
import type {
	ButtonComponent,
	CardComponent,
	ColumnComponent,
	ConditionalProps,
	DiagramComponent,
	DividerComponent,
	FormComponent,
	InputComponent,
	ModalDefinition,
	RowComponent,
	SelectComponent,
	StatComponent,
	TableComponent,
	TextComponent,
	UIActionPayload,
	UIComponent,
	UIElement,
	UISchema,
	UISchemaV2,
} from "../../types/uiSchema";
import {
	evaluateCondition,
	normalizeSchema,
	validateUISchema,
} from "../../types/uiSchema";
import {
	type FormModalField,
	isInIframe,
	openFormModal,
} from "../../utils/hostModal";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
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
import { MermaidRenderer } from "./MermaidRenderer";

// ============================================================================
// Error Boundary for graceful error handling
// ============================================================================

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error?: Error;
}

class SchemaErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error("[SchemaRenderer] Render error:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return (
				this.props.fallback || (
					<SchemaErrorFallback
						title="Render Error"
						message={this.state.error?.message || "Failed to render UI schema"}
					/>
				)
			);
		}
		return this.props.children;
	}
}

// ============================================================================
// Error Fallback UI
// ============================================================================

function SchemaErrorFallback({
	title,
	message,
	details,
}: {
	title: string;
	message: string;
	details?: string[];
}) {
	return (
		<Alert variant="destructive" className="w-full">
			<AlertCircle className="h-4 w-4" />
			<AlertTitle>{title}</AlertTitle>
			<AlertDescription>
				<p>{message}</p>
				{details && details.length > 0 && (
					<ul className="mt-2 text-xs list-disc list-inside">
						{details.slice(0, 3).map((detail, i) => (
							<li key={i}>{detail}</li>
						))}
						{details.length > 3 && (
							<li>...and {details.length - 3} more errors</li>
						)}
					</ul>
				)}
			</AlertDescription>
		</Alert>
	);
}

// ============================================================================
// Main Component
// ============================================================================

interface SchemaRendererProps {
	/** Accepts V1 UISchema, V2 UISchemaV2, or any raw schema object */
	schema: UISchema | UISchemaV2 | Record<string, unknown>;
	messageId: string;
	conversationId: string;
	onAction?: (payload: UIActionPayload) => void;
	disabled?: boolean;
}

/** Helper: extract a prop value from UIElement.props */
function p<T = unknown>(el: UIElement, key: string, fallback?: T): T {
	return ((el.props?.[key] as T) ?? fallback) as T;
}

export function SchemaRenderer({
	schema,
	messageId,
	conversationId,
	onAction,
	disabled = false,
}: SchemaRendererProps) {
	const [formData, setFormData] = useState<Record<string, string>>({});
	const [modalFormData, setModalFormData] = useState<Record<string, string>>(
		{},
	);
	const [openDialogId, setOpenDialogId] = useState<string | null>(null);
	const [actionLog, setActionLog] = useState<
		Array<{ action: string; data: Record<string, unknown>; timestamp: string }>
	>([]);
	const [showLogPanel, setShowLogPanel] = useState(false);

	// Track pending modal submission handler for cross-origin postMessage
	const pendingModalSubmitRef = useRef<{
		action: string;
		modalTitle: string;
	} | null>(null);

	// Track auto-open dialog (ref defined early to satisfy hook rules)
	const autoOpenedRef = useRef<string | null>(null);
	const handleOpenDialogRef = useRef<
		| ((dialogId: string, options?: { preventBackdropClose?: boolean }) => void)
		| null
	>(null);

	// Normalize schema to V2 (memoized via ref to avoid re-normalizing every render)
	const normalizedRef = useRef<{ input: unknown; output: UISchemaV2 | null }>({
		input: undefined,
		output: null,
	});
	if (normalizedRef.current.input !== schema) {
		normalizedRef.current = {
			input: schema,
			output: normalizeSchema(schema),
		};
	}
	const normalized = normalizedRef.current.output;

	// Listen for form modal submissions from host (cross-origin)
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const { type, data } = event.data || {};

			if (type === "FORM_MODAL_SUBMITTED" && pendingModalSubmitRef.current) {
				const { action, modalTitle } = pendingModalSubmitRef.current;
				pendingModalSubmitRef.current = null;

				// Log the action
				const logEntry = {
					action,
					data: data || {},
					timestamp: new Date().toISOString(),
				};
				setActionLog((prev) => [logEntry, ...prev]);

				// Call the action handler
				onAction?.({
					action,
					data,
					messageId,
					conversationId,
					timestamp: logEntry.timestamp,
				});

				// Show toast with View Log action
				toast.success(`${modalTitle} saved`, {
					description: `Action: ${action}`,
					action: {
						label: "View Log",
						onClick: () => setShowLogPanel(true),
					},
				});
			} else if (type === "FORM_MODAL_CANCELLED") {
				pendingModalSubmitRef.current = null;
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, [messageId, conversationId, onAction]);

	// Auto-open dialog if specified in schema
	useEffect(() => {
		const dialogId = normalized?.autoOpenDialog;
		if (!dialogId || autoOpenedRef.current === dialogId) return;

		const timer = setTimeout(() => {
			if (handleOpenDialogRef.current && autoOpenedRef.current !== dialogId) {
				autoOpenedRef.current = dialogId;
				handleOpenDialogRef.current(dialogId, { preventBackdropClose: true });
			}
		}, 100);
		return () => clearTimeout(timer);
	}, [normalized?.autoOpenDialog]);

	// Early return if normalization fails
	if (!normalized) {
		// Try legacy validation for better error messages
		const validation = validateUISchema(schema);
		if (!validation.valid) {
			const errorMessages = validation.errors?.issues.map(
				(issue) => `${String(issue.path.join("."))}: ${issue.message}`,
			);
			return (
				<SchemaErrorFallback
					title="Invalid Schema"
					message="The UI schema failed validation"
					details={errorMessages}
				/>
			);
		}
		return null;
	}

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

	const handleModalInputChange = (name: string, value: string) => {
		setModalFormData((prev) => ({ ...prev, [name]: value }));
	};

	/** Extract FormModalField[] from a V2 UIElement tree for host modal */
	const extractFieldsFromElement = (el: UIElement): FormModalField[] => {
		const fields: FormModalField[] = [];
		if (el.type === "Input") {
			fields.push({
				type: p<string>(el, "inputType") === "textarea" ? "textarea" : "input",
				name: p<string>(el, "name", ""),
				label: p<string>(el, "label"),
				placeholder: p<string>(el, "placeholder"),
				inputType: p<string>(el, "inputType"),
				defaultValue: p<string>(el, "defaultValue"),
			});
		} else if (el.type === "Select") {
			fields.push({
				type: "select",
				name: p<string>(el, "name", ""),
				label: p<string>(el, "label"),
				placeholder: p<string>(el, "placeholder"),
				options: p<Array<{ label: string; value: string }>>(el, "options"),
				defaultValue: p<string>(el, "defaultValue"),
			});
		}
		if (el.children) {
			for (const child of el.children) {
				fields.push(...extractFieldsFromElement(child));
			}
		}
		return fields;
	};

	const handleOpenDialog = (
		dialogId: string,
		options?: { preventBackdropClose?: boolean },
	) => {
		const dialog = normalized.dialogs?.[dialogId];
		if (!dialog) return;

		const title = p<string>(dialog, "title", "");
		const description = p<string>(dialog, "description");
		const size = p<string>(dialog, "size", "full") as
			| "sm"
			| "md"
			| "lg"
			| "xl"
			| "full";
		const submitAction = p<string>(dialog, "submitAction");
		const submitLabel = p<string>(dialog, "submitLabel");
		const cancelLabel = p<string>(dialog, "cancelLabel");
		const submitVariant = p<string>(dialog, "submitVariant");

		// In iframe context, open modal in host page
		if (isInIframe()) {
			const fields = extractFieldsFromElement(dialog);

			if (submitAction) {
				pendingModalSubmitRef.current = {
					action: submitAction,
					modalTitle: title,
				};
			}

			openFormModal({
				title,
				description,
				size,
				fields,
				submitLabel,
				cancelLabel,
				submitVariant:
					submitVariant === "destructive" ? "destructive" : "default",
				preventBackdropClose: options?.preventBackdropClose,
				onSubmit: (data) => {
					pendingModalSubmitRef.current = null;
					if (submitAction) {
						const logEntry = {
							action: submitAction,
							data: data as Record<string, unknown>,
							timestamp: new Date().toISOString(),
						};
						setActionLog((prev) => [logEntry, ...prev]);
						handleAction(submitAction, data);
						toast.success(`${title} saved`, {
							description: `Action: ${submitAction}`,
							action: {
								label: "View Log",
								onClick: () => setShowLogPanel(true),
							},
						});
					}
				},
				onCancel: () => {
					pendingModalSubmitRef.current = null;
				},
			});
			return;
		}

		// Not in iframe - use inline Dialog
		setModalFormData({});
		setOpenDialogId(dialogId);
	};

	// Populate ref for auto-open effect
	handleOpenDialogRef.current = handleOpenDialog;

	const handleCloseDialog = () => {
		setOpenDialogId(null);
		setModalFormData({});
	};

	const handleDialogSubmit = (action: string, dialogTitle: string) => {
		const logEntry = {
			action,
			data: modalFormData as Record<string, unknown>,
			timestamp: new Date().toISOString(),
		};
		setActionLog((prev) => [logEntry, ...prev]);
		handleAction(action, modalFormData);
		handleCloseDialog();

		toast.success(`${dialogTitle} saved`, {
			description: `Action: ${action}`,
			action: {
				label: "View Log",
				onClick: () => setShowLogPanel(true),
			},
		});
	};

	/** Render a V2 UIElement tree */
	const renderElement = (
		element: UIElement,
		index: number,
		context: Record<string, string> = formData,
		onInputChange: (name: string, value: string) => void = handleInputChange,
	): React.ReactNode => {
		// Check conditional rendering
		const condIf = element.props?.if as ConditionalProps | undefined;
		if (condIf && !evaluateCondition(condIf, context)) return null;

		const key = p<string>(element, "id") || `${element.type}-${index}`;

		switch (element.type) {
			case "Text":
				return (
					<TextRenderer
						key={key}
						component={{
							type: "text",
							content: p<string>(element, "content", ""),
							variant: p(element, "variant"),
							className: p<string>(element, "className"),
						}}
					/>
				);
			case "Stat":
				return (
					<StatRenderer
						key={key}
						component={{
							type: "stat",
							label: p<string>(element, "label", ""),
							value: p<string | number>(element, "value", ""),
							change: p<string>(element, "change"),
							changeType: p(element, "changeType"),
							className: p<string>(element, "className"),
						}}
					/>
				);
			case "Input":
				return (
					<InputRenderer
						key={key}
						component={{
							type: "input",
							name: p<string>(element, "name", ""),
							label: p<string>(element, "label"),
							placeholder: p<string>(element, "placeholder"),
							inputType: p(element, "inputType"),
							required: p<boolean>(element, "required"),
							className: p<string>(element, "className"),
						}}
						value={
							context[p<string>(element, "name", "")] ||
							p<string>(element, "defaultValue", "")
						}
						onChange={(value) =>
							onInputChange(p<string>(element, "name", ""), value)
						}
						disabled={disabled}
					/>
				);
			case "Select":
				return (
					<SelectRenderer
						key={key}
						component={{
							type: "select",
							name: p<string>(element, "name", ""),
							label: p<string>(element, "label"),
							placeholder: p<string>(element, "placeholder"),
							options: p<Array<{ label: string; value: string }>>(
								element,
								"options",
								[],
							),
							required: p<boolean>(element, "required"),
							className: p<string>(element, "className"),
						}}
						value={
							context[p<string>(element, "name", "")] ||
							p<string>(element, "defaultValue", "")
						}
						onChange={(value) =>
							onInputChange(p<string>(element, "name", ""), value)
						}
						disabled={disabled}
					/>
				);
			case "Button":
				return (
					<ButtonRenderer
						key={key}
						component={{
							type: "button",
							label: p<string>(element, "label", ""),
							variant: p(element, "variant"),
							disabled: disabled || p<boolean>(element, "disabled"),
							className: p<string>(element, "className"),
						}}
						onClick={() => {
							const opensDialog = p<string>(element, "opensDialog");
							const action = p<string>(element, "action");
							if (opensDialog) {
								handleOpenDialog(opensDialog);
							} else if (action) {
								handleAction(action);
							}
						}}
					/>
				);
			case "Card":
				return (
					<CardRenderer
						key={key}
						component={{
							type: "card",
							title: p<string>(element, "title"),
							description: p<string>(element, "description"),
							className: p<string>(element, "className"),
							children: [] as UIComponent[],
						}}
					>
						{(element.children || []).map((child, i) =>
							renderElement(child, i, context, onInputChange),
						)}
					</CardRenderer>
				);
			case "Row":
				return (
					<RowRenderer
						key={key}
						component={{
							type: "row",
							gap: p<number>(element, "gap"),
							className: p<string>(element, "className"),
							children: [] as UIComponent[],
						}}
					>
						{(element.children || []).map((child, i) =>
							renderElement(child, i, context, onInputChange),
						)}
					</RowRenderer>
				);
			case "Column":
				return (
					<ColumnRenderer
						key={key}
						component={{
							type: "column",
							gap: p<number>(element, "gap"),
							className: p<string>(element, "className"),
							children: [] as UIComponent[],
						}}
					>
						{(element.children || []).map((child, i) =>
							renderElement(child, i, context, onInputChange),
						)}
					</ColumnRenderer>
				);
			case "Form": {
				const submitAction = p<string>(element, "submitAction", "");
				return (
					<FormRenderer
						key={key}
						component={{
							type: "form",
							submitAction,
							submitLabel: p<string>(element, "submitLabel"),
							className: p<string>(element, "className"),
							children: [] as UIComponent[],
						}}
						onSubmit={() => handleAction(submitAction, formData)}
					>
						{(element.children || []).map((child, i) =>
							renderElement(child, i, context, onInputChange),
						)}
					</FormRenderer>
				);
			}
			case "Table":
				return (
					<TableRenderer
						key={key}
						component={{
							type: "table",
							columns: p<Array<{ key: string; label: string }>>(
								element,
								"columns",
								[],
							),
							rows: p<Array<Record<string, string | number>>>(
								element,
								"rows",
								[],
							),
							className: p<string>(element, "className"),
						}}
					/>
				);
			case "Diagram":
				return (
					<DiagramRenderer
						key={key}
						component={{
							type: "diagram",
							code: p<string>(element, "code", ""),
							title: p<string>(element, "title"),
							expandable: p<boolean>(element, "expandable"),
							className: p<string>(element, "className"),
						}}
					/>
				);
			case "Separator":
				return (
					<DividerRenderer
						key={key}
						component={{
							type: "divider",
							spacing: p(element, "spacing"),
							className: p<string>(element, "className"),
						}}
					/>
				);
			default:
				return (
					<div key={key} className="text-sm text-muted-foreground">
						Unknown component type: {element.type}
					</div>
				);
		}
	};

	// Get current open dialog definition
	const currentDialog =
		openDialogId && normalized.dialogs
			? normalized.dialogs[openDialogId]
			: null;

	// Check if root has content to render
	const root = normalized.root;
	if (!root) return null;
	// Column wrapper with no children = empty schema
	if (
		root.type === "Column" &&
		(!root.children || root.children.length === 0)
	) {
		return null;
	}

	return (
		<SchemaErrorBoundary>
			<div className="schema-renderer space-y-3 w-full overflow-hidden">
				{root.type === "Column" && root.children
					? root.children.map((child, i) => renderElement(child, i))
					: renderElement(root, 0)}
			</div>

			{/* Dialog rendering */}
			{currentDialog && (
				<ModalRenderer
					modal={{
						title: p<string>(currentDialog, "title", ""),
						description: p<string>(currentDialog, "description"),
						size: p(currentDialog, "size", "full"),
						children: [] as UIComponent[],
						submitAction: p<string>(currentDialog, "submitAction"),
						submitLabel: p<string>(currentDialog, "submitLabel"),
						cancelLabel: p<string>(currentDialog, "cancelLabel"),
						submitVariant: p(currentDialog, "submitVariant"),
					}}
					open={!!openDialogId}
					onClose={handleCloseDialog}
					onSubmit={handleDialogSubmit}
					renderComponent={(_comp, index) => {
						const children = currentDialog.children || [];
						if (index < children.length) {
							return renderElement(
								children[index],
								index,
								modalFormData,
								handleModalInputChange,
							);
						}
						return null;
					}}
					dialogChildren={currentDialog.children}
				/>
			)}

			{/* Action Log Panel */}
			{showLogPanel && (
				<Dialog open={showLogPanel} onOpenChange={setShowLogPanel}>
					<DialogContent className="sm:max-w-lg">
						<DialogHeader>
							<DialogTitle>Action Log</DialogTitle>
							<DialogDescription>
								Recent form submissions and actions
							</DialogDescription>
						</DialogHeader>
						<div className="max-h-[400px] overflow-y-auto space-y-2">
							{actionLog.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-4">
									No actions logged yet
								</p>
							) : (
								actionLog.map((entry, i) => (
									<div
										key={i}
										className="p-3 rounded-md bg-muted/50 text-sm space-y-1"
									>
										<div className="flex justify-between items-center">
											<span className="font-medium">{entry.action}</span>
											<span className="text-xs text-muted-foreground">
												{new Date(entry.timestamp).toLocaleTimeString()}
											</span>
										</div>
										<pre className="text-xs text-muted-foreground overflow-x-auto">
											{JSON.stringify(entry.data, null, 2)}
										</pre>
									</div>
								))
							)}
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setActionLog([])}>
								Clear Log
							</Button>
							<Button onClick={() => setShowLogPanel(false)}>Close</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</SchemaErrorBoundary>
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
		<div
			className={`${variants[component.variant || "default"]} ${component.className || ""}`}
		>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					h1: ({ children }) => (
						<h1 className="text-xl font-bold mb-2">{children}</h1>
					),
					h2: ({ children }) => (
						<h2 className="text-lg font-semibold mb-2">{children}</h2>
					),
					h3: ({ children }) => (
						<h3 className="text-base font-semibold mb-1">{children}</h3>
					),
					h4: ({ children }) => (
						<h4 className="text-sm font-semibold mb-1">{children}</h4>
					),
					p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
					table: ({ children }) => (
						<table className="w-full text-sm border-collapse my-2">
							{children}
						</table>
					),
					th: ({ children }) => (
						<th className="border border-border px-2 py-1 text-left font-medium bg-muted/50">
							{children}
						</th>
					),
					td: ({ children }) => (
						<td className="border border-border px-2 py-1">{children}</td>
					),
					ul: ({ children }) => (
						<ul className="list-disc list-inside mb-1">{children}</ul>
					),
					ol: ({ children }) => (
						<ol className="list-decimal list-inside mb-1">{children}</ol>
					),
					strong: ({ children }) => (
						<strong className="font-semibold">{children}</strong>
					),
					code: ({ children }) => (
						<code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
							{children}
						</code>
					),
				}}
			>
				{component.content}
			</ReactMarkdown>
		</div>
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
	disabled,
}: {
	component: InputComponent;
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
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
				disabled={disabled}
			/>
		</div>
	);
}

function SelectRenderer({
	component,
	value,
	onChange,
	disabled,
}: {
	component: SelectComponent;
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
}) {
	return (
		<div className={`space-y-1.5 ${component.className || ""}`}>
			{component.label && <Label>{component.label}</Label>}
			<Select value={value} onValueChange={onChange} disabled={disabled}>
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

function DiagramRenderer({ component }: { component: DiagramComponent }) {
	return (
		<MermaidRenderer
			code={component.code}
			title={component.title}
			expandable={component.expandable}
			className={component.className}
		/>
	);
}

function DividerRenderer({ component }: { component: DividerComponent }) {
	const spacingClasses = {
		sm: "my-2",
		md: "my-4",
		lg: "my-6",
	};
	return (
		<hr
			className={`border-t border-border ${spacingClasses[component.spacing || "md"]} ${component.className || ""}`}
		/>
	);
}

// Modal size classes
const modalSizeClasses: Record<string, string> = {
	sm: "sm:max-w-sm",
	md: "sm:max-w-md",
	lg: "sm:max-w-lg",
	xl: "sm:max-w-xl",
	full: "sm:max-w-[95vw] sm:max-h-[95vh] w-[95vw] h-[95vh]",
};

function ModalRenderer({
	modal,
	open,
	onClose,
	onSubmit,
	renderComponent,
	dialogChildren,
}: {
	modal: ModalDefinition;
	open: boolean;
	onClose: () => void;
	onSubmit: (action: string, title: string) => void;
	renderComponent: (component: UIComponent, index: number) => React.ReactNode;
	/** V2 dialog children (UIElement[]) — used instead of modal.children when present */
	dialogChildren?: UIElement[];
}) {
	const sizeClass = modalSizeClasses[modal.size || "full"];

	// Use V2 dialogChildren if provided, otherwise fall back to modal.children
	const childCount = dialogChildren
		? dialogChildren.length
		: modal.children.length;

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
			<DialogContent
				className={`${sizeClass} flex flex-col`}
				showCloseButton={true}
			>
				<DialogHeader>
					<DialogTitle>{modal.title}</DialogTitle>
					{modal.description && (
						<DialogDescription>{modal.description}</DialogDescription>
					)}
				</DialogHeader>

				<div className="flex-1 overflow-y-auto space-y-4 py-4">
					{Array.from({ length: childCount }, (_, index) =>
						dialogChildren
							? renderComponent({} as UIComponent, index)
							: renderComponent(modal.children[index], index),
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						{modal.cancelLabel || "Cancel"}
					</Button>
					{modal.submitAction && (
						<Button
							variant={modal.submitVariant || "default"}
							onClick={() => {
								if (modal.submitAction) {
									onSubmit(modal.submitAction, modal.title);
								}
							}}
						>
							{modal.submitLabel || "Submit"}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default SchemaRenderer;
