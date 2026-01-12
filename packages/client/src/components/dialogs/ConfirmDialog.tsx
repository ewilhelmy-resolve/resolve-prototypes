import { useTranslation } from "react-i18next";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	onConfirm: () => void;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: "default" | "destructive";
}

/**
 * Reusable confirmation dialog component
 * Uses AlertDialog for accessibility and proper modal behavior
 */
export default function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	onConfirm,
	confirmLabel,
	cancelLabel,
	variant = "default",
}: ConfirmDialogProps) {
	const { t } = useTranslation("common");
	const resolvedConfirmLabel = confirmLabel ?? t("actions.confirm");
	const resolvedCancelLabel = cancelLabel ?? t("actions.cancel");
	const handleConfirm = () => {
		onConfirm();
		onOpenChange(false);
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{resolvedCancelLabel}</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleConfirm}
						className={
							variant === "destructive"
								? "bg-destructive text-white hover:bg-destructive/90"
								: "bg-primary hover:bg-primary/90"
						}
					>
						{resolvedConfirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
