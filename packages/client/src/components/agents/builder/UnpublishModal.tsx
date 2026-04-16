/**
 * UnpublishModal - Confirmation modal for unpublishing an agent
 */

import { useTranslation } from "react-i18next";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface UnpublishModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}

export function UnpublishModal({
	open,
	onOpenChange,
	onConfirm,
}: UnpublishModalProps) {
	const { t } = useTranslation("agents");

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="sm:max-w-md">
				<AlertDialogHeader>
					<AlertDialogTitle>{t("unpublishModal.title")}</AlertDialogTitle>
					<AlertDialogDescription>
						{t("unpublishModal.description")}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t("unpublishModal.cancel")}</AlertDialogCancel>
					<Button variant="destructive" onClick={onConfirm}>
						{t("unpublishModal.unpublish")}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
