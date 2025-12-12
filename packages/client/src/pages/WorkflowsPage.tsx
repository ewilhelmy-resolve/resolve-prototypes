import { useState, useRef, useEffect } from "react";
import { Send, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import RitaLayout from "@/components/layouts/RitaLayout";

interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
	isError?: boolean;
}

export default function WorkflowsPage() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [showConfig, setShowConfig] = useState(true);
	const [endpoint, setEndpoint] = useState("");
	const [payloadTemplate, setPayloadTemplate] = useState('{ "text": "%user_message%" }');
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length]);

	const handleSend = async () => {
		if (!inputValue.trim() || !endpoint.trim() || isLoading) return;

		const userMessage: ChatMessage = {
			id: crypto.randomUUID(),
			role: "user",
			content: inputValue,
			timestamp: new Date(),
		};
		setMessages((prev) => [...prev, userMessage]);
		const messageText = inputValue;
		setInputValue("");
		setIsLoading(true);

		try {
			// Replace %user_message% template variable
			const payloadString = payloadTemplate.replace(/%user_message%/g, messageText);
			const finalPayload = JSON.parse(payloadString);

			const response = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(finalPayload),
			});

			const data = await response.json();

			const assistantMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: "assistant",
				content: JSON.stringify(data, null, 2),
				timestamp: new Date(),
				isError: !response.ok,
			};
			setMessages((prev) => [...prev, assistantMessage]);
		} catch (error) {
			const errorMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: "assistant",
				content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
				timestamp: new Date(),
				isError: true,
			};
			setMessages((prev) => [...prev, errorMessage]);
		} finally {
			setIsLoading(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<RitaLayout>
			<div className="flex flex-col h-full bg-background">
				{/* Dev Config Panel (collapsible) */}
				<div className="border-b">
					<button
						type="button"
						onClick={() => setShowConfig(!showConfig)}
						className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50"
					>
						<span className="flex items-center gap-2">
							<Settings className="w-4 h-4" />
							Endpoint Configuration
						</span>
						{showConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
					</button>
					{showConfig && (
						<div className="px-4 pb-4 space-y-3">
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-1">
									<Label htmlFor="endpoint" className="text-xs">Endpoint URL</Label>
									<Input
										id="endpoint"
										type="url"
										placeholder="https://api.example.com/workflow"
										value={endpoint}
										onChange={(e) => setEndpoint(e.target.value)}
										className="h-8 text-sm"
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="payload" className="text-xs">
										Payload Template <code className="text-[10px] bg-muted px-1 rounded">%user_message%</code>
									</Label>
									<Input
										id="payload"
										placeholder='{ "text": "%user_message%" }'
										value={payloadTemplate}
										onChange={(e) => setPayloadTemplate(e.target.value)}
										className="h-8 text-sm font-mono"
									/>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Chat Messages Area */}
				<div className="flex-1 overflow-y-auto p-4">
					<div className="max-w-3xl mx-auto space-y-4">
						{messages.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-20">
								<p className="text-lg font-medium">Workflow Generator</p>
								<p className="text-sm">Configure your endpoint above and start chatting</p>
							</div>
						) : (
							messages.map((message) => (
								<div
									key={message.id}
									className={cn(
										"flex",
										message.role === "user" ? "justify-end" : "justify-start"
									)}
								>
									<div
										className={cn(
											"max-w-[80%] rounded-lg px-4 py-2",
											message.role === "user"
												? "bg-primary text-primary-foreground"
												: message.isError
													? "bg-destructive/10 border border-destructive/20"
													: "bg-muted"
										)}
									>
										{message.role === "assistant" ? (
											<pre className={cn(
												"text-sm whitespace-pre-wrap break-words font-mono",
												message.isError && "text-destructive"
											)}>
												{message.content}
											</pre>
										) : (
											<p className="text-sm">{message.content}</p>
										)}
									</div>
								</div>
							))
						)}
						{isLoading && (
							<div className="flex justify-start">
								<div className="bg-muted rounded-lg px-4 py-2">
									<span className="text-sm text-muted-foreground">Thinking...</span>
								</div>
							</div>
						)}
						<div ref={messagesEndRef} />
					</div>
				</div>

				{/* Chat Input Area */}
				<div className="border-t p-4">
					<div className="max-w-3xl mx-auto flex gap-2">
						<Textarea
							placeholder={endpoint ? "Type your message..." : "Configure endpoint first..."}
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							onKeyDown={handleKeyDown}
							disabled={!endpoint.trim() || isLoading}
							rows={1}
							className="min-h-[44px] max-h-32 resize-none"
						/>
						<Button
							onClick={handleSend}
							disabled={!inputValue.trim() || !endpoint.trim() || isLoading}
							size="icon"
							className="h-[44px] w-[44px]"
						>
							<Send className="w-4 h-4" />
						</Button>
					</div>
				</div>
			</div>
		</RitaLayout>
	);
}
