import { createHash } from "node:crypto";
import type pg from "pg";
import pino from "pino";
import { withTransaction } from "./database.js";

const logger = pino({
	name: "confluence-sync",
	level: process.env.LOG_LEVEL || "info",
});

// Realistic Confluence page names — all lowercase snake_case
// These reproduce the case-sensitive sorting issue when mixed with uppercase manual uploads
const CONFLUENCE_PAGE_NAMES = [
	"ai_automation_and_agentic_ai",
	"company_onboarding_guide",
	"engineering_best_practices",
	"vpn_setup_instructions",
	"password_reset_procedures",
	"it_security_policy_2024",
	"remote_work_equipment_guide",
	"software_installation_requests",
	"network_troubleshooting_steps",
	"email_configuration_guide",
	"slack_integration_setup",
	"incident_response_runbook",
	"data_backup_and_recovery",
	"printer_setup_and_support",
	"new_employee_it_checklist",
	"hardware_replacement_policy",
	"cloud_services_overview",
	"two_factor_authentication_setup",
	"meeting_room_av_guide",
	"jira_workflow_documentation",
	"confluence_space_management",
	"office_wifi_troubleshooting",
	"laptop_encryption_requirements",
	"api_documentation_standards",
	"monitoring_and_alerting_guide",
	"database_access_procedures",
	"code_review_guidelines",
	"deployment_checklist",
	"disaster_recovery_plan",
	"vendor_access_management",
];

const CONFLUENCE_SPACES = ["ENG", "PROD", "DOCS"] as const;

const SPACE_NAMES: Record<string, string> = {
	ENG: "Engineering",
	PROD: "Production",
	DOCS: "Documentation",
};

// Content section templates per topic category
const CONTENT_SECTIONS: Record<string, string[]> = {
	security: [
		"## Overview\n\nThis document outlines the security procedures and policies that all team members must follow.",
		"## Requirements\n\n- All devices must have disk encryption enabled\n- Passwords must be at least 12 characters\n- Multi-factor authentication is mandatory for all systems\n- Report suspicious activity to security@company.com immediately",
		"## Compliance\n\nAll employees must complete annual security training. Non-compliance may result in access revocation.",
	],
	it_support: [
		"## Getting Started\n\nFollow these steps to resolve common IT issues before contacting the help desk.",
		"## Troubleshooting Steps\n\n1. Restart the application or device\n2. Check your network connection\n3. Clear browser cache and cookies\n4. Try accessing from a different device\n5. Submit a ticket if the issue persists",
		"## Contact Information\n\nIT Help Desk: helpdesk@company.com\nHours: Monday-Friday 8am-6pm\nEmergency: ext. 5555",
	],
	engineering: [
		"## Standards\n\nAll code must follow the team coding standards documented in this guide.",
		"## Process\n\n- Create a feature branch from main\n- Write tests before implementation\n- Submit a pull request with a clear description\n- Obtain at least two approvals before merging\n- Deploy to staging before production",
		"## Tools\n\nWe use the following tools for development:\n- GitHub for version control\n- Jira for project management\n- Confluence for documentation\n- Slack for communication",
	],
	operations: [
		"## Purpose\n\nThis runbook provides step-by-step instructions for handling operational incidents.",
		"## Procedures\n\n1. Identify the scope and severity of the incident\n2. Notify the on-call team via PagerDuty\n3. Begin investigation using monitoring dashboards\n4. Document findings in the incident channel\n5. Implement fix and verify resolution",
		"## Post-Incident\n\nSchedule a retrospective within 48 hours. Update this runbook with any new learnings.",
	],
	general: [
		"## Introduction\n\nThis page contains important information for all team members.",
		"## Key Points\n\n- Follow the established guidelines\n- Reach out to your team lead with questions\n- Keep documentation up to date\n- Review this page quarterly for updates",
		"## Resources\n\nAdditional resources can be found in the shared drive and team Slack channels.",
	],
};

// Map page names to content categories
function getContentCategory(pageName: string): string {
	if (
		pageName.includes("security") ||
		pageName.includes("password") ||
		pageName.includes("encryption") ||
		pageName.includes("authentication") ||
		pageName.includes("vendor_access")
	)
		return "security";
	if (
		pageName.includes("setup") ||
		pageName.includes("troubleshooting") ||
		pageName.includes("printer") ||
		pageName.includes("wifi") ||
		pageName.includes("vpn") ||
		pageName.includes("email") ||
		pageName.includes("equipment") ||
		pageName.includes("hardware") ||
		pageName.includes("software")
	)
		return "it_support";
	if (
		pageName.includes("code") ||
		pageName.includes("api") ||
		pageName.includes("database") ||
		pageName.includes("engineering")
	)
		return "engineering";
	if (
		pageName.includes("incident") ||
		pageName.includes("backup") ||
		pageName.includes("monitoring") ||
		pageName.includes("deployment") ||
		pageName.includes("disaster")
	)
		return "operations";
	return "general";
}

function generateConfluenceMarkdown(pageName: string): string {
	const title = pageName
		.replace(/_/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase());
	const category = getContentCategory(pageName);
	const sections = CONTENT_SECTIONS[category] || CONTENT_SECTIONS.general;

	return `# ${title}\n\n${sections.join("\n\n")}\n\n---\n*Last updated by Confluence sync*\n`;
}

function generateConfluenceMetadata(
	pageName: string,
	spaceKey: string,
): object {
	return {
		confluence_page_id: crypto.randomUUID(),
		space_key: spaceKey,
		space_name: SPACE_NAMES[spaceKey] || spaceKey,
		page_url: `https://confluence.company.com/wiki/spaces/${spaceKey}/pages/${Math.floor(Math.random() * 999999)}/${pageName}`,
		last_modified_by: "system",
		version: Math.floor(Math.random() * 20) + 1,
	};
}

function getWeightedStatus(): string {
	const rand = Math.random();
	if (rand < 0.7) return "processed";
	if (rand < 0.85) return "uploaded";
	return "processing";
}

function shuffleAndTake<T>(arr: T[], n: number): T[] {
	const shuffled = [...arr].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, Math.min(n, shuffled.length));
}

function getRandomCreatedAt(): Date {
	const now = new Date();
	return new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000);
}

export interface ConfluenceSyncResult {
	documentsCreated: number;
	documentsSkipped: number;
}

export interface ConfluenceSyncSettings {
	spaces?: string;
	sites?: string;
	[key: string]: unknown;
}

/**
 * Simulate Confluence document sync by inserting realistic test data.
 *
 * Generates 15-25 documents with lowercase snake_case filenames
 * (matching real Confluence page naming conventions) to test
 * case-insensitive sorting in the Knowledge Articles table.
 */
export async function syncConfluenceData(
	organizationId: string,
	connectionId: string,
	userId: string,
): Promise<ConfluenceSyncResult> {
	logger.info(
		{ organizationId, connectionId, userId },
		"Starting Confluence data sync",
	);

	return withTransaction(async (client: pg.PoolClient) => {
		// 1. Clean up existing confluence documents for this organization
		const deleteResult = await client.query(
			"DELETE FROM blob_metadata WHERE organization_id = $1 AND source = 'confluence'",
			[organizationId],
		);
		logger.debug(
			{ deleted: deleteResult.rowCount },
			"Cleaned up existing confluence documents",
		);

		// Clean up orphaned blobs
		await client.query(
			"DELETE FROM blobs WHERE blob_id NOT IN (SELECT blob_id FROM blob_metadata)",
		);

		// 2. Select 15-25 random pages
		const pageCount = 15 + Math.floor(Math.random() * 11);
		const selectedPages = shuffleAndTake(CONFLUENCE_PAGE_NAMES, pageCount);

		let documentsCreated = 0;

		for (const pageName of selectedPages) {
			const spaceKey =
				CONFLUENCE_SPACES[Math.floor(Math.random() * CONFLUENCE_SPACES.length)];
			const content = generateConfluenceMarkdown(pageName);
			const contentBuffer = Buffer.from(content, "utf-8");
			const digest = createHash("sha256").update(contentBuffer).digest("hex");

			// 3a. Insert blob
			const blobResult = await client.query<{ blob_id: string }>(
				`INSERT INTO blobs (blob_id, data, digest)
				VALUES (gen_random_uuid(), $1, $2)
				ON CONFLICT (digest) DO UPDATE SET blob_id = blobs.blob_id
				RETURNING blob_id`,
				[contentBuffer, digest],
			);
			const blobId = blobResult.rows[0].blob_id;

			// 3b. Determine status and processed_markdown
			const status = getWeightedStatus();
			const processedMarkdown = status === "processed" ? content : null;

			// 3c. Insert blob_metadata
			const metadata = generateConfluenceMetadata(pageName, spaceKey);
			const createdAt = getRandomCreatedAt();

			await client.query(
				`INSERT INTO blob_metadata (
					blob_id, organization_id, user_id, filename, file_size, mime_type,
					status, processed_markdown, metadata, source, created_at, updated_at
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, 'confluence', $10, NOW())`,
				[
					blobId,
					organizationId,
					userId,
					pageName,
					contentBuffer.length,
					"text/plain",
					status,
					processedMarkdown,
					JSON.stringify(metadata),
					createdAt,
				],
			);

			documentsCreated++;
		}

		logger.info(
			{ organizationId, documentsCreated, pageCount },
			"Confluence data sync completed",
		);

		return { documentsCreated, documentsSkipped: 0 };
	});
}
