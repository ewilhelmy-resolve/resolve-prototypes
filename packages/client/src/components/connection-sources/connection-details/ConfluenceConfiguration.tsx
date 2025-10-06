"use client";

import { EllipsisVertical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConnectionSource } from "@/contexts/ConnectionSourceContext";
import { Label } from "../../ui/label";
import { MultiSelect, type MultiSelectOption } from "../../ui/multi-select";
import { ConnectionStatusCard } from "../ConnectionStatusCard";
import FormSectionTitle from "../form-elements/FormSectionTitle";

export default function ConfluenceConfiguration() {
	const { source } = useConnectionSource();
	const [selectedSpaces, setSelectedSpaces] = useState<string[]>(
		source.config?.spaces || [],
	);
	const CONFLUENCE_SPACES: MultiSelectOption[] = [
		{ label: "Architecture Team", value: "architecture" },
		{ label: "Knowledge Base", value: "knowledge" },
		{ label: "Engineering", value: "engineering" },
		{ label: "Product Team", value: "product" },
		{ label: "Sales and Marketing", value: "sales" },
		{ label: "Design", value: "design" },
		{ label: "IT", value: "it" },
	];

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
							<DropdownMenuItem className="text-destructive">
								Disconnect
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<ConnectionStatusCard source={source} />

				<div className="flex flex-col gap-1">
					<div className="border border-border bg-popover rounded-md p-4">
						<div className="rounded-lg">
							<Label className="mb-2">
								Which spaces would you like to sync from?
							</Label>
							<div className="flex items-start gap-4">
								<div className="flex-1">
									<MultiSelect
										animationConfig={{ optionHoverAnimation: "none" }}
										options={CONFLUENCE_SPACES}
										defaultValue={selectedSpaces}
										onValueChange={(values) => {
											setSelectedSpaces(values);
											console.log("Spaces updated:", values);
											// TODO: Implement API call to update spaces
										}}
										placeholder="Choose spaces..."
										searchable={true}
										emptyIndicator="No spaces found."
									/>
								</div>
								<Button variant="default">
									Sync
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
