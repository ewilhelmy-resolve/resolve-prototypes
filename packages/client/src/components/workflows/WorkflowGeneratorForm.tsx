import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface WorkflowGeneratorFormProps {
	onGenerate: (
		taskDescription: string,
		endpoint: string,
		payload: Record<string, unknown>
	) => void;
	isLoading?: boolean;
}

export function WorkflowGeneratorForm({
	onGenerate,
	isLoading = false,
}: WorkflowGeneratorFormProps) {
	const [taskDescription, setTaskDescription] = useState("");
	const [endpoint, setEndpoint] = useState("");
	const [payloadText, setPayloadText] = useState("{}");
	const [payloadError, setPayloadError] = useState<string | null>(null);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		// Validate JSON
		let payload: Record<string, unknown>;
		try {
			payload = JSON.parse(payloadText);
			setPayloadError(null);
		} catch {
			setPayloadError("Invalid JSON");
			return;
		}

		if (!taskDescription.trim() || !endpoint.trim()) {
			return;
		}

		onGenerate(taskDescription, endpoint, payload);
	};

	return (
		<Card>
			<CardContent className="pt-6">
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="task">1. Describe Your Task</Label>
						<Textarea
							id="task"
							placeholder="given a list of letters, reverse the order of those letters..."
							value={taskDescription}
							onChange={(e) => setTaskDescription(e.target.value)}
							rows={3}
							className="resize-none"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="endpoint">2. Endpoint URL</Label>
						<Input
							id="endpoint"
							type="url"
							placeholder="https://api.example.com/workflow"
							value={endpoint}
							onChange={(e) => setEndpoint(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="payload">3. Payload (JSON)</Label>
						<Textarea
							id="payload"
							placeholder='{ "key": "value" }'
							value={payloadText}
							onChange={(e) => {
								setPayloadText(e.target.value);
								setPayloadError(null);
							}}
							rows={5}
							className={`font-mono text-sm resize-none ${payloadError ? "border-destructive" : ""}`}
						/>
						{payloadError && (
							<p className="text-sm text-destructive">{payloadError}</p>
						)}
					</div>

					<div className="flex justify-end">
						<Button
							type="submit"
							disabled={
								isLoading || !taskDescription.trim() || !endpoint.trim()
							}
						>
							{isLoading ? "Generating..." : "Generate Workflow"}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
