/**
 * Baseline e2e: Rita Go Chat Flow
 *
 * Tests the authenticated chat experience at /chat using Keycloak SSO.
 * Validates message send/receive via SSE, conversation persistence,
 * and sidebar navigation.
 *
 * Prerequisites:
 *   - Full stack running (pnpm dev)
 *   - Keycloak running with test users (testuser/test)
 *   - DB reset to deterministic state (pnpm db:reset)
 *
 * Run manually with playwright-cli:
 *   export PWCLI="$HOME/.codex/skills/playwright/scripts/playwright_cli.sh"
 *
 *   # 1. Open auto-login endpoint (sets flags + redirects to Keycloak)
 *   "$PWCLI" open "http://localhost:5173/test/auto-login?redirect=/chat"
 *
 *   # 2. Fill Keycloak login form
 *   "$PWCLI" snapshot
 *   "$PWCLI" fill <username-ref> "testuser"
 *   "$PWCLI" fill <password-ref> "test"
 *   "$PWCLI" click <submit-ref>
 *
 *   # 3. Wait for chat page to load, take snapshot
 *   "$PWCLI" snapshot
 *
 *   # 4. Verify chat UI elements visible
 *   #    - Sidebar with conversation list
 *   #    - Chat input field at bottom
 *   #    - Header navigation
 *
 *   # 5. Type and send a message
 *   "$PWCLI" fill <input-ref> "Hello, this is a test message"
 *   "$PWCLI" click <send-button-ref>
 *
 *   # 6. Wait for SSE response, take snapshot
 *   "$PWCLI" snapshot
 *
 *   # 7. Verify conversation persists after reload
 *   "$PWCLI" open "http://localhost:5173/chat"
 *   "$PWCLI" snapshot
 *
 * Test accounts (from scripts/e2e/README.md):
 *   testuser / test   (owner role)
 *   testmember / test (member role)
 *
 * Deterministic IDs:
 *   Org:            11111111-1111-1111-1111-111111111111
 *   Owner:          22222222-2222-2222-2222-222222222222
 *   Conversation 1: 44444444-4444-4444-4444-444444444444
 *   Conversation 2: 55555555-5555-5555-5555-555555555555
 */

export interface FlowStep {
	action: string;
	url?: string;
	text?: string;
	description?: string;
	check?: string;
	verify: string;
}

export interface NetworkExpectation {
	[key: string]: string;
}

export interface UIExpectation {
	sidebar: boolean;
	headerNav: boolean;
	inputField: boolean;
	fileUpload: boolean;
}

export interface BaselineFlow {
	name: string;
	url: string;
	auth: string;
	steps: FlowStep[];
	expected_network: NetworkExpectation;
	expected_ui: UIExpectation;
}

export const RITA_GO_CHAT_FLOW: BaselineFlow = {
	name: "Rita Go Chat",
	url: "http://localhost:5173/chat",
	auth: "keycloak", // requires auto-login or pnpm e2e:login first

	steps: [
		{
			action: "navigate",
			url: "http://localhost:5173/test/auto-login?redirect=/chat",
			verify: "Keycloak login page loads with username and password fields",
		},
		{
			action: "keycloak_login",
			text: "testuser",
			description:
				"Fill Keycloak form: username=testuser, password=test, submit",
			verify: "Redirected to /chat after successful Keycloak authentication",
		},
		{
			action: "verify_chat_page",
			verify:
				"Chat page loads with sidebar (conversation list), header navigation, and input field at bottom",
		},
		{
			action: "verify_sse",
			description: "SSE connection established after auth",
			check:
				"Network tab shows EventSource connection to /api/sse/events (text/event-stream)",
			verify: "SSEProvider is connected (console: 'SSE connection opened')",
		},
		{
			action: "verify_seed_conversations",
			description: "Deterministic seed data visible",
			verify:
				"Sidebar shows seeded conversations (IDs 44444444... and 55555555...)",
		},
		{
			action: "send_message",
			text: "Hello, this is a test message",
			verify:
				"Message appears in conversation as user bubble (right-aligned), sent via POST /api/conversations/:id/messages",
		},
		{
			action: "wait_response",
			verify:
				"Assistant response arrives via SSE (message_update event with status=processing, then new_message event with role=assistant)",
		},
		{
			action: "verify_reasoning",
			description: "Check reasoning accordion if response includes metadata",
			verify:
				"If response has reasoning steps, accordion renders with collapsible content that can be toggled open/closed",
		},
		{
			action: "reload_page",
			url: "http://localhost:5173/chat",
			verify:
				"Conversation persists after page reload. Same messages visible via GET /api/conversations/:id/messages",
		},
		{
			action: "verify_sidebar_updated",
			verify:
				"Active conversation appears in sidebar list with last message preview, loaded via GET /api/conversations",
		},
		{
			action: "create_new_conversation",
			description: "Click new conversation button in sidebar",
			verify:
				"New conversation created, input field is empty and ready for first message",
		},
	],

	expected_network: {
		sse: "GET /api/sse/events (EventSource, text/event-stream)",
		send: "POST /api/conversations/:id/messages",
		list: "GET /api/conversations",
		messages: "GET /api/conversations/:id/messages",
		create: "POST /api/conversations",
	},

	expected_ui: {
		sidebar: true,
		headerNav: true,
		inputField: true,
		fileUpload: true,
	},
};
