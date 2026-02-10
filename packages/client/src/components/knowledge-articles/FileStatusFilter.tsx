import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FILE_STATUS } from "@/lib/constants";

interface FileStatusFilterProps {
	/** Currently selected status filter value */
	value: string;
	/** Callback when filter selection changes */
	onChange: (value: string) => void;
}

export function FileStatusFilter({ value, onChange }: FileStatusFilterProps) {
	const { t } = useTranslation("kbs");

	const displayValue =
		value === "All"
			? t("filters.all")
			: value.charAt(0).toUpperCase() + value.slice(1);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">
					{t("filters.status")} {displayValue}
					<ChevronDown className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem onSelect={() => onChange("All")}>
					{t("filters.allStatus")}
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={() => onChange(FILE_STATUS.PROCESSED)}>
					{t("status.processed")}
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={() => onChange(FILE_STATUS.PROCESSING)}>
					{t("status.processing")}
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={() => onChange(FILE_STATUS.FAILED)}>
					{t("status.failed")}
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={() => onChange(FILE_STATUS.UPLOADED)}>
					{t("status.uploaded")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
