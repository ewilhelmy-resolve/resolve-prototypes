import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusAlert } from "@/components/ui/status-alert";

/** Field prediction data for auto-populate */
export interface FieldPrediction {
	/** Field display name */
	label: string;
	/** Current value (may be empty) */
	currentValue: string | null;
	/** AI predicted value */
	predictedValue: string;
}

interface EnableAutoPopulateSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Field predictions to display */
	predictions?: FieldPrediction[];
	/** Called when user confirms enabling auto-populate */
	onEnable?: () => void;
}

/** Default mock predictions for demo */
const DEFAULT_PREDICTIONS: FieldPrediction[] = [
	{ label: "Category", currentValue: "General Inquiry", predictedValue: "Email Signature" },
	{ label: "Sub Category", currentValue: null, predictedValue: "Applications" },
	{ label: "Priority", currentValue: null, predictedValue: "Low" },
	{ label: "CI", currentValue: null, predictedValue: "Active Directory" },
	{ label: "Business Service", currentValue: null, predictedValue: "Identity Management" },
];

/**
 * Sheet for enabling Auto-Populate feature
 *
 * Displays a table showing current vs predicted values for ticket fields.
 * Uses StatusAlert for info message about prediction data sources.
 */
export function EnableAutoPopulateSheet({
	open,
	onOpenChange,
	predictions = DEFAULT_PREDICTIONS,
	onEnable,
}: EnableAutoPopulateSheetProps) {
	const { t } = useTranslation(["tickets", "common"]);

	const handleEnable = () => {
		console.log("Auto-Populate enabled");
		onEnable?.();
		onOpenChange(false);
	};

	const handleCancel = () => {
		onOpenChange(false);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full sm:max-w-lg flex flex-col p-8" side="right">
				<SheetHeader className="pl-0">
					<SheetTitle>{t("autoPopulate.title")}</SheetTitle>
					<SheetDescription>
						{t("autoPopulate.description")}
					</SheetDescription>
				</SheetHeader>

				{/* Predictions Table */}
				<div className="flex-1 overflow-auto">
					{/* Header Row */}
					<div className="grid grid-cols-[140px_1fr_24px_1fr] gap-2 py-2 bg-muted/50 text-sm font-medium text-muted-foreground">
						<div>{t("autoPopulate.tableHeaders.type")}</div>
						<div>{t("autoPopulate.tableHeaders.currentValue")}</div>
						<div></div>
						<div>{t("autoPopulate.tableHeaders.predictedValue")}</div>
					</div>

					{/* Data Rows */}
					<div className="divide-y">
						{predictions.map((field) => (
							<div
								key={field.label}
								className="grid grid-cols-[140px_1fr_24px_1fr] gap-2 py-3 items-center text-sm"
							>
								<div className="font-medium">{field.label}</div>
								<div className="text-muted-foreground">
									{field.currentValue || "--"}
								</div>
								<div className="flex justify-center">
									<ArrowRight className="size-4 text-muted-foreground" />
								</div>
								<div className="font-medium">{field.predictedValue}</div>
							</div>
						))}
					</div>
				</div>

				{/* Info Alert */}
				<StatusAlert variant="info" title={t("autoPopulate.alert.title")}>
					{t("autoPopulate.alert.description")}
				</StatusAlert>

				<SheetFooter className="flex-row justify-end gap-2 p-0">
					<Button variant="outline" onClick={handleCancel}>
						{t("common:actions.cancel")}
					</Button>
					<Button onClick={handleEnable}>{t("autoPopulate.enable")}</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

export default EnableAutoPopulateSheet;
