import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
	isError?: boolean;
}

interface WorkflowChatProps {
	messages: ChatMessage[];
}

export function WorkflowChat({ messages }: WorkflowChatProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg">Chat Response</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{messages.map((message) => (
					<div
						key={message.id}
						className={cn(
							"p-3 rounded-lg",
							message.role === "user"
								? "bg-muted"
								: message.isError
									? "bg-destructive/10 border border-destructive/20"
									: "bg-primary/10"
						)}
					>
						<div className="flex items-center gap-2 mb-1">
							<span className="text-xs font-medium text-muted-foreground">
								{message.role === "user" ? "You" : "System"}
							</span>
							<span className="text-xs text-muted-foreground">
								{message.timestamp.toLocaleTimeString()}
							</span>
						</div>
						<pre
							className={cn(
								"text-sm whitespace-pre-wrap break-words font-mono",
								message.isError && "text-destructive"
							)}
						>
							{message.content}
						</pre>
					</div>
				))}
			</CardContent>
		</Card>
	);
}
