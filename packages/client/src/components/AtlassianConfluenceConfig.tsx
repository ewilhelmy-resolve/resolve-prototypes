"use client";

import { ChevronRight, CircleOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export default function AtlassianConfluenceConfig() {
	return (
		<div className="flex justify-center p-6">
			<div className="flex flex-col gap-8 w-full max-w-4xl">
				<div className="flex flex-col gap-2">
					<div className="flex flex-col gap-8">
						<Breadcrumb>
							<BreadcrumbList className="flex items-center gap-2.5">
								<BreadcrumbItem>
									<BreadcrumbLink
										href="#"
										className="text-muted-foreground text-sm"
									>
										Connections
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator>
									<ChevronRight className="h-4 w-4 text-muted-foreground" />
								</BreadcrumbSeparator>
								<BreadcrumbItem>
									<BreadcrumbLink
										href="#"
										className="text-muted-foreground text-sm"
									>
										Configure
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator>
									<ChevronRight className="h-4 w-4 text-muted-foreground" />
								</BreadcrumbSeparator>
								<BreadcrumbItem>
									<BreadcrumbPage className="text-foreground text-sm">
										Atlassian Confluence
									</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>

						<div className="flex flex-col gap-2">
							<div className="flex items-center gap-2 justify-between">
								<div className="flex items-center gap-2">
									<h3 className="text-2xl font-medium text-foreground">
										Atlassian Confluence
									</h3>
									<Badge variant="outline" className="flex items-center gap-1">
										<CircleOff className="h-3 w-3" />
										Not connected
									</Badge>
								</div>
								<Button size="sm" disabled>
									Connect
								</Button>
							</div>
							<p className="text-sm text-muted-foreground">
								Connect your Confluence instance to build context for RITA to
								make better expereinces
							</p>
						</div>
					</div>
				</div>

				<Separator />

				<div className="flex flex-col gap-8">
					<div className="flex flex-col gap-8">
						<div className="flex flex-col gap-4 rounded-md">
							<h4 className="text-xl font-medium text-foreground">
								Authentication
							</h4>
							<div className="flex flex-col gap-4">
								<div className="flex flex-col gap-2">
									<Label htmlFor="url" className="text-sm text-foreground">
										URL
									</Label>
									<Input id="url" className="h-9" />
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="email" className="text-sm text-foreground">
										User email
									</Label>
									<Input id="email" className="h-9" />
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="token" className="text-sm text-foreground">
										API token
									</Label>
									<Input id="token" className="h-9" />
								</div>
							</div>
						</div>

						<div className="flex flex-col gap-4 rounded-md">
							<h4 className="text-xl font-medium text-foreground">
								Preferences
							</h4>
							<div className="flex flex-col gap-4">
								<div className="flex flex-col gap-2">
									<Label htmlFor="spaces" className="text-sm text-foreground">
										Spaces
									</Label>
									<Select>
										<SelectTrigger className="h-9">
											<SelectValue placeholder="Choose a spaces" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="space1">Space 1</SelectItem>
											<SelectItem value="space2">Space 2</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="folders" className="text-sm text-foreground">
										Folders
									</Label>
									<Select disabled>
										<SelectTrigger className="h-9">
											<SelectValue placeholder="Choose a folder" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="folder1">Folder 1</SelectItem>
											<SelectItem value="folder2">Folder 2</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
