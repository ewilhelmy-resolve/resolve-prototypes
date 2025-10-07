"use client";

import { Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
	CONNECTION_SOURCES,
	SOURCES,
	STATUS,
} from "@/constants/connectionSources";
import { ConnectionStatusBadge } from "../connection-sources/ConnectionStatusBadge";
import Header from "../Header";
import { Button } from "../ui/button";


export default function ConnectionSources() {
	
	return (
	
			<div className="w-full">
				<div className="flex flex-col gap-8">
					<Header
						title="Connection Sources"
						description="Connect your knowledge and ticketing sources to help Rita resolve IT issues faster."
					/>
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
													{source.id !== SOURCES.WEB_SEARCH ? (
														<img
															src={`/connections/icon_${source.id}.svg`}
															alt={`${source.title} icon`}
															className="w-5 h-5 flex-shrink-0"
														/>
													) : (
														<Globe className="h-5 w-5 flex-shrink-0" />
													)}
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
