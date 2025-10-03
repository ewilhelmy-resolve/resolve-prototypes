"use client";

import { EllipsisVertical, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import { ConnectionStatusBadge } from "../settings/ConnectionStatusBadge";
import { Label } from "../ui/label";
import { MultiSelectComboBox, type Option } from "../ui/multi-select-combobox";
import FormSectionTitle from "./FormSectionTitle";

export default function ConfluenceConfiguration() {
	const { source } = useConnectionSource();
	const [selectedSpaces, setSelectedSpaces] = useState<string[]>(
		source.config?.spaces || [],
	);
	const CONFLUENCE_SPACES: Option[] = [
		{ label: "Architecture Team", value: "architecture" },
		{ label: "Knowledge Base", value: "knowledge" },
		{ label: "Engineering", value: "engineering" },
		{ label: "Product Team", value: "product" },
		{ label: "Sales and Marketing", value: "sales" },
		{ label: "Design", value: "design" },
		{ label: "IT", value: "it" },
	];

	const handleSpacesChange = (spaces: string[]) => {
		setSelectedSpaces(spaces);
		console.log("Spaces updated:", spaces);
		// TODO: Implement API call to update spaces
	};

	return (
		<div className="w-full flex flex-col gap-2">
			<div className="flex flex-col gap-2.5">
				<div className="flex justify-between items-start gap-2">
					<FormSectionTitle title="Confluence configuration" />
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon">
								<EllipsisVertical className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem>Edit</DropdownMenuItem>
							<DropdownMenuItem className="text-destructive">Disconnect</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<div className="flex flex-col gap-1">
					<div className="border border-border bg-popover rounded-md p-4">
						<div className="grid grid-cols-[1.5fr_1fr_1fr] gap-4 rounded-lg items-center">
							<div className="flex flex-col gap-0 py-0.5">
								<div className="flex items-center gap-2">
									<small className="text-sm text-muted-foreground min-w-[60px]">
										URL
									</small>
									<small className="text-sm text-foreground truncate max-w-[200px]">
										{source.config?.url || "—"}
									</small>
								</div>
								<div className="flex items-center gap-2">
									<small className="text-sm text-muted-foreground min-w-[60px]">
										Email
									</small>
									<small className="text-sm text-foreground truncate max-w-[200px]">
										{source.config?.email || "—"}
									</small>
								</div>
								<div className="flex items-center gap-2">
									<small className="text-sm text-muted-foreground min-w-[60px]">
										API
									</small>
									<small className="text-sm text-foreground">
										••••••••••••••••••••
									</small>
								</div>
							</div>

							<div className="flex flex-col justify-center items-center py-0.5">
								<ConnectionStatusBadge status={source.status} />
							</div>

							<div className="flex flex-col justify-start py-0.5">
								<small className="text-sm text-foreground">
									{source.config?.updatedAt
										? `Updated at ${source.config.updatedAt}`
										: "—"}
								</small>
							</div>
						</div>
					</div>
				</div>

				<div className="flex flex-col gap-1">
					<div className="border border-border bg-popover rounded-md p-4">
						<div className="rounded-lg">
							<Label className="mb-2">
								Which spaces would you like to sync from?
							</Label>
							<div className="flex items-start gap-4">
								<div className="flex-1">
									<MultiSelectComboBox
										id="spaces"
										options={CONFLUENCE_SPACES}
										value={selectedSpaces}
										onChange={handleSpacesChange}
										placeholder="Choose spaces..."
										searchPlaceholder="Search spaces..."
										emptyText="No spaces found."
									/>
								</div>
								<Button variant="secondary" size="sm">
									<RefreshCw className="h-4 w-4 mr-2" />
									Refresh
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
