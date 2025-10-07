"use client";

import { EllipsisVertical } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
	const [selectedSpaces, setSelectedSpaces] = useState<string[]>([]);

	// Parse available spaces from latest_options (discovered during verification)
	const availableSpaces: MultiSelectOption[] = useMemo(() => {
		if (source.backendData?.latest_options?.spaces) {
			const spaces =
				typeof source.backendData.latest_options.spaces === "string"
					? source.backendData.latest_options.spaces
							.split(",")
							.map((s: string) => s.trim())
							.filter(Boolean)
					: [];
			return spaces.map((space) => ({ label: space, value: space }));
		}
		return [];
	}, [source.backendData?.latest_options?.spaces]);

	// Initialize selected spaces from settings.spaces (already configured)
	useEffect(() => {
		if (source.backendData?.settings?.spaces) {
			const spaces =
				typeof source.backendData.settings.spaces === "string"
					? source.backendData.settings.spaces
							.split(",")
							.map((s: string) => s.trim())
							.filter(Boolean)
					: [];
			setSelectedSpaces(spaces);
		}
	}, [source.backendData?.settings?.spaces]);

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
							<div className="flex flex-col md:flex-row items-start gap-4">
								<div className="md:flex-1 w-full">
									<MultiSelect
										animationConfig={{ optionHoverAnimation: "none" }}
										options={availableSpaces}
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
								<Button className="w-full md:w-fit" variant="default">
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
