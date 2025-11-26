import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface KnowledgeItem {
	filename: string;
	fileType: string;
	date: string;
}

interface KnowledgeTabProps {
	knowledgeItems?: KnowledgeItem[];
}

const defaultKnowledgeItems: KnowledgeItem[] = [
	{
		filename: "Email signature FAQ.pdf",
		fileType: "PDF",
		date: "Nov 4, 9:45am",
	},
	{
		filename: "All_things_email.doc",
		fileType: "Docx",
		date: "Nov 4, 9:45am",
	},
	{
		filename: "All_things_email2.doc",
		fileType: "Docx",
		date: "Nov 12, 9:45am",
	},
];

/**
 * KnowledgeTab - Knowledge articles tab content for ticket detail sidebar
 *
 * Displays a list of knowledge articles related to the ticket group
 *
 * @param knowledgeItems - Array of knowledge items to display (defaults to sample data)
 */
export default function KnowledgeTab({
	knowledgeItems = defaultKnowledgeItems,
}: KnowledgeTabProps) {
	// Action handlers - currently log to console, will be replaced with API calls
	const handleDownload = (filename: string) => {
		console.log(`Download: ${filename}`);
	};

	const handleReprocess = (filename: string) => {
		console.log(`Reprocess: ${filename}`);
	};

	const handleDelete = (filename: string) => {
		console.log(`Delete: ${filename}`);
	};

	const handleRemoveFromGroup = (filename: string) => {
		console.log(`Remove from group: ${filename}`);
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3">
				{knowledgeItems.map((item, index) => (
					<div key={index}>
						<div className="flex flex-col gap-3">
							<div className="flex flex-row justify-start items-start w-full">
								<div className="flex flex-col justify-start items-start min-w-0 flex-1">
									<div className="flex flex-row justify-start items-start w-full">
										<div className="flex flex-col justify-start items-start min-w-0 flex-1">
											<p className="text-sm">{item.filename}</p>
											<div className="flex flex-row gap-2 justify-start items-start">
												<span className="text-sm text-muted-foreground w-12 max-w-12">
													{item.fileType}
												</span>
												<span className="text-sm text-muted-foreground">
													{item.date}
												</span>
											</div>
										</div>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon">
													<MoreHorizontal />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem onClick={() => handleDownload(item.filename)}>
													Download
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => handleReprocess(item.filename)}>
													Reprocess
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem variant="destructive" onClick={() => handleDelete(item.filename)}>
													Delete
												</DropdownMenuItem>
												<DropdownMenuItem variant="destructive" onClick={() => handleRemoveFromGroup(item.filename)}>
													Remove from group
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</div>
							</div>
						</div>
						{index < knowledgeItems.length - 1 && <Separator />}
					</div>
				))}
			</div>
		</div>
	);
}
