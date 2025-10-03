"use client";

import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CONNECTION_SOURCES, STATUS } from "@/constants/connectionSources";
import { ConnectionStatusBadge } from "../connection-sources/ConnectionStatusBadge";
import { Button } from "../ui/button";

export default function ConnectionSources() {
	return (
		<div className="w-full">
			<div className="flex flex-col gap-8">
				<div className="flex flex-col gap-2">
					<h3 className="text-2xl font-medium text-foreground">
						Connection Sources
					</h3>
					<p className="text-sm text-muted-foreground">
						Connect your knowledge and ticketing sources to help Rita resolve IT
						issues faster.
					</p>
				</div>
				<Separator />
				{/* w-full max-w-2xl mx-auto flex flex-col gap-8 */}
				<div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
					{CONNECTION_SOURCES.map((source) => (
						<Link
							key={source.id}
							to={`/settings/connections/${source.id}`}
							className="block"
						>
							<Card className="p-4 border border-border bg-popover hover:bg-accent transition-colors cursor-pointer">
								<div className="flex justify-between items-center">
									<div className="flex flex-col gap-2">
										<div className="flex flex-col">
											<div className="flex items-center gap-2">
												<p className="text-base font-bold text-foreground">
													{source.title}
												</p>
												<ConnectionStatusBadge status={source.status} />
											</div>

											{source.lastSync && (
												<p className="text-sm text-foreground mt-1">
													Last sync: {source.lastSync}
												</p>
											)}
											{source.description && (
												<p className="text-sm text-foreground mt-1">
													{source.description}
												</p>
											)}
										</div>
										<div className="flex gap-2">
											{source.badges.map((badge) => (
												<Badge key={badge} variant="secondary">
													{badge}
												</Badge>
											))}
										</div>
									</div>
									{source.status !== STATUS.NOT_CONNECTED && (
										<Button variant="secondary" size="sm">
											Manage
										</Button>
									)}
									{source.status === STATUS.NOT_CONNECTED && (
										<Button variant="secondary" size="sm">
											Configure
										</Button>
									)}
								</div>
							</Card>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
