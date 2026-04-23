/**
 * Baseline E2E Flow Specs
 *
 * Documentation-as-code describing the three primary e2e flows for Rita.
 * Each spec defines the exact steps, expected network calls, and UI state
 * for manual validation via playwright-cli.
 *
 * Usage:
 *   These are NOT run via a test runner (@playwright/test). They are
 *   shell-driven specs executed manually with the playwright-cli wrapper:
 *
 *   export PWCLI="$HOME/.codex/skills/playwright/scripts/playwright_cli.sh"
 *   "$PWCLI" open <url>
 *   "$PWCLI" snapshot
 *   "$PWCLI" fill <ref> "text"
 *   "$PWCLI" click <ref>
 *
 * Flows:
 *   1. Rita Go Chat   - Authenticated chat via Keycloak (/chat)
 *   2. Iframe Chat     - Embedded chat via Valkey session (/iframe/chat)
 *   3. Iframe Host     - Demo host page that embeds iframe (port 5174)
 *
 * Prerequisites:
 *   pnpm dev          # Full stack (docker + all services)
 *   pnpm db:reset     # Deterministic seed data
 *   pnpm e2e:check    # Verify all services healthy
 */

export type { IframeBaselineFlow, IframeFlowStep } from "./iframe-chat.spec";
export { IFRAME_CHAT_FLOW } from "./iframe-chat.spec";
export type { HostBaselineFlow, HostFlowStep } from "./iframe-host.spec";
export { IFRAME_HOST_FLOW } from "./iframe-host.spec";
export type { BaselineFlow, FlowStep } from "./rita-go-chat.spec";
export { RITA_GO_CHAT_FLOW } from "./rita-go-chat.spec";

/** All baseline flows for iteration */
export const ALL_FLOWS = {
	"rita-go-chat": () =>
		import("./rita-go-chat.spec").then((m) => m.RITA_GO_CHAT_FLOW),
	"iframe-chat": () =>
		import("./iframe-chat.spec").then((m) => m.IFRAME_CHAT_FLOW),
	"iframe-host": () =>
		import("./iframe-host.spec").then((m) => m.IFRAME_HOST_FLOW),
} as const;

export type FlowName = keyof typeof ALL_FLOWS;
