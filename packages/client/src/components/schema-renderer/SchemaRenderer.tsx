/**
 * SchemaRenderer
 *
 * Renders json-render.dev UI schema as React components.
 * Maps element types → shadcn/ui components.
 *
 * Schema format: { root: "id", elements: { id: { type, props, children } } }
 * @see https://json-render.dev/docs/schemas
 */

import { AlertCircle, ExternalLink, Info } from "lucide-react";
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
	ConditionalProps,
	UIActionPayload,
	UIElement,
	UISchema,
} from "../../types/uiSchema";
import { evaluateCondition, parseSchema } from "../../types/uiSchema";
import {
	type FormModalField,
	isInIframe,
	openFormModal,
} from "../../utils/hostModal";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";
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
import { Progress } from "../ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import { MermaidRenderer } from "./MermaidRenderer";

// ============================================================================
// Error Boundary
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
// Helpers
// ============================================================================

/** Extract a prop value from UIElement.props */
function p<T = unknown>(el: UIElement, key: string, fallback?: T): T {
	return ((el.props?.[key] as T) ?? fallback) as T;
}

// ============================================================================
// Main Component
// ============================================================================

interface SchemaRendererProps {
	/** Accepts UISchema or any raw schema object */
	schema: UISchema | Record<string, unknown>;
	messageId: string;
	conversationId: string;
	onAction?: (payload: UIActionPayload) => void;
	disabled?: boolean;
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

	// Cross-origin postMessage handler ref
	const pendingModalSubmitRef = useRef<{
		action: string;
		modalTitle: string;
	} | null>(null);

	// Auto-open dialog tracking
	const autoOpenedRef = useRef<string | null>(null);
	const handleOpenDialogRef = useRef<
		| ((dialogId: string, options?: { preventBackdropClose?: boolean }) => void)
		| null
	>(null);

	// Parse and validate schema (memoized via ref)
	const parsedRef = useRef<{ input: unknown; output: UISchema | null }>({
		input: undefined,
		output: null,
	});
	if (parsedRef.current.input !== schema) {
		parsedRef.current = {
			input: schema,
			output: parseSchema(schema),
		};
	}
	const parsed = parsedRef.current.output;

	// Listen for form modal submissions from host (cross-origin)
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const { type, data } = event.data || {};

			if (type === "FORM_MODAL_SUBMITTED" && pendingModalSubmitRef.current) {
				const { action, modalTitle } = pendingModalSubmitRef.current;
				pendingModalSubmitRef.current = null;

				const logEntry = {
					action,
					data: data || {},
					timestamp: new Date().toISOString(),
				};
				setActionLog((prev) => [logEntry, ...prev]);

				onAction?.({
					action,
					data,
					messageId,
					conversationId,
					timestamp: logEntry.timestamp,
				});

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
		const dialogName = parsed?.autoOpenDialog;
		if (!dialogName || autoOpenedRef.current === dialogName) return;

		const timer = setTimeout(() => {
			if (
				handleOpenDialogRef.current &&
				autoOpenedRef.current !== dialogName
			) {
				autoOpenedRef.current = dialogName;
				handleOpenDialogRef.current(dialogName, {
					preventBackdropClose: true,
				});
			}
		}, 100);
		return () => clearTimeout(timer);
	}, [parsed?.autoOpenDialog]);

	// Early return if parse fails
	if (!parsed) {
		return (
			<SchemaErrorFallback
				title="Invalid Schema"
				message="Schema must have root (string) and elements (map)"
			/>
		);
	}

	const { elements } = parsed;
	const rootElement = elements[parsed.root];
	if (!rootElement) {
		return (
			<SchemaErrorFallback
				title="Invalid Schema"
				message={`Root element "${parsed.root}" not found in elements`}
			/>
		);
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

	/** Extract FormModalField[] from an element tree for host modal */
	const extractFieldsFromId = (elementId: string): FormModalField[] => {
		const el = elements[elementId];
		if (!el) return [];

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
		for (const childId of el.children || []) {
			fields.push(...extractFieldsFromId(childId));
		}
		return fields;
	};

	const handleOpenDialog = (
		dialogName: string,
		options?: { preventBackdropClose?: boolean },
	) => {
		const dialogElementId = parsed.dialogs?.[dialogName];
		if (!dialogElementId) return;
		const dialog = elements[dialogElementId];
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
			const fields = extractFieldsFromId(dialogElementId);

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
		setOpenDialogId(dialogName);
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

	/** Render an element by its ID in the elements map */
	const renderElement = (
		elementId: string,
		index: number,
		context: Record<string, string> = formData,
		onInputChange: (name: string, value: string) => void = handleInputChange,
	): React.ReactNode => {
		const element = elements[elementId];
		if (!element) {
			return (
				<div key={elementId} className="text-sm text-muted-foreground">
					Unknown element: {elementId}
				</div>
			);
		}

		// Check conditional rendering (props.if)
		const condIf = element.props?.if as ConditionalProps | undefined;
		if (condIf && !evaluateCondition(condIf, context)) return null;

		// Check visible conditional (json-render.dev spec)
		if (element.visible) {
			const field = element.visible.path?.replace(/^\$data\./, "") || "";
			if (
				!evaluateCondition(
					{
						field,
						operator: element.visible.operator,
						value: element.visible.value,
					},
					context,
				)
			)
				return null;
		}

		const key = p<string>(element, "id") || `${elementId}-${index}`;

		const renderChildren = () =>
			(element.children || []).map((childId, i) =>
				renderElement(childId, i, context, onInputChange),
			);

		// Resolve type (normalize aliases)
		let type = element.type;

		// Stack direction-aware alias
		if (type === "Stack") {
			const dir = p<string>(element, "direction", "vertical");
			type = dir === "horizontal" ? "Row" : "Column";
		}

		// Type alias map
		const typeAliases: Record<string, string> = {
			Heading: "Text",
			Paragraph: "Text",
			Label: "Text",
			TextInput: "Input",
			TextField: "Input",
			Dropdown: "Select",
			Container: "Column",
			Box: "Column",
			Section: "Column",
			Group: "Column",
			VStack: "Column",
			HStack: "Row",
			Divider: "Separator",
			Hr: "Separator",
			Img: "Image",
		};
		type = typeAliases[type] || type;

		switch (type) {
			case "Text":
				return <TextRenderer key={key} el={element} />;
			case "Stat":
				return <StatRenderer key={key} el={element} />;
			case "Input":
				return (
					<InputRenderer
						key={key}
						el={element}
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
						el={element}
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
						el={element}
						disabled={disabled}
						onClick={() => {
							const opensDialog = p<string>(element, "opensDialog");
							const action =
								p<string>(element, "action") ||
								(element.on?.press?.action as string | undefined) ||
								(element.on?.click?.action as string | undefined);
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
					<CardRenderer key={key} el={element}>
						{renderChildren()}
					</CardRenderer>
				);
			case "Row":
				return (
					<RowRenderer key={key} el={element}>
						{renderChildren()}
					</RowRenderer>
				);
			case "Column":
				return (
					<ColumnRenderer key={key} el={element}>
						{renderChildren()}
					</ColumnRenderer>
				);
			case "Form": {
				const submitAction = p<string>(element, "submitAction", "");
				return (
					<FormRenderer
						key={key}
						el={element}
						onSubmit={() => handleAction(submitAction, formData)}
					>
						{renderChildren()}
					</FormRenderer>
				);
			}
			case "Table":
				return <TableRenderer key={key} el={element} />;
			case "Diagram":
				return <DiagramRenderer key={key} el={element} />;
			case "Separator":
				return <DividerRenderer key={key} el={element} />;
			case "Image":
				return <ImageRenderer key={key} el={element} />;
			case "Badge":
				return <BadgeRenderer key={key} el={element} />;
			case "Alert":
				return <AlertRenderer key={key} el={element} />;
			case "Link":
				return <LinkRenderer key={key} el={element} />;
			case "Progress":
				return <ProgressRenderer key={key} el={element} />;
			case "List":
				return <ListRenderer key={key} el={element} />;
			default:
				// Graceful fallback: render children if they exist
				if (element.children?.length) {
					return <div key={key}>{renderChildren()}</div>;
				}
				return null;
		}
	};

	// Resolve current open dialog
	const currentDialogElementId =
		openDialogId && parsed.dialogs ? parsed.dialogs[openDialogId] : null;
	const currentDialog = currentDialogElementId
		? elements[currentDialogElementId]
		: null;

	// Empty schema check
	if (
		rootElement.type === "Column" &&
		(!rootElement.children || rootElement.children.length === 0)
	) {
		return null;
	}

	return (
		<SchemaErrorBoundary>
			<div className="schema-renderer space-y-3 w-full overflow-hidden">
				{rootElement.type === "Column" && rootElement.children
					? rootElement.children.map((childId, i) =>
							renderElement(childId, i),
						)
					: renderElement(parsed.root, 0)}
			</div>

			{/* Dialog rendering */}
			{currentDialog && currentDialogElementId && (
				<ModalRenderer
					dialog={currentDialog}
					dialogElementId={currentDialogElementId}
					open={!!openDialogId}
					onClose={handleCloseDialog}
					onSubmit={handleDialogSubmit}
					renderElement={(childId, index) =>
						renderElement(
							childId,
							index,
							modalFormData,
							handleModalInputChange,
						)
					}
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

// ============================================================================
// Sub-Renderers (each takes UIElement directly)
// ============================================================================

function TextRenderer({ el }: { el: UIElement }) {
	const content = p<string>(el, "content") || p<string>(el, "text", "");
	const variant = p<string>(el, "variant", "default");
	const className = p<string>(el, "className", "");

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
		<div className={`${variants[variant] || variants.default} ${className}`}>
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
				{content}
			</ReactMarkdown>
		</div>
	);
}

function StatRenderer({ el }: { el: UIElement }) {
	const label = p<string>(el, "label", "");
	const value = p<string | number>(el, "value", "");
	const change = p<string>(el, "change");
	const changeType = p<string>(el, "changeType", "neutral");
	const className = p<string>(el, "className", "");

	const changeColors: Record<string, string> = {
		positive: "text-green-600",
		negative: "text-red-600",
		neutral: "text-muted-foreground",
	};

	return (
		<div
			className={`p-4 rounded-lg border bg-card flex-1 min-w-0 ${className}`}
		>
			<div className="text-xs text-muted-foreground uppercase tracking-wide">
				{label}
			</div>
			<div className="text-2xl font-bold mt-1">{value}</div>
			{change && (
				<div className={`text-xs mt-1 ${changeColors[changeType] || ""}`}>
					{change}
				</div>
			)}
		</div>
	);
}

function InputRenderer({
	el,
	value,
	onChange,
	disabled,
}: {
	el: UIElement;
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
}) {
	const name = p<string>(el, "name", "");
	const label = p<string>(el, "label");
	const placeholder = p<string>(el, "placeholder");
	const inputType = p<string>(el, "inputType") || p<string>(el, "type", "text");
	const required = p<boolean>(el, "required");
	const className = p<string>(el, "className", "");

	const InputEl = inputType === "textarea" ? Textarea : Input;

	return (
		<div className={`space-y-1.5 ${className}`}>
			{label && <Label htmlFor={name}>{label}</Label>}
			<InputEl
				id={name}
				name={name}
				type={inputType}
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				required={required}
				disabled={disabled}
			/>
		</div>
	);
}

function SelectRenderer({
	el,
	value,
	onChange,
	disabled,
}: {
	el: UIElement;
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
}) {
	const label = p<string>(el, "label");
	const placeholder = p<string>(el, "placeholder", "Select...");
	const options = p<Array<{ label: string; value: string }>>(
		el,
		"options",
		[],
	);
	const className = p<string>(el, "className", "");

	return (
		<div className={`space-y-1.5 ${className}`}>
			{label && <Label>{label}</Label>}
			<Select value={value} onValueChange={onChange} disabled={disabled}>
				<SelectTrigger>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((opt) => (
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
	el,
	onClick,
	disabled,
}: {
	el: UIElement;
	onClick: () => void;
	disabled?: boolean;
}) {
	const label = p<string>(el, "label", "");
	const variantMap: Record<string, string> = {
		primary: "default",
		danger: "destructive",
	};
	const rawVariant = p<string>(el, "variant", "default");
	const variant = (variantMap[rawVariant] || rawVariant) as
		| "default"
		| "destructive"
		| "outline"
		| "secondary"
		| "ghost";
	const elDisabled = p<boolean>(el, "disabled");
	const className = p<string>(el, "className");

	return (
		<Button
			variant={variant}
			disabled={disabled || elDisabled}
			onClick={onClick}
			className={className}
		>
			{label}
		</Button>
	);
}

function CardRenderer({
	el,
	children,
}: {
	el: UIElement;
	children: React.ReactNode;
}) {
	const title = p<string>(el, "title");
	const description = p<string>(el, "description");
	const className = p<string>(el, "className", "");

	return (
		<Card className={`w-full overflow-hidden ${className}`}>
			{(title || description) && (
				<CardHeader className="pb-3">
					{title && <CardTitle className="text-base">{title}</CardTitle>}
					{description && <CardDescription>{description}</CardDescription>}
				</CardHeader>
			)}
			<CardContent className="space-y-3">{children}</CardContent>
		</Card>
	);
}

const gapMap: Record<string, number> = {
	xs: 4,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 24,
};

function resolveGap(el: UIElement): number {
	const raw = el.props?.gap;
	if (typeof raw === "string") return gapMap[raw] ?? 12;
	return (raw as number) ?? 12;
}

function RowRenderer({
	el,
	children,
}: {
	el: UIElement;
	children: React.ReactNode;
}) {
	const gap = resolveGap(el);
	const className = p<string>(el, "className", "");

	return (
		<div
			className={`flex flex-wrap items-start w-full overflow-hidden ${className}`}
			style={{ gap }}
		>
			{children}
		</div>
	);
}

function ColumnRenderer({
	el,
	children,
}: {
	el: UIElement;
	children: React.ReactNode;
}) {
	const gap = resolveGap(el);
	const className = p<string>(el, "className", "");

	return (
		<div className={`flex flex-col ${className}`} style={{ gap }}>
			{children}
		</div>
	);
}

function FormRenderer({
	el,
	children,
	onSubmit,
}: {
	el: UIElement;
	children: React.ReactNode;
	onSubmit: () => void;
}) {
	const submitLabel = p<string>(el, "submitLabel", "Submit");
	const className = p<string>(el, "className", "");

	return (
		<form
			className={`space-y-4 ${className}`}
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit();
			}}
		>
			{children}
			<Button type="submit">{submitLabel}</Button>
		</form>
	);
}

function TableRenderer({ el }: { el: UIElement }) {
	const columns = p<Array<{ key: string; label: string }>>(
		el,
		"columns",
		[],
	);
	const rows = p<Array<Record<string, string | number>>>(el, "rows", []);
	const className = p<string>(el, "className", "");

	return (
		<div className={`rounded-md border w-full overflow-x-auto ${className}`}>
			<table className="w-full text-sm min-w-0">
				<thead>
					<tr className="border-b bg-muted/50">
						{columns.map((col) => (
							<th key={col.key} className="px-3 py-2 text-left font-medium">
								{col.label}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, i) => (
						<tr key={i} className="border-b last:border-0">
							{columns.map((col) => (
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

function DiagramRenderer({ el }: { el: UIElement }) {
	return (
		<MermaidRenderer
			code={p<string>(el, "code", "")}
			title={p<string>(el, "title")}
			expandable={p<boolean>(el, "expandable")}
			className={p<string>(el, "className")}
		/>
	);
}

function DividerRenderer({ el }: { el: UIElement }) {
	const spacing = p<string>(el, "spacing", "md");
	const className = p<string>(el, "className", "");

	const spacingClasses: Record<string, string> = {
		sm: "my-2",
		md: "my-4",
		lg: "my-6",
	};

	return (
		<hr
			className={`border-t border-border ${spacingClasses[spacing] || spacingClasses.md} ${className}`}
		/>
	);
}

// ============================================================================
// New Sub-Renderers (json-render.dev compatibility)
// ============================================================================

function ImageRenderer({ el }: { el: UIElement }) {
	const src = p<string>(el, "src", "");
	const alt = p<string>(el, "alt", "");
	const width = p<number | string>(el, "width");
	const height = p<number | string>(el, "height");
	const className = p<string>(el, "className", "");

	if (!src) return null;
	return (
		<img
			src={src}
			alt={alt}
			width={width}
			height={height}
			className={`max-w-full ${className}`}
		/>
	);
}

function BadgeRenderer({ el }: { el: UIElement }) {
	const text = p<string>(el, "text") || p<string>(el, "label", "");
	const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
		success: "default",
		warning: "secondary",
		destructive: "destructive",
		default: "default",
	};
	const rawVariant = p<string>(el, "variant", "default");
	const variant = variantMap[rawVariant] || "default";
	const className = p<string>(el, "className", "");

	return (
		<Badge variant={variant} className={className}>
			{text}
		</Badge>
	);
}

function AlertRenderer({ el }: { el: UIElement }) {
	const title = p<string>(el, "title");
	const message = p<string>(el, "message") || p<string>(el, "text", "");
	const rawVariant = p<string>(el, "variant", "default");
	const variant = rawVariant === "destructive" || rawVariant === "warning"
		? "destructive"
		: "default";
	const className = p<string>(el, "className", "");

	return (
		<Alert variant={variant} className={className}>
			{rawVariant === "info" && <Info className="h-4 w-4" />}
			{(rawVariant === "destructive" || rawVariant === "warning") && (
				<AlertCircle className="h-4 w-4" />
			)}
			{title && <AlertTitle>{title}</AlertTitle>}
			{message && <AlertDescription>{message}</AlertDescription>}
		</Alert>
	);
}

function LinkRenderer({ el }: { el: UIElement }) {
	const href = p<string>(el, "href", "#");
	const text = p<string>(el, "text") || p<string>(el, "label", href);
	const target = p<string>(el, "target");
	const className = p<string>(el, "className", "");

	return (
		<a
			href={href}
			target={target}
			rel={target === "_blank" ? "noopener noreferrer" : undefined}
			className={`text-primary underline underline-offset-4 hover:text-primary/80 inline-flex items-center gap-1 ${className}`}
		>
			{text}
			{target === "_blank" && <ExternalLink className="h-3 w-3" />}
		</a>
	);
}

function ProgressRenderer({ el }: { el: UIElement }) {
	const value = p<number>(el, "value", 0);
	const max = p<number>(el, "max", 100);
	const label = p<string>(el, "label");
	const className = p<string>(el, "className", "");
	const pct = Math.round((value / max) * 100);

	return (
		<div className={`space-y-1.5 ${className}`}>
			{label && (
				<div className="flex justify-between text-sm">
					<span>{label}</span>
					<span className="text-muted-foreground">{pct}%</span>
				</div>
			)}
			<Progress value={pct} />
		</div>
	);
}

function ListRenderer({ el }: { el: UIElement }) {
	const items = p<string[]>(el, "items", []);
	const ordered = p<boolean>(el, "ordered", false);
	const className = p<string>(el, "className", "");
	const Tag = ordered ? "ol" : "ul";
	const listStyle = ordered ? "list-decimal" : "list-disc";

	return (
		<Tag className={`${listStyle} list-inside text-sm space-y-1 ${className}`}>
			{items.map((item, i) => (
				<li key={i}>{item}</li>
			))}
		</Tag>
	);
}

// ============================================================================
// Modal Renderer
// ============================================================================

const modalSizeClasses: Record<string, string> = {
	sm: "sm:max-w-sm",
	md: "sm:max-w-md",
	lg: "sm:max-w-lg",
	xl: "sm:max-w-xl",
	full: "sm:max-w-[95vw] sm:max-h-[95vh] w-[95vw] h-[95vh]",
};

function ModalRenderer({
	dialog,
	dialogElementId: _dialogElementId,
	open,
	onClose,
	onSubmit,
	renderElement,
}: {
	dialog: UIElement;
	dialogElementId: string;
	open: boolean;
	onClose: () => void;
	onSubmit: (action: string, title: string) => void;
	renderElement: (childId: string, index: number) => React.ReactNode;
}) {
	const title = p<string>(dialog, "title", "");
	const description = p<string>(dialog, "description");
	const size = p<string>(dialog, "size", "full");
	const submitAction = p<string>(dialog, "submitAction");
	const submitLabel = p<string>(dialog, "submitLabel", "Submit");
	const cancelLabel = p<string>(dialog, "cancelLabel", "Cancel");
	const submitVariant = p<string>(dialog, "submitVariant", "default") as
		| "default"
		| "destructive"
		| "outline"
		| "secondary"
		| "ghost";

	const sizeClass = modalSizeClasses[size] || modalSizeClasses.full;

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
			<DialogContent
				className={`${sizeClass} flex flex-col`}
				showCloseButton={true}
			>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && (
						<DialogDescription>{description}</DialogDescription>
					)}
				</DialogHeader>

				<div className="flex-1 overflow-y-auto space-y-4 py-4">
					{(dialog.children || []).map((childId, index) =>
						renderElement(childId, index),
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						{cancelLabel}
					</Button>
					{submitAction && (
						<Button
							variant={submitVariant}
							onClick={() => onSubmit(submitAction, title)}
						>
							{submitLabel}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default SchemaRenderer;
