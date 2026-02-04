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
import { toast } from "../../lib/toast";
import type {
	ButtonComponent,
	CardComponent,
	ColumnComponent,
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
	UISchema,
} from "../../types/uiSchema";
import { evaluateCondition, validateUISchema } from "../../types/uiSchema";
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
	const [modalFormData, setModalFormData] = useState<Record<string, string>>(
		{},
	);
	const [openModalId, setOpenModalId] = useState<string | null>(null);
	const [actionLog, setActionLog] = useState<
		Array<{ action: string; data: Record<string, unknown>; timestamp: string }>
	>([]);
	const [showLogPanel, setShowLogPanel] = useState(false);

	// Track pending modal submission handler for cross-origin postMessage
	const pendingModalSubmitRef = useRef<{
		action: string;
		modalTitle: string;
	} | null>(null);

	// Track auto-open modal (ref defined early to satisfy hook rules)
	const autoOpenedRef = useRef<string | null>(null);
	const handleOpenModalRef = useRef<
		| ((modalId: string, options?: { preventBackdropClose?: boolean }) => void)
		| null
	>(null);

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

	// Auto-open modal if specified in schema (for forced credential prompts, etc.)
	// Effect defined before early return to satisfy hook rules; uses ref to access handleOpenModal
	// Uses setTimeout to ensure handleOpenModalRef is populated from current render
	useEffect(() => {
		const modalId = schema?.autoOpenModal;
		console.log("[SchemaRenderer] Auto-open effect:", {
			modalId,
			alreadyOpened: autoOpenedRef.current,
			hasHandler: !!handleOpenModalRef.current,
		});
		if (!modalId || autoOpenedRef.current === modalId) return;

		// Use setTimeout to run after current render completes and ref is populated
		const timer = setTimeout(() => {
			console.log("[SchemaRenderer] Auto-open timeout fired:", {
				modalId,
				alreadyOpened: autoOpenedRef.current,
				hasHandler: !!handleOpenModalRef.current,
			});
			if (handleOpenModalRef.current && autoOpenedRef.current !== modalId) {
				console.log("[SchemaRenderer] Calling handleOpenModal for:", modalId);
				autoOpenedRef.current = modalId;
				// Auto-opened modals prevent backdrop close (forced mode)
				handleOpenModalRef.current(modalId, { preventBackdropClose: true });
			}
		}, 100);
		return () => clearTimeout(timer);
	}, [schema?.autoOpenModal]);

	// Validate schema (JAR-81)
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

	const handleOpenModal = (
		modalId: string,
		options?: { preventBackdropClose?: boolean },
	) => {
		console.log("[SchemaRenderer] handleOpenModal called:", {
			modalId,
			hasModals: !!schema.modals,
			modalIds: schema.modals ? Object.keys(schema.modals) : [],
			isInIframe: isInIframe(),
			preventBackdropClose: options?.preventBackdropClose,
		});
		const modal = schema.modals?.[modalId];
		if (!modal) {
			console.log("[SchemaRenderer] Modal not found:", modalId);
			return;
		}

		// In iframe context, open modal in host page
		if (isInIframe()) {
			const fields: FormModalField[] = [];
			for (const c of modal.children) {
				if (c.type === "input") {
					fields.push({
						type: c.inputType === "textarea" ? "textarea" : "input",
						name: c.name,
						label: c.label,
						placeholder: c.placeholder,
						inputType: c.inputType,
						defaultValue: c.defaultValue,
					});
				} else if (c.type === "select") {
					fields.push({
						type: "select",
						name: c.name,
						label: c.label,
						placeholder: c.placeholder,
						options: c.options,
						defaultValue: c.defaultValue,
					});
				}
			}

			// Set pending ref for cross-origin postMessage handling
			if (modal.submitAction) {
				pendingModalSubmitRef.current = {
					action: modal.submitAction,
					modalTitle: modal.title,
				};
			}

			openFormModal({
				title: modal.title,
				description: modal.description,
				size: modal.size || "full",
				fields,
				submitLabel: modal.submitLabel,
				cancelLabel: modal.cancelLabel,
				submitVariant:
					modal.submitVariant === "destructive" ? "destructive" : "default",
				preventBackdropClose: options?.preventBackdropClose,
				onSubmit: (data) => {
					// Same-origin: callback is called directly
					pendingModalSubmitRef.current = null;

					if (modal.submitAction) {
						const logEntry = {
							action: modal.submitAction,
							data: data as Record<string, unknown>,
							timestamp: new Date().toISOString(),
						};
						setActionLog((prev) => [logEntry, ...prev]);
						handleAction(modal.submitAction, data);

						toast.success(`${modal.title} saved`, {
							description: `Action: ${modal.submitAction}`,
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
		setModalFormData({}); // Reset modal form data
		setOpenModalId(modalId);
	};

	// Populate ref for auto-open effect (after handleOpenModal is defined)
	handleOpenModalRef.current = handleOpenModal;

	const handleCloseModal = () => {
		setOpenModalId(null);
		setModalFormData({});
	};

	const handleModalSubmit = (action: string, modalTitle: string) => {
		const logEntry = {
			action,
			data: modalFormData as Record<string, unknown>,
			timestamp: new Date().toISOString(),
		};
		setActionLog((prev) => [logEntry, ...prev]);
		handleAction(action, modalFormData);
		handleCloseModal();

		toast.success(`${modalTitle} saved`, {
			description: `Action: ${action}`,
			action: {
				label: "View Log",
				onClick: () => setShowLogPanel(true),
			},
		});
	};

	const renderComponent = (
		component: UIComponent,
		index: number,
	): React.ReactNode => {
		// Check conditional rendering
		if (!evaluateCondition(component.if, formData)) {
			return null;
		}

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
						onClick={() => {
							if (component.opensModal) {
								handleOpenModal(component.opensModal);
							} else if (component.action) {
								handleAction(component.action);
							}
						}}
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

			case "diagram":
				return (
					<DiagramRenderer
						key={key}
						component={component as DiagramComponent}
					/>
				);

			case "divider":
				return (
					<DividerRenderer
						key={key}
						component={component as DividerComponent}
					/>
				);

			default:
				return (
					<div key={key} className="text-sm text-muted-foreground">
						Unknown component type: {(component as UIComponent).type}
					</div>
				);
		}
	};

	// Render modal content components
	const renderModalComponent = (
		component: UIComponent,
		index: number,
	): React.ReactNode => {
		if (!evaluateCondition(component.if, modalFormData)) {
			return null;
		}

		const key = component.id || `modal-${component.type}-${index}`;

		switch (component.type) {
			case "text":
				return <TextRenderer key={key} component={component} />;
			case "input":
				return (
					<InputRenderer
						key={key}
						component={component}
						value={modalFormData[component.name] || ""}
						onChange={(value) => handleModalInputChange(component.name, value)}
					/>
				);
			case "select":
				return (
					<SelectRenderer
						key={key}
						component={component}
						value={modalFormData[component.name] || ""}
						onChange={(value) => handleModalInputChange(component.name, value)}
					/>
				);
			case "row":
				return (
					<RowRenderer key={key} component={component}>
						{component.children.map((child, i) =>
							renderModalComponent(child, i),
						)}
					</RowRenderer>
				);
			case "column":
				return (
					<ColumnRenderer key={key} component={component}>
						{component.children.map((child, i) =>
							renderModalComponent(child, i),
						)}
					</ColumnRenderer>
				);
			default:
				return renderComponent(component, index);
		}
	};

	// Get current open modal definition
	const currentModal =
		openModalId && schema.modals ? schema.modals[openModalId] : null;

	if (!schema?.components?.length) {
		return null;
	}

	return (
		<SchemaErrorBoundary>
			<div className="schema-renderer space-y-3 w-full overflow-hidden">
				{schema.components.map((component, index) =>
					renderComponent(component, index),
				)}
			</div>

			{/* Modal rendering */}
			{currentModal && (
				<ModalRenderer
					modal={currentModal}
					open={!!openModalId}
					onClose={handleCloseModal}
					onSubmit={handleModalSubmit}
					renderComponent={renderModalComponent}
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
}: {
	modal: ModalDefinition;
	open: boolean;
	onClose: () => void;
	onSubmit: (action: string, title: string) => void;
	renderComponent: (component: UIComponent, index: number) => React.ReactNode;
}) {
	const sizeClass = modalSizeClasses[modal.size || "full"];

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
					{modal.children.map((child, index) => renderComponent(child, index))}
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
