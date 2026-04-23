/**
 * Baseline e2e: Iframe Chat Flow
 *
 * Tests the embedded iframe chat at /iframe/chat with Valkey session auth.
 * Validates instantiation handshake, SSE connection, workflow execution,
 * reasoning step rendering, and minimal (no-sidebar) UI.
 *
 * Prerequisites:
 *   - Full stack running (pnpm dev)
 *   - Valkey running with dev session key
 *   - Mock service running (pnpm dev:mock) for workflow responses
 *
 * Run manually with playwright-cli:
 *   export PWCLI="$HOME/.codex/skills/playwright/scripts/playwright_cli.sh"
 *
 *   # 1. Open iframe chat with dev session key
 *   "$PWCLI" open "http://localhost:5173/iframe/chat?sessionKey=dev-test"
 *
 *   # 2. Wait for instantiation + SSE, take snapshot
 *   "$PWCLI" snapshot
 *   #    Expect: Minimal chat UI (no sidebar, no header nav)
 *   #    Network: POST /api/iframe/validate-instantiation -> 200
 *   #    Network: GET /api/sse/events (EventSource open)
 *
 *   # 3. Send a message that triggers workflow
 *   "$PWCLI" fill <input-ref> "test-workflow"
 *   "$PWCLI" click <send-button-ref>
 *
 *   # 4. Watch reasoning steps arrive via SSE
 *   "$PWCLI" snapshot
 *   #    Expect: Reasoning accordion with steps appearing one at a time
 *
 *   # 5. Wait for completion
 *   "$PWCLI" snapshot
 *   #    Expect: Completion card with success/error/warning status
 *
 *   # 6. Verify accordion toggle
 *   "$PWCLI" click <accordion-header-ref>
 *   "$PWCLI" snapshot
 *   #    Expect: Accordion opens/closes on click
 *
 * Authentication:
 *   Iframe uses Valkey session auth, NOT Keycloak.
 *   The sessionKey URL param maps to a Valkey hash (rita:session:{guid}).
 *   Backend reads Valkey payload to get userId, tenantId, credentials.
 *   A session cookie is set by validate-instantiation response.
 *
 * Instantiation flow (IframeChatPage.tsx):
 *   1. Read sessionKey from URL params
 *   2. POST /api/iframe/validate-instantiation { sessionKey }
 *   3. Response: { valid, conversationId, titleText, welcomeText, placeholderText, parentOrigin }
 *   4. Session cookie set (enables SSE routing)
 *   5. SSE connection opens via SSEProvider
 *   6. POST /api/iframe/execute { hashkey } triggers workflow
 */

export interface IframeFlowStep {
	action: string;
	url?: string;
	text?: string;
	description?: string;
	check?: string;
	verify: string;
	response_shape?: Record<string, unknown>;
	expected_steps?: string[];
}

export interface IframeNetworkExpectation {
	[key: string]: string;
}

export interface IframeUIExpectation {
	sidebar: boolean;
	headerNav: boolean;
	inputField: boolean;
	fileUpload: boolean;
	customTitle: string;
	customPlaceholder: string;
}

export interface IframeBaselineFlow {
	name: string;
	url: string;
	auth: string;
	steps: IframeFlowStep[];
	expected_network: IframeNetworkExpectation;
	expected_ui: IframeUIExpectation;
}

export const IFRAME_CHAT_FLOW: IframeBaselineFlow = {
	name: "Iframe Chat",
	url: "http://localhost:5173/iframe/chat?sessionKey=dev-test",
	auth: "valkey-session", // sessionKey in URL, no Keycloak

	steps: [
		{
			action: "navigate",
			url: "http://localhost:5173/iframe/chat?sessionKey=dev-test",
			verify: "Iframe chat page loads with minimal UI (IframeChatLayout)",
		},
		{
			action: "verify_instantiation",
			description:
				"POST /api/iframe/validate-instantiation with sessionKey from URL",
			check: "Network: POST /api/iframe/validate-instantiation returns 200",
			response_shape: {
				valid: true,
				conversationId: "uuid",
				titleText: "string | undefined (from Valkey uiConfig)",
				welcomeText: "string | undefined (from Valkey uiConfig)",
				placeholderText: "string | undefined (from Valkey uiConfig)",
				parentOrigin: "string (host page origin for secure postMessage)",
				chatSessionId: "string (for dev tools export)",
				tabInstanceId: "string (for dev tools export)",
			},
			verify:
				"Instantiation succeeds, loading spinner replaced by chat interface",
		},
		{
			action: "verify_session_cookie",
			description: "Session cookie set by validate-instantiation response",
			check:
				"Document cookies contain rita session cookie (HttpOnly, set by backend Set-Cookie header)",
			verify:
				"Subsequent API calls include session cookie (credentials: include)",
		},
		{
			action: "verify_sse",
			description: "SSE connection opens after successful instantiation",
			check: "EventSource to /api/sse/events opens (text/event-stream)",
			verify: "SSEProvider connected, console shows 'SSE connection opened'",
		},
		{
			action: "verify_custom_ui",
			description: "UI config from Valkey applied",
			verify:
				"Custom titleText shown in header (if present), custom placeholderText in input field (if present), welcomeText shown as first message",
		},
		{
			action: "send_message",
			text: "test-workflow",
			verify:
				"Message sent via POST /api/conversations/:id/messages, triggers mock workflow with reasoning steps",
		},
		{
			action: "verify_reasoning_steps",
			description:
				"Reasoning steps arrive one at a time via SSE new_message events",
			expected_steps: [
				"Requirements Analyst is working...",
				"Verifying if activity exists",
				"Using generate_python_code...",
				"Starting agent",
				"Polling for execution status...",
			],
			verify:
				"Each reasoning step appears as a new message in the conversation via SSE new_message event with metadata",
		},
		{
			action: "verify_completion",
			description: "Final response with completion status",
			verify:
				"Completion card renders with success/error/warning status. Accordion auto-closes after completion.",
		},
		{
			action: "verify_accordion_toggle",
			description: "Manual accordion interaction",
			verify:
				"After auto-close, clicking accordion header manually opens it. Clicking again closes it. Toggle is smooth with animation.",
		},
		{
			action: "verify_minimal_ui",
			description: "Iframe-specific layout constraints",
			verify:
				"No sidebar visible. No header navigation links. Only chat input, send button, and conversation area. IframeChatLayout wraps content (not RootLayout).",
		},
		{
			action: "verify_debug_panel",
			url: "http://localhost:5173/iframe/chat?sessionKey=dev-test&debug=true",
			description: "Debug mode with ?debug=true URL param",
			verify:
				"Debug panel visible with session info, log entries, and Valkey payload (sensitive fields redacted)",
		},
	],

	expected_network: {
		instantiation: "POST /api/iframe/validate-instantiation",
		sse: "GET /api/sse/events (EventSource, text/event-stream)",
		send: "POST /api/conversations/:id/messages",
		execute: "POST /api/iframe/execute (triggers workflow via hashkey)",
		uiAction: "POST /api/iframe/ui-action (dynamic UI interaction)",
		formResponse: "POST /api/iframe/ui-form-response (form submit/cancel)",
		deleteConvo: "DELETE /api/iframe/conversation/:id (clear chat)",
	},

	expected_ui: {
		sidebar: false,
		headerNav: false,
		inputField: true,
		fileUpload: false,
		customTitle:
			"from Valkey uiConfig.titleText (e.g., 'Ask Workflow Designer')",
		customPlaceholder:
			"from Valkey uiConfig.placeholderText (e.g., 'Describe your workflow...')",
	},
};
