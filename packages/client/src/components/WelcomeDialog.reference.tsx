"use client";

import {
	Download,
	FileSpreadsheet,
	FolderSync,
	TestTube,
	Upload,
	X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface WelcomeDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUploadFiles?: () => void;
}

export default function WelcomeDialog({
	open,
	onOpenChange,
	onUploadFiles,
}: WelcomeDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[547px] p-6 bg-background border border-border rounded-lg">
				<DialogHeader className="flex flex-col gap-1.5 items-center">
					<DialogTitle className="text-4xl font-normal text-foreground text-center leading-10">
						Welcome to RITA Go
					</DialogTitle>
					<DialogDescription className="text-base font-light text-black text-center leading-6">
						Get started by uploading knowledge articles to unlock instant
						answers from RITA.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-4">
						<div className="p-4 bg-blue-950 border border-border rounded-md">
							<div className="flex flex-col gap-4 items-center">
								<TestTube className="w-8 h-8 text-foreground" />
								<h4 className="text-xl font-normal text-accent-foreground text-center leading-7">
									Try RITA instantly with a sample
								</h4>
								<p className="text-sm text-muted-foreground text-center leading-5 w-[370px]">
									See how RITA works with a sample article — no setup required.
									Choose one of the options below:
								</p>
								<div className="flex flex-col gap-4 w-full">
									<Button size="sm" className="w-full">
										<Download className="w-4 h-4" />
										Use a sample file
									</Button>
									<Button size="sm" className="w-full">
										Connect to sample Confluence
									</Button>
								</div>
							</div>
						</div>
						<div className="flex justify-center">
							<p className="text-base font-light text-black text-center leading-6">
								Or add your own
							</p>
						</div>
					</div>

					<div className="flex flex-col gap-4">
						<div className="p-2 bg-popover border border-border rounded-md">
							<div className="flex justify-between items-center">
								<div className="flex items-center gap-4">
									<div className="flex items-center gap-2">
										<FileSpreadsheet className="w-5 h-5 text-background" />
										<span className="text-sm text-foreground">
											Upload knowledge articles
										</span>
									</div>
									<div className="flex gap-4">
										<div className="w-4 h-4 bg-gray-300 rounded"></div>
										<div className="w-4 h-4 bg-gray-300 rounded"></div>
									</div>
								</div>
								<Button
									variant="secondary"
									size="sm"
									onClick={() => {
										onUploadFiles?.();
										onOpenChange(false); // Close welcome modal after triggering upload
									}}
								>
									<Upload className="w-4 h-4" />
									Upload files
								</Button>
							</div>
						</div>

						<div className="p-2 bg-popover border border-border rounded-md">
							<div className="flex justify-between items-center">
								<div className="flex items-center gap-4">
									<div className="flex items-center gap-2">
										<FolderSync className="w-5 h-5 text-background" />
										<span className="text-sm text-foreground">
											Sync with external sources
										</span>
									</div>
									<div className="flex gap-4">
										<div className="w-4 h-4 bg-gray-300 rounded"></div>
										<div className="w-4 h-4 bg-gray-300 rounded"></div>
										<div className="w-4 h-4 bg-gray-300 rounded"></div>
									</div>
								</div>
								<Button variant="secondary" size="sm">
									Go to connections
								</Button>
							</div>
						</div>
					</div>
				</div>

				<DialogFooter className="flex justify-center">
					<Button variant="link" onClick={() => onOpenChange(false)}>
						I'll do this later
					</Button>
				</DialogFooter>

				<button
					className="absolute top-6 right-6 opacity-70 hover:opacity-100"
					onClick={() => onOpenChange(false)}
				>
					<X className="w-4 h-4 text-foreground" />
				</button>
			</DialogContent>
		</Dialog>
	);
}
