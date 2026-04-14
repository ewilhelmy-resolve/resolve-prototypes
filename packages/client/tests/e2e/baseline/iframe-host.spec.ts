/**
 * Baseline e2e: Iframe Host (iframe-app) Flow
 *
 * Tests the iframe-app demo host at port 5174. This is the Jarvis embed
 * demo that simulates how the Actions Platform loads Rita as an iframe widget.
 * Validates iframe loading, postMessage protocol, and host-iframe communication.
 *
 * Prerequisites:
 *   - Full stack running (pnpm dev)
 *   - iframe-app running on port 5174 (pnpm dev:iframe-app)
 *   - Valkey running for session keys
 *
 * Run manually with playwright-cli:
 *   export PWCLI="$HOME/.codex/skills/playwright/scripts/playwright_cli.sh"
 *
 *   # 1. Open the demo host page
 *   "$PWCLI" open http://localhost:5174
 *
 *   # 2. Take snapshot of demo host (Resolve Actions - Jarvis Embed Demo)
 *   "$PWCLI" snapshot
 *   #    Expect: Platform UI with header, dashboard stats, and chat widget toggle button
 *
 *   # 3. Click the chat widget toggle button (bottom-right FAB)
 *   "$PWCLI" click <chat-toggle-ref>
 *   "$PWCLI" snapshot
 *   #    Expect: Chat widget opens with iframe pointing to /iframe/chat?sessionKey=...
 *
 *   # 4. Wait for iframe READY event in dev panel event log
 *   "$PWCLI" snapshot
 *   #    Expect: Dev panel log shows "READY: Iframe connected" (green)
 *
 *   # 5. Use dev panel to send a message
 *   "$PWCLI" fill <dev-message-input-ref> "Hello from host"
 *   "$PWCLI" click <dev-send-button-ref>
 *   "$PWCLI" snapshot
 *   #    Expect: Dev panel log shows SEND_MESSAGE outgoing (blue)
 *   #    Expect: Message appears in iframe chat
 *
 *   # 6. Wait for response in iframe
 *   "$PWCLI" snapshot
 *   #    Expect: Response from mock service visible in iframe chat
 *
 *   # 7. Toggle chat widget closed
 *   "$PWCLI" click <chat-toggle-ref>
 *   "$PWCLI" snapshot
 *   #    Expect: Chat widget hidden, toggle button shows chat icon
 *
 * Architecture:
 *   The iframe-app (port 5174) is a static HTML demo that embeds:
 *     <iframe src="http://localhost:5173/iframe/chat?sessionKey={guid}">
 *
 *   PostMessage protocol (defined in useIframeMessaging.ts):
 *     Host -> Iframe: SEND_MESSAGE, GET_STATUS, CLEAR_CHAT
 *     Iframe -> Host: READY, ACK, STATUS
 *
 *   The host page also handles cross-origin modals:
 *     Iframe -> Host: RITA_OPEN_MODAL (content/form modals)
 *     Host -> Iframe: RITA_FORM_MODAL_ACK
 */

export interface HostFlowStep {
	action: string;
	url?: string;
	text?: string;
	description?: string;
	check?: string;
	verify: string;
	events?: Array<{ direction: string; type: string }>;
}

export interface PostMessageExpectation {
	host_to_iframe: string[];
	iframe_to_host: string[];
}

export interface HostBaselineFlow {
	name: string;
	url: string;
	auth: string;
	steps: HostFlowStep[];
	expected_postmessage: PostMessageExpectation;
}

export const IFRAME_HOST_FLOW: HostBaselineFlow = {
	name: "Iframe Host (Jarvis Embed Demo)",
	url: "http://localhost:5174",
	auth: "none", // demo host, iframe handles its own auth via sessionKey

	steps: [
		{
			action: "navigate",
			url: "http://localhost:5174",
			verify:
				"Jarvis Embed Demo page loads with platform header ('Resolve Actions'), dashboard stats, and chat widget toggle button (bottom-right circular FAB with gradient)",
		},
		{
			action: "verify_dev_panel",
			description: "Dev controls panel on left side of page",
			verify:
				"Dev panel visible with session key input, postMessage controls, and event log area (dark terminal-style)",
		},
		{
			action: "click_chat_toggle",
			description: "Click the circular chat widget button (bottom-right)",
			verify:
				"Chat widget container opens showing iframe element with src pointing to /iframe/chat?sessionKey=...",
		},
		{
			action: "verify_iframe_loads",
			description: "Iframe content loads and initializes",
			verify:
				"Iframe shows Rita chat interface (minimal UI, no sidebar). Widget header shows 'Rita Chat' with status indicator.",
		},
		{
			action: "verify_postmessage_ready",
			description: "Iframe sends READY event to host",
			events: [{ direction: "iframe->host", type: "READY" }],
			verify:
				"Dev panel event log shows 'READY: Iframe connected' (green text). Status dot turns green. Conversation ID logged if present.",
		},
		{
			action: "send_via_dev_panel",
			text: "Hello from host",
			description: "Use dev panel input to send SEND_MESSAGE via postMessage",
			verify:
				"Dev panel log shows 'SEND_MESSAGE' outgoing (blue text). Message appears in iframe chat as user bubble.",
		},
		{
			action: "verify_iframe_ack",
			description: "Iframe acknowledges the message",
			events: [{ direction: "iframe->host", type: "ACK" }],
			verify: "Dev panel log shows ACK response from iframe with success=true",
		},
		{
			action: "verify_response_in_iframe",
			description: "Wait for assistant response via SSE inside iframe",
			verify:
				"Response from mock service appears as assistant bubble in iframe chat. Visible through the iframe widget.",
		},
		{
			action: "test_get_status",
			description: "Click GET_STATUS button in dev panel",
			events: [
				{ direction: "host->iframe", type: "GET_STATUS" },
				{ direction: "iframe->host", type: "STATUS" },
			],
			verify:
				"Dev panel log shows STATUS response with connection state and conversation info",
		},
		{
			action: "test_clear_chat",
			description: "Click CLEAR_CHAT button in dev panel",
			events: [{ direction: "host->iframe", type: "CLEAR_CHAT" }],
			verify:
				"Chat history cleared in iframe. New conversation started. Dev panel log shows CLEAR_CHAT sent and ACK received.",
		},
		{
			action: "toggle_chat_closed",
			description: "Click toggle button to close chat widget",
			verify:
				"Chat widget slides closed. Toggle button shows chat icon (not close icon). Iframe connection persists in background.",
		},
		{
			action: "toggle_chat_reopen",
			description: "Click toggle button to reopen",
			verify:
				"Chat widget reopens. Previous state preserved (or new conversation if CLEAR_CHAT was used). No re-instantiation needed.",
		},
	],

	expected_postmessage: {
		host_to_iframe: ["SEND_MESSAGE", "GET_STATUS", "CLEAR_CHAT"],
		iframe_to_host: [
			"READY",
			"ACK",
			"STATUS",
			"RITA_OPEN_MODAL",
			"RITA_FORM_MODAL_ACK",
		],
	},
};
