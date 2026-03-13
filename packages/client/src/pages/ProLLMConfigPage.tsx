import {
	CheckCircle2,
	CircleAlert,
	Eye,
	EyeOff,
	Loader2,
	Play,
} from "lucide-react";
import { useState } from "react";
import { ProLayout } from "@/components/layouts/ProLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TestStatus = "idle" | "running" | "pass" | "fail";

interface TestResult {
	status: TestStatus;
	latency?: number;
	model?: string;
	tokensUsed?: number;
	groovyScript?: string;
	matchScore?: number;
}

const MOCK_GROOVY_SCRIPT = `// Auto-generated Groovy script (80% match)
import groovy.json.JsonSlurper

def parseResponse(String raw) {
    def slurper = new JsonSlurper()
    def json = slurper.parseText(raw)

    def result = [:]
    result.status = json.choices[0]?.finish_reason ?: "unknown"
    result.content = json.choices[0]?.message?.content ?: ""
    result.model = json.model ?: "n/a"
    result.usage = [
        prompt_tokens: json.usage?.prompt_tokens ?: 0,
        completion_tokens: json.usage?.completion_tokens ?: 0,
        total_tokens: json.usage?.total_tokens ?: 0
    ]

    // Normalize for downstream task consumption
    result.parsed = result.content
        .replaceAll(/\\n+/, " ")
        .trim()

    return result
}

// Entry point — called by Resolve task engine
def response = parseResponse(INPUT.raw_llm_response)
OUTPUT.llm_status = response.status
OUTPUT.llm_content = response.parsed
OUTPUT.llm_model = response.model
OUTPUT.tokens_used = response.usage.total_tokens`;

export default function ProLLMConfigPage() {
	const [url, setUrl] = useState("");
	const [authToken, setAuthToken] = useState("");
	const [showToken, setShowToken] = useState(false);
	const [testResult, setTestResult] = useState<TestResult>({ status: "idle" });
	const [isSaving, setIsSaving] = useState(false);

	const handleTest = async () => {
		setTestResult({ status: "running" });

		// Simulate LLM test call
		await new Promise((r) => setTimeout(r, 2500));

		setTestResult({
			status: "pass",
			latency: 842,
			model: "detected from endpoint",
			tokensUsed: 347,
			groovyScript: MOCK_GROOVY_SCRIPT,
			matchScore: 80,
		});
	};

	const handleSave = async () => {
		setIsSaving(true);
		await new Promise((r) => setTimeout(r, 1000));
		setIsSaving(false);
	};

	const canTest = url.trim() !== "" && authToken.trim() !== "";

	return (
		<ProLayout>
			<div className="p-6">
				<div className="mb-6">
					<h1 className="text-2xl font-bold">LLM Configuration</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Configure the LLM endpoint used by Resolve for task analysis and script generation.
					</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Left: Connection + Test */}
					<section className="space-y-4 rounded-lg border p-5 self-start">
						<h2 className="text-sm font-semibold">Connection</h2>

						<div className="space-y-1.5">
							<Label htmlFor="llm-url">LLM URL</Label>
							<Input
								id="llm-url"
								placeholder="https://api.openai.com/v1/chat/completions"
								value={url}
								onChange={(e) => setUrl(e.target.value)}
							/>
							<p className="text-[11px] text-muted-foreground">
								Full endpoint URL for the LLM API. Must be reachable from the Resolve control node.
							</p>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="llm-auth">Auth Token</Label>
							<div className="relative">
								<Input
									id="llm-auth"
									type={showToken ? "text" : "password"}
									placeholder="sk-..."
									value={authToken}
									onChange={(e) => setAuthToken(e.target.value)}
									className="pr-10"
								/>
								<button
									type="button"
									onClick={() => setShowToken(!showToken)}
									className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									aria-label={showToken ? "Hide token" : "Show token"}
								>
									{showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
								</button>
							</div>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="llm-ip-token">Provider IP Token</Label>
							<Input
								id="llm-ip-token"
								type="password"
								placeholder="Optional — for IP-restricted endpoints"
							/>
							<p className="text-[11px] text-muted-foreground">
								Required if the provider restricts access by source IP or uses a secondary token.
							</p>
						</div>

						<div className="border-t pt-4 flex items-center justify-between">
							<Button
								variant="outline"
								size="sm"
								onClick={handleTest}
								disabled={!canTest || testResult.status === "running"}
							>
								{testResult.status === "running" ? (
									<>
										<Loader2 className="size-3.5 animate-spin" />
										Testing...
									</>
								) : (
									<>
										<Play className="size-3.5" />
										Test Connection
									</>
								)}
							</Button>

							{testResult.status === "pass" && (
								<span className="flex items-center gap-1.5 text-xs text-green-600">
									<CheckCircle2 className="size-3.5" />
									Connected
								</span>
							)}
							{testResult.status === "fail" && (
								<span className="flex items-center gap-1.5 text-xs text-destructive">
									<CircleAlert className="size-3.5" />
									Failed
								</span>
							)}
						</div>

						{/* Actions */}
						<div className="flex items-center gap-3 border-t pt-4">
							<Button onClick={handleSave} disabled={isSaving}>
								{isSaving ? (
									<>
										<Loader2 className="size-3.5 animate-spin" />
										Saving...
									</>
								) : (
									"Save Configuration"
								)}
							</Button>
							<Button variant="outline" onClick={() => window.history.back()}>
								Cancel
							</Button>
						</div>
					</section>

					{/* Right: Test Results */}
					<div className="self-start">
						{testResult.status === "idle" && (
							<div className="rounded-lg border border-dashed p-8 flex flex-col items-center justify-center text-center gap-2">
								<Play className="size-5 text-muted-foreground" />
								<p className="text-sm text-muted-foreground">
									Enter your LLM URL and token, then run a test to see results here.
								</p>
							</div>
						)}

						{testResult.status === "running" && (
							<div className="rounded-lg border p-8 flex flex-col items-center justify-center text-center gap-2">
								<Loader2 className="size-5 animate-spin text-muted-foreground" />
								<p className="text-sm text-muted-foreground">
									Running test against endpoint...
								</p>
							</div>
						)}

						{testResult.status === "fail" && (
							<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 space-y-2">
								<div className="flex items-center gap-2 text-sm font-medium text-destructive">
									<CircleAlert className="size-4" />
									Connection failed
								</div>
								<p className="text-xs text-muted-foreground">
									Check that the URL is reachable and the auth token is valid. Ensure the endpoint accepts POST requests.
								</p>
							</div>
						)}

						{testResult.status === "pass" && (
							<div className="space-y-4">
								{/* Stats */}
								<div className="grid grid-cols-3 gap-3">
									<div className="rounded-lg border p-3">
										<p className="text-[10px] text-muted-foreground uppercase tracking-wide">Latency</p>
										<p className="font-mono font-medium text-lg">{testResult.latency}ms</p>
									</div>
									<div className="rounded-lg border p-3">
										<p className="text-[10px] text-muted-foreground uppercase tracking-wide">Model</p>
										<p className="font-mono font-medium text-xs mt-1">{testResult.model}</p>
									</div>
									<div className="rounded-lg border p-3">
										<p className="text-[10px] text-muted-foreground uppercase tracking-wide">Tokens</p>
										<p className="font-mono font-medium text-lg">{testResult.tokensUsed}</p>
									</div>
								</div>

								{/* Groovy Script */}
								{testResult.groovyScript && (
									<section className="rounded-lg border p-5 space-y-3">
										<div className="flex items-center justify-between">
											<div>
												<h2 className="text-sm font-semibold">Analysis</h2>
												<p className="text-[11px] text-muted-foreground mt-0.5">
													Groovy script generated from the test response.
												</p>
											</div>
											<div className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
												<CheckCircle2 className="size-3" />
												{testResult.matchScore}% match
											</div>
										</div>

										<Textarea
											value={testResult.groovyScript}
											onChange={(e) =>
												setTestResult((prev) => ({ ...prev, groovyScript: e.target.value }))
											}
											className="min-h-[320px] font-mono text-xs leading-5 resize-y"
											aria-label="Groovy script output"
										/>

										<p className="text-[11px] text-muted-foreground">
											This script parses the LLM response for downstream Resolve tasks. The {testResult.matchScore}% match score indicates how well the generated script covers the expected output schema.
										</p>
									</section>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</ProLayout>
	);
}
