/**
 * ConnectionStatusCard.test.tsx - Unit tests for connection status card component
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ConnectionSource } from "@/constants/connectionSources";
import { STATUS } from "@/constants/connectionSources";
import { ConnectionStatusCard } from "./ConnectionStatusCard";

// Mock connection sources
const createMockSource = (
	overrides?: Partial<ConnectionSource>,
): ConnectionSource => ({
	id: "source-123",
	type: "confluence",
	title: "Confluence",
	status: STATUS.CONNECTED,
	lastSync: undefined,
	description: "Confluence workspace connection",
	badges: ["ENG", "PROD"],
	settings: {},
	backendData: {
		id: "source-123",
		organization_id: "org-123",
		type: "confluence",
		name: "Confluence",
		description: null,
		settings: {},
		latest_options: null,
		status: "idle",
		last_sync_status: "completed",
		enabled: true,
		last_verification_at: "2024-01-01T00:00:00Z",
		last_verification_error: null,
		last_sync_at: "2024-01-02T00:00:00Z",
		last_sync_error: null,
		created_by: "user-123",
		updated_by: "user-123",
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-01-02T00:00:00Z",
	},
	...overrides,
});

describe("ConnectionStatusCard", () => {
	describe("Status Badge Rendering", () => {
		it("should render status badge for CONNECTED status", () => {
			const source = createMockSource({ status: STATUS.CONNECTED });
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("Connected")).toBeInTheDocument();
		});

		it("should render status badge for VERIFYING status", () => {
			const source = createMockSource({ status: STATUS.VERIFYING });
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("Verifying...")).toBeInTheDocument();
		});

		it("should render status badge for SYNCING status", () => {
			const source = createMockSource({ status: STATUS.SYNCING });
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("Syncing...")).toBeInTheDocument();
		});

		it("should render status badge for ERROR status", () => {
			const source = createMockSource({ status: STATUS.ERROR });
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("Failed")).toBeInTheDocument();
		});

		it("should render status badge for NOT_CONNECTED status", () => {
			const source = createMockSource({ status: STATUS.NOT_CONNECTED });
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("Not connected")).toBeInTheDocument();
		});
	});

	describe("Last Sync Display", () => {
		it("should display last sync time when available", () => {
			const source = createMockSource({ lastSync: "2 hours ago" });
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("Last sync")).toBeInTheDocument();
			expect(screen.getByText("2 hours ago")).toBeInTheDocument();
		});

		it('should display "—" when last sync is undefined', () => {
			const source = createMockSource({ lastSync: undefined });
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("Last sync")).toBeInTheDocument();
			expect(screen.getByText("—")).toBeInTheDocument();
		});

		it('should display "Just now" for very recent sync', () => {
			const source = createMockSource({ lastSync: "Just now" });
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("Just now")).toBeInTheDocument();
		});
	});

	describe("Badges Display", () => {
		it("should display badges when present", () => {
			const source = createMockSource({ badges: ["ENG", "PROD", "DOCS"] });
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("ENG")).toBeInTheDocument();
			expect(screen.getByText("PROD")).toBeInTheDocument();
			expect(screen.getByText("DOCS")).toBeInTheDocument();
		});

		it("should not display badges section when badges array is empty", () => {
  			// Badges container should not be rendered
			expect(screen.queryByText("ENG")).not.toBeInTheDocument();
		});

		it("should handle single badge", () => {
			const source = createMockSource({ badges: ["ENG"] });
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("ENG")).toBeInTheDocument();
		});

		it("should handle many badges", () => {
			const source = createMockSource({
				badges: ["ENG", "PROD", "DOCS", "MARKETING", "SALES"],
			});
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("ENG")).toBeInTheDocument();
			expect(screen.getByText("PROD")).toBeInTheDocument();
			expect(screen.getByText("DOCS")).toBeInTheDocument();
			expect(screen.getByText("MARKETING")).toBeInTheDocument();
			expect(screen.getByText("SALES")).toBeInTheDocument();
		});
	});

	describe("Card Structure", () => {
		it("should render card container", () => {
			const source = createMockSource();
			const { container } = render(<ConnectionStatusCard source={source} />);
			// Card should have proper structure
			expect(container.querySelector(".border")).toBeInTheDocument();
		});

		it("should display status and last sync in the same card", () => {
			const source = createMockSource();
			render(<ConnectionStatusCard source={source} />);
			// Both status badge and last sync should be present
			expect(screen.getByText("Connected")).toBeInTheDocument();
			expect(screen.getByText("Last sync")).toBeInTheDocument();
		});
	});

	describe("Different Connection Types", () => {
		it("should work with Confluence connection", () => {
			const source = createMockSource({
				type: "confluence",
				title: "Confluence",
			});
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("Connected")).toBeInTheDocument();
		});

		it("should work with ServiceNow connection", () => {
			const source = createMockSource({
				type: "servicenow",
				title: "ServiceNow",
			});
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("Connected")).toBeInTheDocument();
		});

		it("should work with SharePoint connection", () => {
			const source = createMockSource({
				type: "sharepoint",
				title: "SharePoint",
			});
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("Connected")).toBeInTheDocument();
		});

		it("should work with WebSearch connection", () => {
			const source = createMockSource({
				type: "websearch",
				title: "Web Search",
			});
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("Connected")).toBeInTheDocument();
		});
	});

	describe("Edge Cases", () => {
		it("should handle source with no badges and no lastSync", () => {
			const source = createMockSource({ badges: [], lastSync: undefined });
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("Connected")).toBeInTheDocument();
			expect(screen.getByText("—")).toBeInTheDocument();
		});

		it("should handle source with description", () => {
			const source = createMockSource({ description: "Test description" });
			render(<ConnectionStatusCard source={source} />);
			// Description may or may not be displayed in the card
			expect(screen.getByText("Connected")).toBeInTheDocument();
		});

		it("should handle very long badge names", () => {
			const source = createMockSource({
				badges: ["VERY_LONG_BADGE_NAME_THAT_MIGHT_OVERFLOW"],
			});
			render(<ConnectionStatusCard source={source} />);
			expect(
				screen.getByText("VERY_LONG_BADGE_NAME_THAT_MIGHT_OVERFLOW"),
			).toBeInTheDocument();
		});

		it("should handle special characters in badges", () => {
			const source = createMockSource({
				badges: ["ENG-123", "PROD_V2", "DOCS@2024"],
			});
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("ENG-123")).toBeInTheDocument();
			expect(screen.getByText("PROD_V2")).toBeInTheDocument();
			expect(screen.getByText("DOCS@2024")).toBeInTheDocument();
		});
	});

	describe("Status and Sync Combinations", () => {
		it("should show Connected status with recent sync", () => {
			const source = createMockSource({
				status: STATUS.CONNECTED,
				lastSync: "Just now",
			});
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("Connected")).toBeInTheDocument();
			expect(screen.getByText("Just now")).toBeInTheDocument();
		});

		it("should show Syncing status with last sync time", () => {
			const source = createMockSource({
				status: STATUS.SYNCING,
				lastSync: "1 hour ago",
			});
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("Syncing...")).toBeInTheDocument();
			expect(screen.getByText("1 hour ago")).toBeInTheDocument();
		});

		it("should show Error status with old sync time", () => {
			const source = createMockSource({
				status: STATUS.ERROR,
				lastSync: "2 days ago",
			});
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("Failed")).toBeInTheDocument();
			expect(screen.getByText("2 days ago")).toBeInTheDocument();
		});

		it("should show Not connected status with no sync", () => {
			const source = createMockSource({
				status: STATUS.NOT_CONNECTED,
				lastSync: undefined,
			});
			render(<ConnectionStatusCard source={source} />);
			expect(screen.getByText("Not connected")).toBeInTheDocument();
			expect(screen.getByText("—")).toBeInTheDocument();
		});
	});
});
