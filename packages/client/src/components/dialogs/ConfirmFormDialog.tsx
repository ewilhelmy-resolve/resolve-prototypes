import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, type UseFormReturn, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface ConfirmFormDialogProps {
	/** Trigger element (usually a button) */
	trigger: React.ReactNode;
	/** Dialog title */
	title: string;
	/** Dialog description */
	description: string;
	/** Form content - accepts either ReactNode or function that receives form methods */
	children?: React.ReactNode | ((form: UseFormReturn<any>) => React.ReactNode);
	/** Label for the confirmation action button */
	actionLabel?: string;
	/** Callback when user confirms - receives form data */
	onConfirm: (data: Record<string, any>) => void;
	/** Callback when dialog closes (cancel or after confirm) - receives form data and confirmed status */
	onClose?: (data: {
		formData: Record<string, any>;
		confirmed: boolean;
	}) => void;
	/** Callback when dialog open state changes */
	onOpenChange?: (open: boolean) => void;
	/** Whether the dialog is open (controlled) */
	open?: boolean;
	/** Variant for the action button */
	actionVariant?: "default" | "destructive";
	/** Zod schema for form validation */
	validationSchema: z.ZodType<any>;
	/** Default values for the form */
	defaultValues?: Record<string, any>;
}

/**
 * ConfirmFormDialog - Flexible confirmation dialog with Zod form validation
 * Accepts children for complete control over form content
 *
 * @example
 * // Simple text confirmation
 * const schema = z.object({
 *   confirmText: z.string().refine(val => val === "delete", {
 *     message: "Must type 'delete' to confirm"
 *   })
 * });
 *
 * <ConfirmFormDialog
 *   trigger={<Button variant="destructive">Delete</Button>}
 *   title="Delete Account"
 *   description="This action cannot be undone."
 *   validationSchema={schema}
 *   defaultValues={{ confirmText: "" }}
 *   onConfirm={(data) => handleDelete()}
 * >
 *   <div className="flex flex-col gap-2">
 *     <Label htmlFor="confirmText">Type "delete" to confirm</Label>
 *     <Input id="confirmText" {...form.register("confirmText")} />
 *   </div>
 * </ConfirmFormDialog>
 *
 * @example
 * // Complex form with checkboxes and input
 * const schema = z.object({
 *   permanent: z.boolean().refine(val => val === true),
 *   data: z.boolean().refine(val => val === true),
 *   confirmText: z.string().refine(val => val.toLowerCase() === "delete")
 * });
 *
 * <ConfirmFormDialog
 *   trigger={<Button variant="destructive">Delete Account</Button>}
 *   title="Delete your account"
 *   description="This action cannot be undone."
 *   validationSchema={schema}
 *   defaultValues={{ permanent: false, data: false, confirmText: "" }}
 *   actionLabel="Delete Account"
 *   actionVariant="destructive"
 *   onConfirm={(data) => {
 *     console.log("Form data:", data);
 *     handleDelete();
 *   }}
 * >
 *   {(form) => (
 *     <div className="flex flex-col gap-6 py-4">
 *       <div className="flex flex-col gap-4">
 *         <div className="flex items-start gap-3">
 *           <Checkbox
 *             id="permanent"
 *             {...form.register("permanent")}
 *             checked={form.watch("permanent")}
 *             onCheckedChange={(checked) => form.setValue("permanent", checked === true)}
 *           />
 *           <label htmlFor="permanent">I understand this is permanent</label>
 *         </div>
 *         <div className="flex items-start gap-3">
 *           <Checkbox
 *             id="data"
 *             {...form.register("data")}
 *             checked={form.watch("data")}
 *             onCheckedChange={(checked) => form.setValue("data", checked === true)}
 *           />
 *           <label htmlFor="data">I understand my data will be deleted</label>
 *         </div>
 *       </div>
 *
 *       <div className="flex flex-col gap-2">
 *         <Label htmlFor="confirmText">Type "delete" to confirm</Label>
 *         <Input id="confirmText" {...form.register("confirmText")} />
 *       </div>
 *     </div>
 *   )}
 * </ConfirmFormDialog>
 */
export function ConfirmFormDialog({
	trigger,
	title,
	description,
	children,
	actionLabel,
	onConfirm,
	onClose,
	onOpenChange,
	open: controlledOpen,
	actionVariant = "default",
	validationSchema,
	defaultValues = {},
}: ConfirmFormDialogProps) {
	const { t } = useTranslation("common");
	const [internalOpen, setInternalOpen] = useState(false);
	const resolvedActionLabel = actionLabel ?? t("actions.confirm");

	const form = useForm({
		resolver: zodResolver(validationSchema as any),
		mode: "onChange",
		defaultValues,
	});

	const {
		formState: { isValid },
		reset,
	} = form;

	// Use controlled open state if provided, otherwise use internal state
	const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
	const setIsOpen = (open: boolean) => {
		if (controlledOpen === undefined) {
			setInternalOpen(open);
		}
		onOpenChange?.(open);
	};

	// Reset state when dialog closes
	const handleOpenChange = (open: boolean) => {
		const wasOpen = isOpen;
		setIsOpen(open);

		// If dialog is closing, call onClose with form data
		if (wasOpen && !open) {
			const formData = form.getValues();
			onClose?.({ formData, confirmed: false });
			reset();
		}
	};

	const handleConfirm = (e: React.MouseEvent) => {
		if (!isValid) {
			e.preventDefault();
			return;
		}

		const formData = form.getValues();
		onConfirm(formData);
		onClose?.({ formData, confirmed: true });
		setIsOpen(false);
	};

	return (
		<AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>

				{children && (
					<FormProvider {...form}>
						<form>
							{typeof children === "function" ? children(form) : children}
						</form>
					</FormProvider>
				)}

				<AlertDialogFooter>
					<AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
					<AlertDialogAction
						disabled={!isValid}
						className={!isValid ? "opacity-50" : ""}
						onClick={handleConfirm}
						{...(actionVariant === "destructive" && {
							className: `bg-destructive hover:bg-destructive/90 ${!isValid ? "opacity-50" : ""}`,
						})}
					>
						{resolvedActionLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
