import { useState } from "react";
import { WorkflowGeneratorForm } from "@/components/workflows/WorkflowGeneratorForm";
import { WorkflowChat, type ChatMessage } from "@/components/workflows/WorkflowChat";

export default function WorkflowsPage() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const handleGenerate = async (
		taskDescription: string,
		endpoint: string,
		payload: Record<string, unknown>
	) => {
		// Add user message
		const userMessage: ChatMessage = {
			id: crypto.randomUUID(),
			role: "user",
			content: taskDescription,
			timestamp: new Date(),
		};
		setMessages((prev) => [...prev, userMessage]);
		setIsLoading(true);

		try {
			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			const data = await response.json();

			// Add system response
			const systemMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: "assistant",
				content: JSON.stringify(data, null, 2),
				timestamp: new Date(),
				isError: !response.ok,
			};
			setMessages((prev) => [...prev, systemMessage]);
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

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-4xl mx-auto p-6 space-y-6">
				<h1 className="text-2xl font-bold">Workflow Generator</h1>

				<WorkflowGeneratorForm onGenerate={handleGenerate} isLoading={isLoading} />

				{messages.length > 0 && <WorkflowChat messages={messages} />}
			</div>
		</div>
	);
}
