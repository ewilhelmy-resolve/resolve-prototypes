import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FILE_SOURCE, FILE_SOURCE_DISPLAY_NAMES } from "@/lib/constants";

interface FileSourceFilterProps {
	/** Currently selected source filter value */
	value: string;
	/** Callback when filter selection changes */
	onChange: (value: string) => void;
}

export function FileSourceFilter({ value, onChange }: FileSourceFilterProps) {
	const { t } = useTranslation("kbs");

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">
					{t("filters.source")} {value === "All" ? t("filters.all") : value}
					<ChevronDown className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem onSelect={() => onChange("All")}>
					{t("filters.allSources")}
				</DropdownMenuItem>
				<DropdownMenuItem
					onSelect={() =>
						onChange(FILE_SOURCE_DISPLAY_NAMES[FILE_SOURCE.MANUAL])
					}
				>
					{FILE_SOURCE_DISPLAY_NAMES[FILE_SOURCE.MANUAL]}
				</DropdownMenuItem>
				<DropdownMenuItem
					onSelect={() =>
						onChange(FILE_SOURCE_DISPLAY_NAMES[FILE_SOURCE.CONFLUENCE])
					}
				>
					{FILE_SOURCE_DISPLAY_NAMES[FILE_SOURCE.CONFLUENCE]}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
