import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import axios from "axios";
import cors from "cors";
import { config } from "dotenv";
import express from "express";
import { blobExists, getBlobContent, listBlobIds } from "./blob-storage.js";
import {
	configLogger,
	createContextLogger,
	generateCorrelationId,
	logError,
	logger,
	PerformanceTimer,
	webhookLogger,
} from "./config/logger.js";
import { emailService } from "./email-service.js";
import { syncServiceNowData } from "./servicenow-sync.js";
import { getRabbitMQService } from "./services/rabbitmq.js";

// Load environment from root .env file
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const app = express();
const PORT = process.env.MOCK_SERVICE_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock service configuration
const MOCK_CONFIG = {
	// Response scenarios: 'success', 'failure', 'timeout', 'processing'
	defaultScenario: process.env.MOCK_SCENARIO || "success",
	// Response delays in milliseconds
	responseDelay: parseInt(process.env.MOCK_DELAY || "2000", 10),
	// Success rate (0-100)
	successRate: parseInt(process.env.MOCK_SUCCESS_RATE || "90", 10),
	// RabbitMQ configuration
	queueName: process.env.QUEUE_NAME || "chat.responses",
	rabbitUrl: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
	// Keycloak configuration
	keycloak: {
		baseUrl: process.env.KEYCLOAK_URL || "http://localhost:8080",
		realm: process.env.KEYCLOAK_REALM || "resolve",
		adminUser: process.env.KEYCLOAK_ADMIN || "admin",
		adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD || "admin",
		clientId: process.env.KEYCLOAK_CLIENT_ID || "rita-client",
	},
};

// Base webhook payload shared by all webhook types
interface BaseWebhookPayload {
	source: string;
	action: string;
	user_email?: string;
	user_id?: string;
	tenant_id: string;
	timestamp?: string;
}

// Message webhook payload for rita-chat
interface MessageWebhookPayload extends BaseWebhookPayload {
	source: "rita-chat";
	action: "message_created";
	conversation_id: string;
	customer_message: string;
	message_id: string;
	document_ids?: string[];
	transcript_ids?: {
		transcripts: Array<{ role: string; content: string }>;
	};
}

// Document webhook payload for rita-documents
interface DocumentWebhookPayload extends BaseWebhookPayload {
	source: "rita-documents";
	action: "document_uploaded";
	blob_metadata_id: string; // blob_metadata.id
	blob_id: string; // blobs.blob_id
	document_url: string;
	file_type: string;
	file_size: number;
	original_filename: string;
}

// Document deletion webhook payload for rita-documents
interface DocumentDeletePayload extends BaseWebhookPayload {
	source: "rita-documents";
	action: "document_deleted";
	blob_metadata_id: string; // blob_metadata.id
	blob_id: string; // blobs.blob_id
}

// Signup webhook payload for rita-signup
interface SignupWebhookPayload extends BaseWebhookPayload {
	source: "rita-signup";
	action: "user_signup";
	first_name: string;
	last_name: string;
	company: string;
	password: string;
	verification_token: string;
	verification_url: string;
	pending_user_id: string;
}

// Invitation webhook payloads for rita-invitations
interface SendInvitationWebhookPayload extends BaseWebhookPayload {
	source: "rita-invitations";
	action: "send_invitation";
	organization_name: string;
	invited_by_email: string;
	invited_by_name: string;
	invitations: Array<{
		invitee_email: string;
		invitation_token: string;
		invitation_url: string;
		invitation_id: string;
		expires_at: string;
	}>;
}

interface AcceptInvitationWebhookPayload extends BaseWebhookPayload {
	source: "rita-invitations";
	action: "accept_invitation";
	invitation_id: string;
	first_name: string;
	last_name: string;
	password: string;
	email_verified: boolean;
}

// Member management webhook payloads for rita-member-management
interface DeleteKeycloakUserPayload extends BaseWebhookPayload {
	source: "rita-member-management";
	action: "delete_keycloak_user";
	delete_tenant?: boolean; // If true, external service should delete entire organization data
	additional_emails?: string[]; // Additional member emails to delete from Keycloak
	reason?: string;
}

// Data source webhook payloads for rita-data-sources
interface DataSourceVerifyPayload extends BaseWebhookPayload {
	source: "rita-chat";
	action: "verify_credentials";
	connection_id: string;
	connection_type: string;
	credentials: Record<string, any>;
	settings: Record<string, any>;
}

interface DataSourceSyncPayload extends BaseWebhookPayload {
	source: "rita-chat";
	action: "trigger_sync";
	connection_id: string;
	connection_type: string;
	settings: Record<string, any>;
}

// Credential delegation webhook payload (send email)
interface CredentialDelegationEmailPayload extends BaseWebhookPayload {
	source: "rita-credential-delegation";
	action: "send_delegation_email";
	admin_email: string;
	delegation_url: string;
	organization_name: string;
	itsm_system_type: string;
	delegation_token_id: string;
	expires_at: string;
}

// ITSM ticket sync webhook payload (Autopilot)
interface SyncTicketsWebhookPayload extends BaseWebhookPayload {
	source: "rita-chat";
	action: "sync_tickets";
	connection_id: string;
	connection_type: string;
	ingestion_run_id: string;
	settings: {
		instanceUrl?: string;
		username?: string;
		time_range_days?: number;
		itsm_tables?: string[];
	};
}

// Union type for all webhook payloads
type WebhookPayload =
	| MessageWebhookPayload
	| DocumentWebhookPayload
	| DocumentDeletePayload
	| SignupWebhookPayload
	| SendInvitationWebhookPayload
	| AcceptInvitationWebhookPayload
	| DeleteKeycloakUserPayload
	| DataSourceVerifyPayload
	| DataSourceSyncPayload
	| SyncTicketsWebhookPayload
	| CredentialDelegationEmailPayload
	| BaseWebhookPayload;

interface MockResponse {
	message_id: string;
	conversation_id: string;
	tenant_id: string;
	user_id?: string;
	response: string;
	metadata?: any;
	response_group_id?: string;
}

interface MessagePart {
	type: "text" | "reasoning" | "sources" | "tasks" | "files";
	metadata?: Record<string, unknown>;
	[key: string]: unknown;
}

// Track cancelled sync operations to prevent sending sync_completed
const cancelledSyncConnections = new Set<string>();

// Helper to publish response to default queue
async function publishResponse(response: MockResponse): Promise<void> {
	const rabbitmqService = getRabbitMQService();
	await rabbitmqService.publishToQueue(MOCK_CONFIG.queueName, response);
}

// Keycloak Admin API functions
let keycloakAdminToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getKeycloakAdminToken(): Promise<string> {
	const timer = new PerformanceTimer(webhookLogger, "keycloak-admin-token");

	// Return cached token if still valid (with 30 second buffer)
	if (keycloakAdminToken && Date.now() < tokenExpiresAt - 30000) {
		timer.end({ cached: true, success: true });
		return keycloakAdminToken;
	}

	try {
		const response = await axios.post(
			`${MOCK_CONFIG.keycloak.baseUrl}/realms/master/protocol/openid-connect/token`,
			new URLSearchParams({
				grant_type: "password",
				client_id: "admin-cli",
				username: MOCK_CONFIG.keycloak.adminUser,
				password: MOCK_CONFIG.keycloak.adminPassword,
			}),
			{
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
			},
		);

		keycloakAdminToken = response.data.access_token;
		tokenExpiresAt = Date.now() + response.data.expires_in * 1000;

		timer.end({ cached: false, success: true });
		return keycloakAdminToken;
	} catch (error) {
		timer.end({ success: false });
		logError(webhookLogger, error as Error, {
			operation: "keycloak-admin-token",
		});
		throw new Error("Failed to get Keycloak admin token");
	}
}

async function createKeycloakUser(
	signupData: SignupWebhookPayload,
): Promise<string> {
	const timer = new PerformanceTimer(webhookLogger, "create-keycloak-user");
	const contextLogger = createContextLogger(
		webhookLogger,
		generateCorrelationId(),
		{
			email: signupData.user_email,
			pendingUserId: signupData.pending_user_id,
		},
	);

	try {
		const adminToken = await getKeycloakAdminToken();

		const userData = {
			username: signupData.user_email,
			email: signupData.user_email,
			firstName: signupData.first_name,
			lastName: signupData.last_name,
			enabled: true,
			emailVerified: true, // Mark as verified for local development testing
			credentials: [
				{
					type: "password",
					value: Buffer.from(signupData.password, "base64").toString("utf8"),
					temporary: false,
				},
			],
			attributes: {
				company: [signupData.company],
				pendingUserId: [signupData.pending_user_id],
				verificationToken: [signupData.verification_token],
			},
		};

		const response = await axios.post(
			`${MOCK_CONFIG.keycloak.baseUrl}/admin/realms/${MOCK_CONFIG.keycloak.realm}/users`,
			userData,
			{
				headers: {
					Authorization: `Bearer ${adminToken}`,
					"Content-Type": "application/json",
				},
			},
		);

		// Extract user ID from Location header
		const locationHeader = response.headers.location;
		const userId = locationHeader ? locationHeader.split("/").pop() : "unknown";

		timer.end({
			email: signupData.user_email,
			keycloakUserId: userId,
			success: true,
		});

		contextLogger.info(
			{
				keycloakUserId: userId,
				keycloakRealm: MOCK_CONFIG.keycloak.realm,
			},
			"Keycloak user created successfully",
		);

		return userId;
	} catch (error) {
		timer.end({ success: false });
		logError(contextLogger, error as Error, {
			operation: "create-keycloak-user",
			keycloakRealm: MOCK_CONFIG.keycloak.realm,
		});
		throw error;
	}
}

async function deleteKeycloakUser(
	email: string,
	userId?: string,
): Promise<void> {
	const timer = new PerformanceTimer(webhookLogger, "delete-keycloak-user");
	const contextLogger = createContextLogger(
		webhookLogger,
		generateCorrelationId(),
		{
			email,
			userId,
		},
	);

	try {
		const adminToken = await getKeycloakAdminToken();

		// If userId not provided, find user by email
		let keycloakUserId = userId;
		if (!keycloakUserId) {
			const usersResponse = await axios.get(
				`${MOCK_CONFIG.keycloak.baseUrl}/admin/realms/${MOCK_CONFIG.keycloak.realm}/users`,
				{
					params: { email, exact: true },
					headers: {
						Authorization: `Bearer ${adminToken}`,
						"Content-Type": "application/json",
					},
				},
			);

			if (usersResponse.data.length === 0) {
				throw new Error(`User not found in Keycloak: ${email}`);
			}

			keycloakUserId = usersResponse.data[0].id;
		}

		// Delete user from Keycloak
		await axios.delete(
			`${MOCK_CONFIG.keycloak.baseUrl}/admin/realms/${MOCK_CONFIG.keycloak.realm}/users/${keycloakUserId}`,
			{
				headers: {
					Authorization: `Bearer ${adminToken}`,
					"Content-Type": "application/json",
				},
			},
		);

		timer.end({
			email,
			keycloakUserId,
			success: true,
		});

		contextLogger.info(
			{
				keycloakUserId,
				keycloakRealm: MOCK_CONFIG.keycloak.realm,
			},
			"Keycloak user deleted successfully",
		);
	} catch (error) {
		timer.end({ success: false });
		logError(contextLogger, error as Error, {
			operation: "delete-keycloak-user",
			keycloakRealm: MOCK_CONFIG.keycloak.realm,
			email,
		});
		throw error;
	}
}

function generateMockResponse(
	payload: WebhookPayload,
	scenario?: string,
): MockResponse[] | null {
	// Only generate responses for rita-chat messages (regular or iframe), not document processing
	if (payload.source !== "rita-chat" && payload.source !== "rita-chat-iframe") {
		return null;
	}

	const messagePayload = payload as MessageWebhookPayload;
	const content = messagePayload.customer_message.toLowerCase();
	const documentCount = messagePayload.document_ids?.length || 0;

	// Generate a unique response group ID for this multi-part response (UUID format)
	const responseGroupId = randomUUID();

	const parts: MessagePart[] = [];

	// Check for test trigger words first
	if (content.startsWith("test1")) {
		// test1: Normal text message only
		parts.push({
			type: "text",
			text: `## Simple Text Response ✅

This is a **normal text message** without any reasoning, sources, or tasks.

You triggered: **"${messagePayload.customer_message}"**

### Features
- Clean markdown formatting
- **Bold text** and *italic text*
- Code snippets: \`npm install\`

\`\`\`javascript
console.log('Hello from test1!');
\`\`\`

> This is a simple response to test basic text rendering.`,
		});
	} else if (content.startsWith("test2")) {
		// test2: Reasoning + text message
		parts.push({
			type: "reasoning",
			text: `Let me think about your test2 request:\n\n1. You want to see reasoning + text combination\n2. I'll process this step by step\n3. Then provide a detailed text response`,
			state: "done",
		});
		parts.push({
			type: "text",
			text: `## Reasoning + Text Response 🧠

I've analyzed your **"${messagePayload.customer_message}"** request with reasoning.

### What happened:
- **Step 1**: Reasoning was displayed first
- **Step 2**: Now showing the main text response
- **Step 3**: Testing the combination works correctly

This tests the reasoning → text flow in the UI.`,
		});
	} else if (
		content.toLowerCase().includes("test citations") ||
		content.toLowerCase().includes("show citations")
	) {
		// Test citations with blob_id (for testing the new citation feature)
		parts.push({
			type: "text",
			text: `## Citation Test with Document References

This response demonstrates the citation feature with real document references using blob_id.

### Features Being Tested:
- **Document Title Fetching**: Citations automatically fetch document titles from blob_id via API
- **Collapsible Dropdown**: Click "Used 3 sources" to expand and see all citations
- **Modal Display**: Click any citation to view the full document in a modal
- **Real API Integration**: Uses the actual file API endpoints for metadata and content

### How It Works:
The Rita system provides enterprise-grade workflow automation with SOC2 Type II compliance. Security hardening features include authentication, encryption, and audit logging across all components. Real-time monitoring capabilities enable comprehensive observability with alerting and metrics collection.

### Test Instructions:
1. Look below for the "Used 3 sources" collapsible dropdown
2. Click to expand and see the list of documents (titles fetched automatically)
3. Click any document name to open a modal with the full content
4. Notice the document titles are fetched automatically from blob_id (not UUIDs!)

*All citations reference real documents stored in the blob storage system.*`,
		});
		parts.push({
			type: "sources",
			sources: [
				{
					title: "Rita Automation Implementation Guide",
					url: "#",
				},
				{
					title: "Production Security Hardening Guide",
					url: "#",
				},
				{
					title: "Production Monitoring and Observability",
					url: "#",
				},
			],
		});
	} else if (
		content.toLowerCase().includes("test single source") ||
		content.toLowerCase().includes("one source")
	) {
		// Test single source (for testing singular "Used 1 source" display)
		parts.push({
			type: "text",
			text: `## Single Source Test

This response tests the singular form: **"Used 1 source"** instead of "sources".

The information provided is based on a single document reference. This ensures proper grammar in the UI when only one source is cited.`,
		});
		parts.push({
			type: "sources",
			sources: [
				{
					title: "Rita Automation Implementation Guide",
					url: "#",
				},
			],
		});
	} else if (content.startsWith("test3")) {
		// test3: Text + sources
		parts.push({
			type: "text",
			text: `## Text + Sources Response 📚

Your request **"${messagePayload.customer_message}"** triggered a text response with sources.

### Information Provided:
- Main content in this text block
- Related sources listed below
- Documentation references included

Check the sources section for additional resources!`,
		});
		parts.push({
			type: "sources",
			sources: [
				{
					url: "https://docs.resolve.com/test3",
					title: "Test3 Documentation",
					snippet:
						"Complete documentation for Test3 features including setup, configuration, and advanced usage. Learn how to integrate Test3 with your existing workflows.",
				},
				{
					url: "https://github.com/resolve-io/test3",
					title: "Test3 GitHub Repository",
					snippet:
						"Open source repository containing the full Test3 implementation, examples, and test suite. Contributions welcome!",
				},
				{
					url: "https://blog.resolve.com/test3-guide",
					title: "Complete Test3 Guide",
					snippet:
						"Step-by-step guide covering common Test3 patterns, best practices, and troubleshooting tips from the engineering team.",
				},
			],
		});
	} else if (content.startsWith("test4")) {
		// test4: Text + tasks
		parts.push({
			type: "text",
			text: `## Text + Tasks Response ✅

Your **"${messagePayload.customer_message}"** request includes actionable tasks.

### Overview:
- Main response content here
- Automated tasks are generated below
- Ready for immediate execution

Review the task list to see what actions are available.`,
		});
		parts.push({
			type: "tasks",
			tasks: [
				{
					title: "Test4 Primary Tasks",
					defaultOpen: true,
					items: [
						"Initialize test4 environment",
						"Configure test4 settings",
						"Run test4 validation",
						"Generate test4 report",
					],
				},
				{
					title: "Test4 Cleanup Tasks",
					defaultOpen: false,
					items: [
						"Clean temporary test4 files",
						"Reset test4 configuration",
						"Archive test4 logs",
					],
				},
			],
		});
	} else if (content.startsWith("test5")) {
		// test5: Full response (reasoning + text + sources + tasks)
		parts.push({
			type: "reasoning",
			text: `Processing your test5 request comprehensively:\n\n1. Analyzing the full response requirement\n2. Preparing reasoning, text, sources, and tasks\n3. Ensuring all components work together seamlessly`,
			state: "done",
		});
		parts.push({
			type: "text",
			text: `## Complete Response Suite 🎯

Your **"${messagePayload.customer_message}"** triggered the full response with all components.

### Components Included:
- **Reasoning**: Step-by-step analysis ✅
- **Text Response**: This main content ✅
- **Sources**: Reference documentation ✅
- **Tasks**: Actionable items ✅

This tests the complete grouped message functionality.`,
		});
		parts.push({
			type: "sources",
			sources: [
				{
					url: "https://docs.resolve.com/complete-guide",
					title: "Complete Feature Guide",
				},
				{
					url: "https://docs.resolve.com/testing",
					title: "Testing Best Practices",
				},
				{
					url: "https://docs.resolve.com/components",
					title: "Component Documentation",
				},
			],
		});
		parts.push({
			type: "tasks",
			tasks: [
				{
					title: "Full Suite Validation",
					defaultOpen: true,
					items: [
						"Verify reasoning display",
						"Check text formatting",
						"Validate sources rendering",
						"Confirm task functionality",
					],
				},
			],
		});
	} else if (content.startsWith("test6")) {
		// test6: Just reasoning
		parts.push({
			type: "reasoning",
			text: `This is a reasoning-only response for your test6 request:\n\n1. You specifically asked for just reasoning\n2. No other components will be generated\n3. This tests the standalone reasoning display\n4. The reasoning should appear in a collapsible section\n5. Perfect for testing the reasoning component in isolation`,
			state: "done",
		});
	} else if (content.startsWith("test7")) {
		// test7: Just sources
		parts.push({
			type: "sources",
			sources: [
				{
					url: "https://docs.resolve.com/sources-only",
					title: "Sources-Only Test Documentation",
				},
				{
					url: "https://api.resolve.com/sources",
					title: "Sources API Reference",
				},
				{
					url: "https://github.com/resolve-io/sources",
					title: "Sources Component Repository",
				},
				{
					url: "https://blog.resolve.com/sources-guide",
					title: "How to Use Sources Effectively",
				},
				{
					url: "https://community.resolve.com/sources",
					title: "Community Sources Discussion",
				},
			],
		});
	} else if (content.startsWith("test8")) {
		// test8: Just tasks
		parts.push({
			type: "tasks",
			tasks: [
				{
					title: "Primary Test8 Operations",
					defaultOpen: true,
					items: [
						"Execute standalone task test",
						"Verify task component isolation",
						"Check task item rendering",
						"Validate task interaction",
					],
				},
				{
					title: "Secondary Test8 Operations",
					defaultOpen: false,
					items: [
						"Run background task validation",
						"Test task completion tracking",
						"Generate task execution report",
					],
				},
				{
					title: "Test8 Cleanup",
					defaultOpen: false,
					items: [
						"Clean task workspace",
						"Archive task results",
						"Reset task environment",
					],
				},
			],
		});
	} else if (content.startsWith("test9")) {
		// test9: Reasoning + sources
		parts.push({
			type: "reasoning",
			text: `Analyzing your test9 request for reasoning + sources combination:\n\n1. This tests reasoning followed by sources\n2. No text or tasks will be included\n3. Useful for information-gathering scenarios\n4. Sources provide additional context to the reasoning`,
			state: "done",
		});
		parts.push({
			type: "sources",
			sources: [
				{
					url: "https://docs.resolve.com/reasoning-sources",
					title: "Reasoning + Sources Pattern",
				},
				{
					url: "https://research.resolve.com/analysis",
					title: "Analysis Methodology",
				},
				{
					url: "https://docs.resolve.com/test9",
					title: "Test9 Combination Guide",
				},
			],
		});
	} else if (content.toLowerCase().startsWith("show all citations")) {
		// Consolidated citation examples demonstrating all formats and variants
		parts.push({
			type: "text",
			text: `## Citation Examples Demonstration

This response demonstrates all citation UI variants available in Rita:

### UI Variants Demonstrated Below
1. **hover-card**: Default inline interaction with badges
2. **modal**: Focused overlay display
3. **right-panel**: Side-by-side reading experience
4. **collapsible-list**: Expandable list view
5. **inline**: Citation markers embedded in text

Each section below uses a different citation variant.`,
		});

		// 1. Hover-card variant
		parts.push({
			type: "text",
			text: `### 1. Hover-Card Variant
Inline citation badges with hover interaction.`,
		});
		parts.push({
			type: "sources",
			metadata: { citation_variant: "hover-card" },
			sources: [
				{
					url: "https://docs.resolve.com/quick-reference",
					title: "Quick Reference Guide",
				},
				{
					title: "Rita Automation Documentation",
					snippet: "...this is the quote you're looking for...",
					blob_id: "blob_automation_guide_v2024",
				},
			],
		});

		// 2. Modal variant
		parts.push({
			type: "text",
			text: `### 2. Modal Variant
Citations displayed in a focused modal overlay. Click "View full document" to see the complete 824-line guide with Mermaid diagrams.`,
		});
		parts.push({
			type: "sources",
			metadata: { citation_variant: "modal" },
			sources: [
				{
					title: "Rita Automation Implementation Guide",
					snippet:
						"...comprehensive guide covering architecture, deployment, and best practices for enterprise automation...",
					blob_id: "blob_automation_guide_v2024",
				},
				{
					url: "https://research.enterprise.com/patterns",
					title: "Enterprise Architecture Patterns",
					snippet:
						"...scalable patterns for microservices, event-driven systems, and distributed processing...",
				},
			],
		});

		// 3. Right-panel variant
		parts.push({
			type: "text",
			text: `### 3. Right-Panel Variant
Side-by-side reading with sources in a right panel. Both sources use the same 824-line document with Mermaid diagrams.`,
		});
		parts.push({
			type: "sources",
			metadata: { citation_variant: "right-panel" },
			sources: [
				{
					title: "Rita Automation Implementation Guide",
					snippet:
						"...comprehensive guide covering architecture, deployment, and best practices for enterprise automation...",
					blob_id: "blob_automation_guide_v2024",
				},
				{
					title: "Rita Automation Implementation Guide (Copy 2)",
					snippet:
						"...same comprehensive guide with architecture diagrams and deployment instructions...",
					blob_id: "blob_automation_guide_v2024",
				},
			],
		});

		// 4. Collapsible-list variant
		parts.push({
			type: "text",
			text: `### 4. Collapsible-List Variant
Traditional expandable list view of citations.`,
		});
		parts.push({
			type: "sources",
			metadata: { citation_variant: "collapsible-list" },
			sources: [
				{
					title: "Rita Automation Implementation Guide",
					snippet:
						"...comprehensive guide covering architecture, deployment, and best practices...",
					blob_id: "blob_automation_guide_v2024",
				},
				{
					url: "https://research.enterprise.com/patterns",
					title: "Enterprise Architecture Patterns",
					snippet:
						"...scalable patterns for microservices, event-driven systems...",
				},
				{
					title: "Production Security Hardening Guide",
					snippet:
						"...defense-in-depth strategies with network segmentation and access controls...",
					blob_id: "blob_security_hardening_2024",
				},
				{
					url: "https://monitoring.observability.com/guide",
					title: "Production Monitoring Guide",
					snippet: "...effective monitoring and observability strategies...",
					blob_id: "blob_monitoring_guide_2024",
				},
				{
					title: "WCAG 2.1 AA Implementation Guide",
					snippet:
						"...comprehensive accessibility standards for web content and applications...",
					blob_id: "blob_wcag_guide_2024",
				},
				{
					url: "https://compliance.guide/soc2",
					title: "SOC 2 Type II Compliance Requirements",
					snippet:
						"...security, availability, processing integrity, confidentiality, and privacy controls...",
					blob_id: "blob_soc2_guide_2024",
				},
			],
		});

		// 5. Inline citations variant
		parts.push({
			type: "text",
			text: `### 5. Inline Citations
Citation markers embedded directly in the text for academic-style referencing.

According to recent research [1], enterprise automation requires careful architectural planning [2]. Security considerations [3] must be addressed from the beginning, with comprehensive monitoring [4] throughout the lifecycle.`,
		});
		parts.push({
			type: "sources",
			sources: [
				{
					title: "Rita Automation Implementation Guide",
					snippet:
						"...comprehensive guide covering architecture, deployment, and best practices for enterprise automation...",
					blob_id: "blob_automation_guide_v2024",
				},
				{
					url: "https://research.enterprise.com/patterns",
					title: "Enterprise Architecture Patterns",
					snippet:
						"...scalable patterns for microservices, event-driven systems, and distributed processing...",
					blob_id: "blob_architecture_patterns_2024",
				},
				{
					title: "Production Security Hardening Guide",
					snippet:
						"...defense-in-depth strategies with network segmentation, access controls, and encryption...",
					blob_id: "blob_security_hardening_2024",
				},
				{
					url: "https://monitoring.observability.com/guide",
					title: "Production Monitoring Best Practices",
					snippet:
						"...effective monitoring and observability strategies for production systems...",
					blob_id: "blob_monitoring_guide_2024",
				},
			],
		});
	} else if (
		content.toLowerCase().startsWith("regular citations") ||
		content.toLowerCase().startsWith("default citations")
	) {
		// Regular/default example showing hover-card with navigation between multiple citations
		parts.push({
			type: "text",
			text: `## Default Citation Behavior

This demonstrates the regular out-of-the-box citation behavior with hover cards at the end.

According to recent research, enterprise automation requires careful architectural planning. Security best practices must be followed from the start, with comprehensive monitoring throughout the implementation lifecycle. The hover card below allows you to navigate between multiple citation sources.`,
		});
		parts.push({
			type: "sources",
			metadata: { citation_variant: "hover-card" },
			sources: [
				{
					title: "Rita Automation Implementation Guide",
					snippet:
						"...comprehensive guide covering architecture, deployment, and best practices for enterprise automation...",
					blob_id: "blob_automation_guide_v2024",
				},
				{
					url: "https://research.enterprise.com/patterns",
					title: "Enterprise Architecture Patterns",
					snippet:
						"...scalable patterns for microservices, event-driven systems, and distributed processing...",
				},
				{
					title: "Production Security Hardening Guide",
					snippet:
						"...defense-in-depth strategies with network segmentation, access controls, and encryption...",
					blob_id: "blob_security_hardening_2024",
				},
				{
					title: "Monitoring and Observability Guide",
					snippet:
						"...effective strategies for production monitoring and incident response...",
					blob_id: "blob_monitoring_guide_2024",
				},
			],
		});
	} else if (
		content.toLowerCase().startsWith("simple citations") ||
		content.toLowerCase().startsWith("basic citations")
	) {
		// Shorter example with just URL and title
		parts.push({
			type: "text",
			text: `## Simple Citations

Basic citation format with just URL and title, no snippets or full documents.

Here are some helpful resources [1] [2] [3] for getting started with Rita.`,
		});
		parts.push({
			type: "sources",
			sources: [
				{
					url: "https://docs.resolve.com/getting-started",
					title: "Getting Started with Rita",
				},
				{
					url: "https://docs.resolve.com/tutorials",
					title: "Rita Tutorials and Examples",
				},
				{
					url: "https://docs.resolve.com/api-reference",
					title: "Rita API Reference",
				},
			],
		});
	} else if (content.startsWith("test10")) {
		// test10: Reasoning + tasks
		parts.push({
			type: "reasoning",
			text: `Processing your test10 request for reasoning + tasks:\n\n1. I'm analyzing what needs to be done\n2. Based on the analysis, I'll generate specific tasks\n3. This pattern is great for action-oriented responses\n4. The reasoning explains why these tasks are necessary`,
			state: "done",
		});
		parts.push({
			type: "tasks",
			tasks: [
				{
					title: "Reasoning-Based Actions",
					defaultOpen: true,
					items: [
						"Implement reasoning conclusions",
						"Execute analysis recommendations",
						"Monitor reasoning accuracy",
						"Document reasoning outcomes",
					],
				},
				{
					title: "Follow-up Tasks",
					defaultOpen: false,
					items: [
						"Validate reasoning-task connection",
						"Optimize task generation logic",
						"Review task completion metrics",
					],
				},
			],
		});
	} else if (content.startsWith("testcode")) {
		// testcode: Response with multiple code blocks in different languages
		parts.push({
			type: "text",
			text: `## Code Examples Response

Here are some code examples for your request:

### TypeScript Example

\`\`\`typescript
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`);
  if (!response.ok) {
    throw new Error(\`Failed to fetch user: \${response.statusText}\`);
  }
  return response.json();
}

// Usage
const user = await fetchUser('123');
console.log(\`Hello, \${user.name}!\`);
\`\`\`

### Python Example

\`\`\`python
from dataclasses import dataclass
from datetime import datetime
import aiohttp

@dataclass
class User:
    id: str
    name: str
    email: str
    created_at: datetime

async def fetch_user(user_id: str) -> User:
    async with aiohttp.ClientSession() as session:
        async with session.get(f'/api/users/{user_id}') as resp:
            data = await resp.json()
            return User(**data)

# Usage
user = await fetch_user('123')
print(f'Hello, {user.name}!')
\`\`\`

### Bash Script

\`\`\`bash
#!/bin/bash

# Fetch user and parse JSON
USER_ID="123"
USER_DATA=$(curl -s "https://api.example.com/users/$USER_ID")

NAME=$(echo "$USER_DATA" | jq -r '.name')
EMAIL=$(echo "$USER_DATA" | jq -r '.email')

echo "User: $NAME ($EMAIL)"
\`\`\`

### SQL Query

\`\`\`sql
SELECT
  u.id,
  u.name,
  u.email,
  COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.name, u.email
HAVING COUNT(o.id) > 5
ORDER BY order_count DESC
LIMIT 10;
\`\`\`

### JSON Configuration

\`\`\`json
{
  "apiVersion": "v1",
  "kind": "ConfigMap",
  "metadata": {
    "name": "app-config",
    "namespace": "production"
  },
  "data": {
    "DATABASE_URL": "postgres://localhost:5432/mydb",
    "REDIS_URL": "redis://localhost:6379",
    "LOG_LEVEL": "info"
  }
}
\`\`\`

All examples demonstrate the same concept in different languages.`,
		});
	} else if (content.startsWith("testlong")) {
		// testlong: Long response with lots of content to test scrolling
		parts.push({
			type: "reasoning",
			text: `Generating a comprehensive long response to test UI scrolling behavior:\n\n1. This response contains substantial content\n2. It includes multiple sections and code blocks\n3. Designed to test how the chat widget handles long messages\n4. Pay attention to scroll behavior and code block rendering`,
			state: "done",
		});
		parts.push({
			type: "text",
			text: `## Comprehensive System Analysis Report

### Executive Summary

This is a detailed analysis report designed to test the rendering of long messages in the chat interface. The report covers multiple aspects of system performance, security, and reliability.

### 1. Performance Metrics

#### 1.1 Response Times

| Endpoint | P50 | P95 | P99 |
|----------|-----|-----|-----|
| /api/users | 45ms | 120ms | 250ms |
| /api/orders | 89ms | 210ms | 450ms |
| /api/analytics | 156ms | 380ms | 890ms |

#### 1.2 Throughput Analysis

Current system throughput is operating at **78% capacity** with the following breakdown:

- **API Gateway**: 12,500 req/s
- **Application Server**: 8,200 req/s
- **Database**: 4,100 queries/s
- **Cache Hit Rate**: 94.2%

### 2. Infrastructure Overview

\`\`\`yaml
# Kubernetes Deployment Configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: registry.example.com/api:v2.3.1
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        ports:
        - containerPort: 3000
\`\`\`

### 3. Security Assessment

#### 3.1 Vulnerability Scan Results

\`\`\`
SCAN SUMMARY
============
Total packages scanned: 1,247
Critical vulnerabilities: 0
High vulnerabilities: 2
Medium vulnerabilities: 8
Low vulnerabilities: 23

HIGH SEVERITY ISSUES:
- CVE-2024-1234: lodash < 4.17.21 (fixed in 4.17.21)
- CVE-2024-5678: axios < 1.6.0 (fixed in 1.6.0)

RECOMMENDED ACTIONS:
1. Update lodash to version 4.17.21+
2. Update axios to version 1.6.0+
\`\`\`

### 4. Database Performance

\`\`\`sql
-- Slow query analysis
SELECT
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY total_time DESC
LIMIT 10;

-- Results show 3 queries need optimization
-- Query 1: User lookup without index
-- Query 2: Order aggregation full scan
-- Query 3: Analytics join without filtering
\`\`\`

### 5. Recommendations

1. **Immediate Actions**
   - Update security vulnerabilities
   - Add missing database indexes
   - Increase cache TTL for static data

2. **Short-term Improvements**
   - Implement query result caching
   - Add request rate limiting
   - Set up automated alerting

3. **Long-term Strategy**
   - Migrate to event-driven architecture
   - Implement read replicas for scaling
   - Consider GraphQL for flexible queries

### 6. Monitoring Dashboard

\`\`\`javascript
// Grafana dashboard configuration
const dashboardConfig = {
  title: "System Overview",
  panels: [
    {
      type: "graph",
      title: "Request Rate",
      targets: [
        { expr: 'rate(http_requests_total[5m])' }
      ]
    },
    {
      type: "gauge",
      title: "CPU Usage",
      targets: [
        { expr: 'avg(cpu_usage_percent)' }
      ]
    },
    {
      type: "table",
      title: "Top Endpoints",
      targets: [
        { expr: 'topk(10, http_requests_total)' }
      ]
    }
  ]
};
\`\`\`

### Conclusion

The system is performing well overall but requires attention to the identified security vulnerabilities and database optimization opportunities. Implementing the recommended changes should improve both performance and security posture.

---

*Report generated automatically by RITA Analysis Engine v2.3*`,
		});
		parts.push({
			type: "sources",
			sources: [
				{
					url: "https://docs.example.com/performance",
					title: "Performance Best Practices Guide",
				},
				{
					url: "https://security.example.com/cve",
					title: "Security Vulnerability Database",
				},
				{
					url: "https://kubernetes.io/docs",
					title: "Kubernetes Documentation",
				},
			],
		});
	} else if (content.startsWith("testmodal")) {
		// testmodal: UI Schema with modal form for API credentials
		parts.push({
			type: "text",
			text: `## API Configuration

Configure your service credentials below.`,
			metadata: {
				ui_schema: {
					version: "1",
					components: [
						{
							type: "card",
							title: "ServiceNow Connection",
							description: "Connect to your ServiceNow instance",
							children: [
								{
									type: "row",
									gap: 8,
									children: [
										{
											type: "button",
											label: "Configure Credentials",
											opensModal: "credentials-modal",
										},
										{
											type: "button",
											label: "Test Connection",
											action: "test-connection",
											variant: "outline",
										},
									],
								},
							],
						},
					],
					modals: {
						"credentials-modal": {
							title: "ServiceNow Credentials",
							description:
								"Enter your ServiceNow instance details to establish connection",
							size: "lg",
							children: [
								{
									type: "input",
									name: "hostname",
									label: "Instance Hostname",
									placeholder: "your-instance.service-now.com",
								},
								{
									type: "input",
									name: "username",
									label: "Username",
									placeholder: "admin",
								},
								{
									type: "input",
									name: "apiKey",
									label: "API Key",
									inputType: "password",
									placeholder: "Enter your API key",
								},
								{
									type: "select",
									name: "environment",
									label: "Environment",
									placeholder: "Select environment",
									options: [
										{ label: "Production", value: "prod" },
										{ label: "Staging", value: "staging" },
										{ label: "Development", value: "dev" },
									],
								},
							],
							submitAction: "save-credentials",
							submitLabel: "Save Credentials",
							cancelLabel: "Cancel",
						},
					},
				},
			},
		});
	} else if (content.startsWith("testforcemodal")) {
		// testforcemodal: Auto-open modal immediately (forced credential prompt)
		parts.push({
			type: "text",
			text: `## Credential Required

Your session requires authentication. Please enter your credentials.`,
			metadata: {
				ui_schema: {
					version: "1",
					components: [
						{
							type: "card",
							title: "Authentication Required",
							description: "This action requires valid credentials to proceed",
							children: [
								{
									type: "text",
									content:
										"The credential form has been opened automatically. Please complete authentication to continue.",
									variant: "muted",
								},
								{
									type: "button",
									label: "Enter Credentials",
									opensModal: "auth-modal",
									variant: "default",
								},
							],
						},
					],
					modals: {
						"auth-modal": {
							title: "Enter Credentials",
							description: "Authenticate to continue with this workflow",
							size: "md",
							children: [
								{
									type: "input",
									name: "apiEndpoint",
									label: "API Endpoint",
									placeholder: "https://api.example.com",
								},
								{
									type: "input",
									name: "apiKey",
									label: "API Key",
									inputType: "password",
									placeholder: "Enter your API key",
								},
								{
									type: "select",
									name: "authType",
									label: "Authentication Type",
									placeholder: "Select auth type",
									options: [
										{ label: "Bearer Token", value: "bearer" },
										{ label: "API Key Header", value: "api-key" },
										{ label: "Basic Auth", value: "basic" },
									],
								},
							],
							submitAction: "authenticate",
							submitLabel: "Authenticate",
							cancelLabel: "Cancel",
						},
					},
					autoOpenModal: "auth-modal",
				},
			},
		});
	} else {
		// Default scenario - fall back to original logic
		const useScenario = scenario || MOCK_CONFIG.defaultScenario;
		const isSuccess = Math.random() * 100 < MOCK_CONFIG.successRate;

		switch (useScenario) {
			case "success":
				// Add reasoning part
				parts.push({
					type: "reasoning",
					text: `Let me analyze your request step by step:\n\n1. First, I'll check the current system status\n2. Then analyze any documents you've provided (${documentCount} found)\n3. Finally, I'll create automation tasks to resolve any issues`,
					state: "done",
				});

				// Add main text response
				parts.push({
					type: "text",
					text: `## Analysis Complete ✅

I've successfully processed your request: **"${content}"**

### Summary
- **Documents processed**: ${documentCount}
- **Status**: ✅ Completed successfully
- **Response time**: ~${Math.floor(Math.random() * 3) + 1} seconds

### Key Findings
1. **System health check** passed
2. **Security scan** completed - no issues found
3. **Performance metrics** within normal range

\`\`\`bash
# Example automation script
systemctl status nginx
curl -I https://your-app.com/health
\`\`\`

### Next Steps
- Monitor system for 24 hours
- Review \`/var/log/application.log\` for any warnings
- Consider implementing **automated alerts** for similar issues

> 💡 **Tip**: You can set up automated monitoring to catch this type of issue early!`,
				});

				// Add sources
				parts.push({
					type: "sources",
					sources: [
						{
							url: "https://docs.resolve.com/rita/automation",
							title: "Rita Automation Documentation",
						},
						{
							url: "https://docs.resolve.com/monitoring/best-practices",
							title: "System Monitoring Best Practices",
						},
						{
							url: "https://docs.resolve.com/troubleshooting/common-issues",
							title: "Common Infrastructure Issues",
						},
					],
				});

				// Add automation tasks
				parts.push({
					type: "tasks",
					tasks: [
						{
							title: "System Health Check",
							defaultOpen: true,
							items: [
								"Check system resource utilization (CPU, Memory, Disk)",
								"Verify critical service status and uptime",
								"Generate monitoring report",
								"Send alerts if thresholds exceeded",
							],
						},
						{
							title: "Performance Optimization",
							defaultOpen: false,
							items: [
								"Analyze slow database queries",
								"Optimize application caching",
								"Review and tune server configurations",
								"Implement automated scaling policies",
							],
						},
					],
				});
				break;

			case "failure":
				// Add reasoning for failure scenario
				parts.push({
					type: "reasoning",
					text: `I encountered several issues while trying to process your request:\n\n1. Initial connection to the target system failed\n2. Authentication credentials appear to be invalid\n3. The requested automation cannot proceed safely\n\nLet me provide details and suggested remediation steps.`,
					state: "done",
				});

				// Add main error response
				parts.push({
					type: "text",
					text: `## Automation Failed ❌

Unable to process your request: **"${content}"**

### Error Details
- **Error Code**: \`ERR_${Math.floor(Math.random() * 1000)}\`
- **Timestamp**: ${new Date().toISOString()}
- **Affected Services**: ${Math.floor(Math.random() * 3) + 1}

### Common Causes
1. **Network connectivity** issues
2. **Insufficient permissions** on target system
3. **Resource exhaustion** (CPU/Memory)

\`\`\`json
{
  "error": "Connection timeout",
  "service": "automation-engine",
  "retry_count": 3,
  "max_retries": 5
}
\`\`\`

> ⚠️ **Note**: This is a simulated error for testing purposes.`,
				});

				// Add troubleshooting sources
				parts.push({
					type: "sources",
					sources: [
						{
							url: "https://docs.resolve.com/troubleshooting/network",
							title: "Network Connectivity Troubleshooting",
						},
						{
							url: "https://docs.resolve.com/troubleshooting/permissions",
							title: "Permission Issues Guide",
						},
					],
				});

				// Add remediation tasks
				parts.push({
					type: "tasks",
					tasks: [
						{
							title: "Error Diagnosis & Recovery",
							defaultOpen: true,
							items: [
								"Check system connectivity and firewall rules",
								"Verify credentials and permissions",
								"Review system resource usage and capacity",
								"Try manual execution to isolate the issue",
							],
						},
					],
				});
				break;

			case "processing":
				// Add reasoning for processing state
				parts.push({
					type: "reasoning",
					text: `I'm currently processing your request in multiple phases:\n\n1. Validating input parameters and prerequisites\n2. Discovering available resources and dependencies\n3. Planning the automation workflow\n4. Executing the automation safely\n5. Verifying results and cleanup\n\nThis may take a few minutes to complete.`,
					state: "streaming",
				});

				// Add processing status
				parts.push({
					type: "text",
					text: `## Processing Your Request 🔄

Currently working on: **"${content}"**

### Progress Status
- **Phase 1**: Initial validation ✅
- **Phase 2**: Resource discovery 🔄
- **Phase 3**: Automation execution ⏳
- **Phase 4**: Verification ⏳

### Current Activity
\`\`\`
[INFO] Scanning infrastructure...
[INFO] Found ${Math.floor(Math.random() * 10) + 1} servers
[INFO] Connecting to primary database...
[WARN] High CPU usage detected on server-03
[INFO] Applying configuration changes...
\`\`\`

### Estimated Completion
**~${Math.floor(Math.random() * 5) + 2} minutes** remaining

> 📊 This is an intermediate status update. Full results will be available upon completion.`,
				});
				break;

			case "random":
				if (isSuccess) {
					// Random success with reasoning
					parts.push({
						type: "reasoning",
						text: `Random scenario generator selected success path. I'll create a comprehensive response with multiple automation tasks and documentation references.`,
						state: "done",
					});

					parts.push({
						type: "text",
						text: `## Random Success! 🎲

Successfully processed: **"${content}"**

### Metrics
- **Operations completed**: ${Math.floor(Math.random() * 10) + 1}
- **Success rate**: ${Math.floor(Math.random() * 20) + 80}%
- **Processing time**: ${Math.floor(Math.random() * 30) + 10}s

### Generated Results
\`\`\`yaml
automation:
  status: success
  randomSeed: ${Math.floor(Math.random() * 1000)}
  servicesAffected:
    - web-server-${Math.floor(Math.random() * 5) + 1}
    - database-${Math.floor(Math.random() * 3) + 1}
  changes:
    - Updated configuration files
    - Restarted services
    - Cleared cache
\`\`\`

> 🎯 Random scenario executed successfully!`,
					});

					parts.push({
						type: "sources",
						sources: [
							{
								url: "https://docs.resolve.com/random/success",
								title: "Random Success Patterns",
							},
						],
					});

					parts.push({
						type: "tasks",
						tasks: [
							{
								title: "Random Task Generation",
								defaultOpen: true,
								items: [
									`Process random seed: ${Math.floor(Math.random() * 1000)}`,
									"Apply configuration changes",
									"Verify system stability",
									"Generate completion report",
								],
							},
						],
					});
				} else {
					// Random failure
					parts.push({
						type: "reasoning",
						text: `Random scenario generator selected failure path. This simulates various types of automation failures that can occur in real environments.`,
						state: "done",
					});

					parts.push({
						type: "text",
						text: `## Random Failure! 🎲

Could not process: **"${content}"**

### Error Information
- **Error Code**: \`RND_${Math.floor(Math.random() * 1000)}\`
- **Failure Point**: Stage ${Math.floor(Math.random() * 4) + 1}
- **Retry Attempts**: ${Math.floor(Math.random() * 5) + 1}

### Debug Information
\`\`\`log
[ERROR] Random failure simulation triggered
[ERROR] Service unavailable: random-service-${Math.floor(Math.random() * 10)}
[ERROR] Timeout after ${Math.floor(Math.random() * 30) + 10} seconds
[INFO] Rolling back changes...
[INFO] Cleanup completed
\`\`\`

> 🎲 This is a randomly generated failure for testing purposes.`,
					});
				}
				break;

			default:
				parts.push({
					type: "text",
					text: `## Default Response

Processed your request: **"${content}"**

This is a basic response format. Set \`MOCK_SCENARIO\` environment variable to get different response types:
- \`success\` - Detailed success response with reasoning, sources, and tasks
- \`failure\` - Error scenario with debugging info
- \`processing\` - Work-in-progress status
- \`random\` - Randomly choose success/failure

### Available Scenarios
| Scenario | Description |
|----------|-------------|
| success | ✅ Successful automation with structured response |
| failure | ❌ Error with debug info and remediation |
| processing | 🔄 In-progress status with reasoning |
| random | 🎲 Random outcome with structured parts |`,
				});
				break;
		}
	}

	// Convert parts to separate messages with the external service format
	const responses = [];

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		const isLastPart = i === parts.length - 1;

		if (part.type === "text") {
			// Main text response
			responses.push({
				message_id: messagePayload.message_id,
				conversation_id: messagePayload.conversation_id,
				tenant_id: messagePayload.tenant_id,
				user_id: messagePayload.user_id,
				response: part.text,
				response_group_id: responseGroupId,
				metadata: {
					...part.metadata, // Include part metadata (e.g., ui_schema)
					turn_complete: isLastPart,
				},
			});
		} else {
			// Metadata-based response (reasoning, sources, tasks)
			const metadata: any = {};

			if (part.type === "reasoning") {
				metadata[part.type] = { content: part.text, state: part.state };
			} else if (part.type === "sources") {
				metadata.sources = part.sources;
				// Include any additional metadata (like citation_variant)
				if (part.metadata) {
					Object.assign(metadata, part.metadata);
				}
			} else {
				metadata[part.type] = part[part.type];
			}

			// Add turn_complete to metadata
			metadata.turn_complete = isLastPart;

			responses.push({
				message_id: messagePayload.message_id,
				conversation_id: messagePayload.conversation_id,
				tenant_id: messagePayload.tenant_id,
				user_id: messagePayload.user_id,
				response: "", // Empty text content for metadata-only messages
				metadata,
				response_group_id: responseGroupId,
			});
		}
	}

	return responses;
}

// Health check
app.get("/health", (_req, res) => {
	const correlationId = generateCorrelationId();
	const contextLogger = createContextLogger(logger, correlationId);

	contextLogger.info({}, "Health check requested");

	res.json({
		status: "ok",
		service: "rita-mock-automation",
		timestamp: new Date().toISOString(),
		config: MOCK_CONFIG,
	});
});

// Mock metadata endpoint (mimics api-server /api/files/:documentId/metadata)
app.get("/api/files/:documentId/metadata", (req, res) => {
	const correlationId = generateCorrelationId();
	const contextLogger = createContextLogger(logger, correlationId, {
		documentId: req.params.documentId,
	});

	const { documentId } = req.params;

	contextLogger.info({}, "Document metadata requested");

	// For testing, treat documentId as blob_id
	if (!blobExists(documentId)) {
		contextLogger.warn({}, "Document not found");
		res.status(404).json({
			error: "Document not found",
		});
		return;
	}

	const blobContent = getBlobContent(documentId);

	if (!blobContent) {
		contextLogger.error({}, "Document exists but metadata retrieval failed");
		res.status(500).json({
			error: "Failed to retrieve document metadata",
		});
		return;
	}

	// Return metadata with content for citations
	const metadata = {
		id: documentId,
		filename: blobContent.metadata?.title || "Document",
		file_size: blobContent.content.length,
		mime_type:
			blobContent.content_type === "markdown" ? "text/markdown" : "text/plain",
		created_at: blobContent.metadata?.created_at || new Date().toISOString(),
		updated_at: blobContent.metadata?.updated_at || new Date().toISOString(),
		metadata: {
			content: blobContent.content,
		},
	};

	contextLogger.info(
		{
			filename: metadata.filename,
			fileSize: metadata.file_size,
		},
		"Document metadata retrieved successfully",
	);

	res.json(metadata);
});

// Mock download endpoint (mimics api-server /api/files/:documentId/download)
app.get("/api/files/:documentId/download", (req, res) => {
	const correlationId = generateCorrelationId();
	const contextLogger = createContextLogger(logger, correlationId, {
		documentId: req.params.documentId,
	});

	const { documentId } = req.params;

	contextLogger.info({}, "Document download requested");

	// For testing, treat documentId as blob_id
	if (!blobExists(documentId)) {
		contextLogger.warn({}, "Document not found");
		res.status(404).json({
			error: "Document not found",
		});
		return;
	}

	const blobContent = getBlobContent(documentId);

	if (!blobContent) {
		contextLogger.error({}, "Document exists but download failed");
		res.status(500).json({
			error: "Failed to download document",
		});
		return;
	}

	// Set headers for file download
	const filename = blobContent.metadata?.title || "document.md";
	const mimeType =
		blobContent.content_type === "markdown" ? "text/markdown" : "text/plain";

	res.setHeader("Content-Type", mimeType);
	res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
	res.setHeader("Content-Length", blobContent.content.length);

	contextLogger.info(
		{
			filename,
			contentLength: blobContent.content.length,
		},
		"Document downloaded successfully",
	);

	// Send the content as text
	res.send(blobContent.content);
});

// Blob content endpoint
app.get("/blobs/:blob_id", (req, res) => {
	const correlationId = generateCorrelationId();
	const contextLogger = createContextLogger(logger, correlationId, {
		blobId: req.params.blob_id,
	});

	const { blob_id } = req.params;

	contextLogger.info({}, "Blob content requested");

	if (!blobExists(blob_id)) {
		contextLogger.warn({}, "Blob not found");
		res.status(404).json({
			error: "Blob not found",
			blob_id,
		});
		return;
	}

	const blobContent = getBlobContent(blob_id);

	if (!blobContent) {
		contextLogger.error({}, "Blob exists but content retrieval failed");
		res.status(500).json({
			error: "Failed to retrieve blob content",
			blob_id,
		});
		return;
	}

	contextLogger.info(
		{
			contentType: blobContent.content_type,
			contentLength: blobContent.content.length,
		},
		"Blob content retrieved successfully",
	);

	res.json(blobContent);
});

// List all available blobs
app.get("/blobs", (_req, res) => {
	const correlationId = generateCorrelationId();
	const contextLogger = createContextLogger(logger, correlationId);

	contextLogger.info({}, "Blob list requested");

	const blobIds = listBlobIds();

	res.json({
		blobs: blobIds,
		count: blobIds.length,
	});
});

// Tenant-specific webhook endpoint (matches Actions API pattern for iframe embed)
app.post("/api/Webhooks/postEvent/:tenantId", async (req, res) => {
	const { tenantId } = req.params;
	webhookLogger.info(
		{ tenantId, path: req.path },
		"Received tenant-specific webhook",
	);

	// Add tenant_id from URL if not in body (iframe webhooks include it in both places)
	if (!req.body.tenant_id) {
		req.body.tenant_id = tenantId;
	}

	// Forward to main webhook handler by calling next middleware
	// Instead, just inline the webhook handling here to avoid complexity
	const correlationId = generateCorrelationId();
	const timer = new PerformanceTimer(
		webhookLogger,
		"tenant-webhook-processing",
	);

	try {
		const payload: WebhookPayload = req.body;

		// Handle iframe chat messages
		if (
			(payload.source === "rita-chat-iframe" ||
				payload.source === "rita-chat") &&
			payload.action === "message_created"
		) {
			const messagePayload = payload as MessageWebhookPayload;

			const contextLogger = createContextLogger(webhookLogger, correlationId, {
				messageId: messagePayload.message_id,
				tenantId: tenantId,
				userId: messagePayload.user_id,
				conversationId: messagePayload.conversation_id,
			});

			contextLogger.info(
				{
					source: messagePayload.source,
					action: messagePayload.action,
					customerMessage: messagePayload.customer_message?.substring(0, 50),
				},
				"Processing tenant iframe message webhook",
			);

			// Generate mock response
			const responses = generateMockResponse(messagePayload, undefined);

			if (responses && responses.length > 0) {
				// Delay before sending response
				setTimeout(async () => {
					for (const response of responses) {
						await publishResponse(response);
						contextLogger.info(
							{ responseType: response.metadata?.type },
							"Published mock response to queue",
						);
					}
				}, MOCK_CONFIG.responseDelay);
			}

			timer.end({ success: true, tenantId });
			res.json({
				success: true,
				message:
					"Tenant webhook received - mock response will be sent via RabbitMQ",
				eventId: correlationId,
			});
			return;
		}

		// Unknown webhook type
		timer.end({ success: false, reason: "unknown_webhook_type" });
		res.status(400).json({ error: "Unknown webhook type for tenant endpoint" });
		return;
	} catch (error) {
		timer.end({ success: false });
		webhookLogger.error(
			{ error, tenantId },
			"Tenant webhook processing failed",
		);
		res.status(500).json({ error: "Internal server error" });
		return;
	}
});

// Webhook endpoint - main automation receiver
app.post("/webhook", async (req, res) => {
	const correlationId = generateCorrelationId();
	const timer = new PerformanceTimer(webhookLogger, "webhook-processing");

	try {
		const payload: WebhookPayload = req.body;

		// Basic validation - all webhooks must have source and action
		// tenant_id is required for most webhooks EXCEPT password reset (public/unauthenticated flow)
		if (!payload.source || !payload.action) {
			const errorLogger = createContextLogger(webhookLogger, correlationId);
			errorLogger.warn(
				{
					hasSource: !!payload.source,
					hasAction: !!payload.action,
				},
				"Webhook validation failed - missing basic required fields",
			);
			res.status(400).json({
				error: "Missing required fields: source, action",
			});
			return;
		}

		// Require tenant_id for all webhooks
		if (!payload.tenant_id) {
			const errorLogger = createContextLogger(webhookLogger, correlationId);
			errorLogger.warn(
				{
					source: payload.source,
					action: payload.action,
					hasTenantId: !!payload.tenant_id,
				},
				"Webhook validation failed - missing tenant_id",
			);
			res.status(400).json({
				error: "Missing required field: tenant_id",
			});
			return;
		}

		// Handle different webhook types
		if (
			payload.source === "rita-chat" &&
			payload.action === "message_created"
		) {
			const messagePayload = payload as MessageWebhookPayload;

			const contextLogger = createContextLogger(webhookLogger, correlationId, {
				messageId: messagePayload.message_id,
				tenantId: messagePayload.tenant_id,
				userId: messagePayload.user_id,
				conversationId: messagePayload.conversation_id,
			});

			contextLogger.info(
				{
					source: messagePayload.source,
					action: messagePayload.action,
					user_email: messagePayload.user_email,
					content: `${messagePayload.customer_message?.substring(0, 50)}...`,
					documentCount: messagePayload.document_ids?.length || 0,
					conversationId: messagePayload.conversation_id,
				},
				"Received message webhook",
			);

			// Log full webhook payload with transcript
			console.log(`\n${"═".repeat(100)}`);
			console.log("📨 WEBHOOK PAYLOAD RECEIVED");
			console.log("═".repeat(100));
			console.log(JSON.stringify(messagePayload, null, 2));
			console.log(`${"═".repeat(100)}\n`);

			// Validate message-specific required fields
			if (
				!messagePayload.message_id ||
				!messagePayload.conversation_id ||
				!messagePayload.customer_message
			) {
				contextLogger.warn(
					{
						hasMessageId: !!messagePayload.message_id,
						hasConversationId: !!messagePayload.conversation_id,
						hasCustomerMessage: !!messagePayload.customer_message,
					},
					"Message webhook validation failed - missing required fields",
				);
				res.status(400).json({
					error:
						"Missing required fields for message webhook: message_id, conversation_id, customer_message",
				});
				return;
			}
		} else if (
			payload.source === "rita-documents" &&
			payload.action === "document_uploaded"
		) {
			const documentPayload = payload as DocumentWebhookPayload;

			const contextLogger = createContextLogger(webhookLogger, correlationId, {
				blobMetadataId: documentPayload.blob_metadata_id,
				blobId: documentPayload.blob_id,
				tenantId: documentPayload.tenant_id,
				userId: documentPayload.user_id,
			});

			contextLogger.info(
				{
					source: documentPayload.source,
					action: documentPayload.action,
					user_email: documentPayload.user_email,
					blob_metadata_id: documentPayload.blob_metadata_id,
					blob_id: documentPayload.blob_id,
					document_url: documentPayload.document_url,
					file_type: documentPayload.file_type,
					file_size: documentPayload.file_size,
					original_filename: documentPayload.original_filename,
				},
				"Received document webhook",
			);

			// Validate document-specific required fields
			if (
				!documentPayload.blob_metadata_id ||
				!documentPayload.blob_id ||
				!documentPayload.document_url ||
				!documentPayload.file_type
			) {
				contextLogger.warn(
					{
						hasBlobMetadataId: !!documentPayload.blob_metadata_id,
						hasBlobId: !!documentPayload.blob_id,
						hasDocumentUrl: !!documentPayload.document_url,
						hasFileType: !!documentPayload.file_type,
					},
					"Document webhook validation failed - missing required fields",
				);
				res.status(400).json({
					error:
						"Missing required fields for document webhook: blob_metadata_id, blob_id, document_url, file_type",
				});
				return;
			}
		} else if (
			payload.source === "rita-documents" &&
			payload.action === "document_deleted"
		) {
			const deletePayload = payload as DocumentDeletePayload;

			const contextLogger = createContextLogger(webhookLogger, correlationId, {
				blobMetadataId: deletePayload.blob_metadata_id,
				blobId: deletePayload.blob_id,
				tenantId: deletePayload.tenant_id,
				userId: deletePayload.user_id,
			});

			contextLogger.info(
				{
					source: deletePayload.source,
					action: deletePayload.action,
					user_email: deletePayload.user_email,
					blob_metadata_id: deletePayload.blob_metadata_id,
					blob_id: deletePayload.blob_id,
				},
				"🗑️  Document deletion webhook received",
			);

			// Validate deletion-specific required fields
			if (!deletePayload.blob_metadata_id || !deletePayload.blob_id) {
				contextLogger.warn(
					{
						hasBlobMetadataId: !!deletePayload.blob_metadata_id,
						hasBlobId: !!deletePayload.blob_id,
					},
					"Document deletion webhook validation failed - missing required fields",
				);
				res.status(400).json({
					error:
						"Missing required fields for document deletion webhook: blob_metadata_id, blob_id",
				});
				return;
			}

			// Log deletion event prominently
			console.log(`\n${"═".repeat(100)}`);
			console.log("🗑️  DOCUMENT DELETION WEBHOOK RECEIVED");
			console.log("═".repeat(100));
			console.log(JSON.stringify(deletePayload, null, 2));
			console.log(`${"═".repeat(100)}\n`);

			// Acknowledge successful receipt (Barista would perform vector database cleanup here)
			res.status(200).json({
				message: "Document deletion webhook received",
				blob_metadata_id: deletePayload.blob_metadata_id,
				blob_id: deletePayload.blob_id,
				status: "acknowledged",
			});
			return;
		} else if (
			payload.source === "rita-signup" &&
			payload.action === "user_signup"
		) {
			const signupPayload = payload as SignupWebhookPayload;

			const contextLogger = createContextLogger(webhookLogger, correlationId, {
				email: signupPayload.user_email,
				pendingUserId: signupPayload.pending_user_id,
				tenantId: signupPayload.tenant_id,
			});

			contextLogger.info(
				{
					source: signupPayload.source,
					action: signupPayload.action,
					user_email: signupPayload.user_email,
					first_name: signupPayload.first_name,
					last_name: signupPayload.last_name,
					company: signupPayload.company,
					pending_user_id: signupPayload.pending_user_id,
					verification_url: signupPayload.verification_url,
				},
				"Received signup webhook",
			);

			// Validate signup-specific required fields
			if (
				!signupPayload.user_email ||
				!signupPayload.first_name ||
				!signupPayload.last_name ||
				!signupPayload.company ||
				!signupPayload.password ||
				!signupPayload.verification_token
			) {
				contextLogger.warn(
					{
						hasEmail: !!signupPayload.user_email,
						hasFirstName: !!signupPayload.first_name,
						hasLastName: !!signupPayload.last_name,
						hasCompany: !!signupPayload.company,
						hasPassword: !!signupPayload.password,
						hasVerificationToken: !!signupPayload.verification_token,
					},
					"Signup webhook validation failed - missing required fields",
				);
				res.status(400).json({
					error:
						"Missing required fields for signup webhook: user_email, first_name, last_name, company, password, verification_token",
				});
				return;
			}
		} else if (
			payload.source === "rita-chat" &&
			payload.action === "send_invitation"
		) {
			const invitationPayload = payload as SendInvitationWebhookPayload;

			const contextLogger = createContextLogger(webhookLogger, correlationId, {
				tenantId: invitationPayload.tenant_id,
				organizationName: invitationPayload.organization_name,
				invitedByEmail: invitationPayload.invited_by_email,
			});

			contextLogger.info(
				{
					source: invitationPayload.source,
					action: invitationPayload.action,
					organization_name: invitationPayload.organization_name,
					invited_by_email: invitationPayload.invited_by_email,
					invited_by_name: invitationPayload.invited_by_name,
					invitation_count: invitationPayload.invitations.length,
				},
				"Received send_invitation webhook",
			);

			// Send invitation emails via Mailpit
			try {
				for (const invitation of invitationPayload.invitations) {
					await emailService.sendInvitation(
						invitation.invitee_email,
						invitationPayload.invited_by_name,
						invitationPayload.organization_name,
						invitation.invitation_url,
						invitation.expires_at,
					);
				}

				contextLogger.info(
					{
						invitation_count: invitationPayload.invitations.length,
					},
					"📧 Invitation emails sent successfully via Mailpit",
				);

				res.status(200).json({
					success: true,
					message: "Invitation emails sent successfully",
					invitations_sent: invitationPayload.invitations.length,
				});
				return;
			} catch (error) {
				logError(contextLogger, error as Error, {
					operation: "send-invitations",
				});

				res.status(500).json({
					success: false,
					message: "Failed to send invitation emails",
					error: error instanceof Error ? error.message : "Unknown error",
				});
				return;
			}
		} else if (
			payload.source === "rita-chat" &&
			payload.action === "accept_invitation"
		) {
			const acceptPayload = payload as AcceptInvitationWebhookPayload;

			const contextLogger = createContextLogger(webhookLogger, correlationId, {
				email: acceptPayload.user_email,
				invitationId: acceptPayload.invitation_id,
				tenantId: acceptPayload.tenant_id,
			});

			contextLogger.info(
				{
					source: acceptPayload.source,
					action: acceptPayload.action,
					user_email: acceptPayload.user_email,
					invitation_id: acceptPayload.invitation_id,
					first_name: acceptPayload.first_name,
					last_name: acceptPayload.last_name,
					email_verified: acceptPayload.email_verified,
				},
				"Received accept_invitation webhook",
			);

			try {
				// Create user in Keycloak (similar to signup flow)
				const signupData: SignupWebhookPayload = {
					source: "rita-signup",
					action: "user_signup",
					tenant_id: acceptPayload.tenant_id,
					user_email: acceptPayload.user_email,
					first_name: acceptPayload.first_name,
					last_name: acceptPayload.last_name,
					company: "", // Not provided in invitation flow
					password: acceptPayload.password,
					verification_token: "", // Not needed since email_verified is true
					verification_url: "",
					pending_user_id: acceptPayload.invitation_id, // Use invitation_id as pending_user_id
				};

				const keycloakUserId = await createKeycloakUser(signupData);

				contextLogger.info(
					{
						email: acceptPayload.user_email,
						keycloakUserId,
						invitation_id: acceptPayload.invitation_id,
					},
					"🎉 INVITATION ACCEPTED: Keycloak user created",
				);

				console.log(`\n${"=".repeat(80)}`);
				console.log("✅ INVITATION ACCEPTED");
				console.log("=".repeat(80));
				console.log(`Email: ${acceptPayload.user_email}`);
				console.log(
					`Name: ${acceptPayload.first_name} ${acceptPayload.last_name}`,
				);
				console.log(`Keycloak User ID: ${keycloakUserId}`);
				console.log(`Invitation ID: ${acceptPayload.invitation_id}`);
				console.log("");
				console.log("User can now sign in to the application!");
				console.log(`${"=".repeat(80)}\n`);

				res.status(200).json({
					success: true,
					message: "Invitation accepted, user created in Keycloak",
					keycloak_user_id: keycloakUserId,
					email: acceptPayload.user_email,
				});
				return;
			} catch (error) {
				logError(contextLogger, error as Error, {
					operation: "accept-invitation-processing",
				});

				res.status(200).json({
					success: false,
					message: "Invitation webhook received but user creation failed",
					error: error instanceof Error ? error.message : "Unknown error",
				});
				return;
			}
		} else if (
			payload.source === "rita-member-management" &&
			payload.action === "delete_keycloak_user"
		) {
			const deletePayload = payload as DeleteKeycloakUserPayload;
			const contextLogger = createContextLogger(webhookLogger, correlationId, {
				email: deletePayload.user_email,
				userId: deletePayload.user_id,
				tenantId: deletePayload.tenant_id,
			});

			contextLogger.info(
				{
					source: deletePayload.source,
					action: deletePayload.action,
					user_email: deletePayload.user_email,
					user_id: deletePayload.user_id,
					reason: deletePayload.reason,
				},
				"Received delete Keycloak user webhook",
			);

			try {
				// Delete primary user from Keycloak
				// NOTE: Only pass email - let deleteKeycloakUser search Keycloak by email
				// deletePayload.user_id is Rita's database user_id, not Keycloak's user ID
				await deleteKeycloakUser(deletePayload.user_email!);

				// Delete additional users if provided (for organization deletion)
				const additionalEmails = deletePayload.additional_emails || [];
				let additionalUsersDeleted = 0;

				if (additionalEmails.length > 0) {
					for (const email of additionalEmails) {
						try {
							await deleteKeycloakUser(email);
							additionalUsersDeleted++;
							contextLogger.info(
								{ email },
								"Additional user deleted from Keycloak",
							);
						} catch (error) {
							contextLogger.error(
								{ email, error },
								"Failed to delete additional user from Keycloak",
							);
							// Continue deleting other users even if one fails
						}
					}
				}

				const totalUsersDeleted = 1 + additionalUsersDeleted;

				contextLogger.info(
					{
						email: deletePayload.user_email,
						user_id: deletePayload.user_id,
						tenant_id: deletePayload.tenant_id,
						totalUsersDeleted,
						reason: deletePayload.reason,
					},
					"🗑️  KEYCLOAK USER(S) DELETED: User(s) removed from identity provider",
				);

				console.log(`\n${"=".repeat(80)}`);
				console.log("🗑️  KEYCLOAK USER(S) DELETED");
				console.log("=".repeat(80));
				console.log(`Primary Email: ${deletePayload.user_email}`);
				console.log(`User ID: ${deletePayload.user_id || "N/A"}`);
				console.log(`Tenant ID: ${deletePayload.tenant_id}`);
				console.log(
					`Total Users Deleted: ${totalUsersDeleted} (Primary + ${additionalUsersDeleted} additional)`,
				);
				console.log(
					`Delete Organization: ${deletePayload.delete_tenant ? "✅ YES (clean ALL organization data)" : "❌ NO (user-only cleanup)"}`,
				);
				console.log(`Reason: ${deletePayload.reason || "Not specified"}`);
				console.log("");
				if (additionalEmails.length > 0) {
					console.log(`Additional users deleted from Keycloak:`);
					additionalEmails.forEach((email, idx) => {
						console.log(`  ${idx + 1}. ${email}`);
					});
					console.log("");
				}
				console.log("User(s) have been successfully removed from Keycloak!");
				if (deletePayload.delete_tenant) {
					console.log(
						"⚠️  ORGANIZATION DELETION: External service should delete ALL files for tenant_id.",
					);
				} else {
					console.log(
						"External service can now proceed with user-specific file cleanup using tenant_id.",
					);
				}
				console.log(`${"=".repeat(80)}\n`);

				res.status(200).json({
					success: true,
					message: `Keycloak user(s) deleted successfully (${totalUsersDeleted} total)`,
					email: deletePayload.user_email,
					user_id: deletePayload.user_id,
					tenant_id: deletePayload.tenant_id,
					total_users_deleted: totalUsersDeleted,
					additional_users_deleted: additionalUsersDeleted,
				});
				return;
			} catch (error) {
				logError(contextLogger, error as Error, {
					operation: "delete-keycloak-user-processing",
				});

				res.status(500).json({
					success: false,
					message: "Failed to delete Keycloak user",
					error: error instanceof Error ? error.message : "Unknown error",
					email: deletePayload.user_email,
				});
				return;
			}
		} else if (
			payload.source === "rita-chat" &&
			payload.action === "verify_credentials"
		) {
			const verifyPayload = payload as DataSourceVerifyPayload;
			const delegationId = verifyPayload.settings?.delegation_id;
			const isDelegation = !!delegationId;

			const contextLogger = createContextLogger(webhookLogger, correlationId, {
				tenantId: verifyPayload.tenant_id,
			});

			contextLogger.info(
				{
					source: verifyPayload.source,
					action: verifyPayload.action,
					connection_id: verifyPayload.connection_id,
					connection_type: verifyPayload.connection_type,
					user_email: verifyPayload.user_email,
					is_delegation: isDelegation,
					delegation_id: delegationId,
				},
				isDelegation
					? "Received credential delegation verify webhook"
					: "Received data source verify webhook",
			);

			// Log raw payload for debugging (easy to copy)
			contextLogger.info(
				{ rawPayload: JSON.stringify(verifyPayload, null, 2) },
				"Raw verify_credentials payload",
			);

			// Publish verification message to RabbitMQ after 1 second delay
			setTimeout(async () => {
				try {
					const rabbitmqService = getRabbitMQService();

					if (isDelegation) {
						// Credential delegation verification
						// Check for magic passwords to determine success/failure
						const password = verifyPayload.credentials?.password;
						const apiToken = verifyPayload.credentials?.api_token;
						const secret = (password || apiToken || "").toLowerCase();

						// Magic values for testing (check original value first)
						const FAIL_VALUES = ["invalid", "fail", "error"];
						const SUCCESS_VALUES = ["success", "valid", "test"];

						// Determine success based on magic values
						let isSuccess = true;
						let errorMessage: string | null = null;

						if (FAIL_VALUES.includes(secret)) {
							isSuccess = false;
							errorMessage = "Invalid credentials: authentication failed";
						} else if (SUCCESS_VALUES.includes(secret)) {
							isSuccess = true;
						} else {
							// Random 80% success rate for other values
							isSuccess = Math.random() > 0.2;
							if (!isSuccess) {
								errorMessage = "Connection verification failed";
							}
						}

						const delegationMessage = {
							type: "credential_delegation_verification",
							delegation_id: delegationId,
							tenant_id: verifyPayload.tenant_id,
							status: isSuccess ? "verified" : "failed",
							error: errorMessage,
							timestamp: new Date().toISOString(),
						};

						await rabbitmqService.publishToQueue(
							"data_source_status",
							delegationMessage,
						);

						contextLogger.info(
							{
								delegationId,
								status: isSuccess ? "verified" : "failed",
								queue: "data_source_status",
							},
							"Published delegation verification message to RabbitMQ",
						);

						// Send success email directly to owner if verification succeeded
						if (isSuccess && verifyPayload.settings?.owner_email) {
							const { owner_email, delegated_success_url, organization_name } =
								verifyPayload.settings;
							try {
								await emailService.sendDelegationSuccess(
									owner_email,
									verifyPayload.connection_type,
									delegated_success_url || "",
								);
								contextLogger.info(
									{
										ownerEmail: owner_email,
										connectionType: verifyPayload.connection_type,
									},
									"Sent delegation success email to owner",
								);
							} catch (emailError) {
								contextLogger.error(
									{ error: emailError },
									"Failed to send delegation success email",
								);
							}
						}
					} else {
						// Regular data source verification
						let options: Record<string, any> = {};
						if (verifyPayload.connection_type === "confluence") {
							options = {
								spaces: "ENG,PROD,DOCS",
								sites: "confluence.company.com",
							};
						} else if (verifyPayload.connection_type === "servicenow") {
							// ServiceNow Knowledge Base connection
							options = {
								knowledge_base: [
									{ title: "Engineering", sys_id: "kb_eng_001" },
									{ title: "IT Support", sys_id: "kb_it_002" },
									{ title: "HR Policies", sys_id: "kb_hr_003" },
								],
							};
						} else if (verifyPayload.connection_type === "servicenow_itsm") {
							// ServiceNow ITSM connection (for ticket sync)
							options = {
								itsm_tables: [
									{ title: "Incidents", sys_id: "incident" },
									{ title: "Problems", sys_id: "problem" },
									{ title: "Changes", sys_id: "change_request" },
								],
							};
						} else if (verifyPayload.connection_type === "sharepoint") {
							options = {
								sites: ["https://company.sharepoint.com/sites/docs"],
							};
						} else if (verifyPayload.connection_type === "jira") {
							options = {
								projects: [
									{ key: "ENG", name: "Engineering" },
									{ key: "SUP", name: "Support" },
									{ key: "OPS", name: "Operations" },
								],
							};
						} else if (verifyPayload.connection_type === "jira_itsm") {
							options = {
								projects: [
									{ key: "IT", name: "IT Support" },
									{ key: "HELP", name: "Helpdesk" },
									{ key: "SRE", name: "Site Reliability" },
								],
								issue_types: [
									{ id: "10001", name: "Incident" },
									{ id: "10002", name: "Service Request" },
									{ id: "10003", name: "Problem" },
								],
								statuses: [
									{ id: "1", name: "To Do" },
									{ id: "3", name: "In Progress" },
									{ id: "6", name: "Done" },
								],
							};
						}

						const verificationMessage = {
							type: "verification",
							connection_id: verifyPayload.connection_id,
							tenant_id: verifyPayload.tenant_id,
							status: "success",
							options: options,
							error: null,
						};

						await rabbitmqService.publishToQueue(
							"data_source_status",
							verificationMessage,
						);

						contextLogger.info(
							{
								connectionId: verifyPayload.connection_id,
								status: "success",
								queue: "data_source_status",
							},
							"Published verification success message to RabbitMQ",
						);
					}
				} catch (error) {
					contextLogger.error(
						{ error },
						"Failed to publish verification message",
					);
				}
			}, 1000);

			res.status(200).json({
				success: true,
				message: "Verification started",
			});
			return;
		} else if (
			payload.source === "rita-chat" &&
			payload.action === "trigger_sync"
		) {
			const syncPayload = payload as DataSourceSyncPayload;
			const contextLogger = createContextLogger(webhookLogger, correlationId, {
				tenantId: syncPayload.tenant_id,
			});

			contextLogger.info(
				{
					source: syncPayload.source,
					action: syncPayload.action,
					connection_id: syncPayload.connection_id,
					connection_type: syncPayload.connection_type,
					user_email: syncPayload.user_email,
				},
				"Received data source sync trigger webhook",
			);

			// Publish sync_completed message to RabbitMQ after 20 second delay
			setTimeout(async () => {
				try {
					// Check if sync was cancelled before sending sync_completed
					if (cancelledSyncConnections.has(syncPayload.connection_id)) {
						contextLogger.info(
							{
								connectionId: syncPayload.connection_id,
							},
							"Sync was cancelled - skipping sync_completed message",
						);
						// Remove from cancelled set after skipping
						cancelledSyncConnections.delete(syncPayload.connection_id);
						return;
					}

					const rabbitmqService = getRabbitMQService();

					const syncMessage = {
						type: "sync",
						connection_id: syncPayload.connection_id,
						tenant_id: syncPayload.tenant_id,
						status: "sync_completed",
						documents_processed: 42,
						timestamp: new Date().toISOString(),
					};

					await rabbitmqService.publishToQueue(
						"data_source_status",
						syncMessage,
					);

					contextLogger.info(
						{
							connectionId: syncPayload.connection_id,
							documentsProcessed: 42,
						},
						"Published sync_completed message to RabbitMQ",
					);
				} catch (error) {
					contextLogger.error(
						{ error },
						"Failed to publish sync_completed message",
					);
				}
			}, 20000);

			res.status(200).json({
				success: true,
				message: "Sync triggered successfully",
			});
			return;
		} else if (
			payload.source === "rita-chat" &&
			payload.action === "sync_tickets"
		) {
			// ITSM Autopilot: Sync tickets for clustering
			const ticketsPayload = payload as SyncTicketsWebhookPayload;
			const contextLogger = createContextLogger(webhookLogger, correlationId, {
				tenantId: ticketsPayload.tenant_id,
			});

			contextLogger.info(
				{
					source: ticketsPayload.source,
					action: ticketsPayload.action,
					connection_id: ticketsPayload.connection_id,
					connection_type: ticketsPayload.connection_type,
					ingestion_run_id: ticketsPayload.ingestion_run_id,
					time_range_days: ticketsPayload.settings?.time_range_days,
					user_email: ticketsPayload.user_email,
				},
				"Received sync_tickets webhook",
			);

			// For ServiceNow ITSM, insert actual test data into the database
			const isServiceNow = ticketsPayload.connection_type === "servicenow_itsm";

			// Start async data sync and progress reporting
			(async () => {
				try {
					const rabbitmqService = getRabbitMQService();

					let totalTickets: number;
					let ticketsCreated = 0;

					if (isServiceNow) {
						// Insert actual data for ServiceNow ITSM
						contextLogger.info(
							"Inserting ServiceNow test data into database...",
						);

						// Send initial progress message
						const initialMessage = {
							type: "ticket_ingestion",
							tenant_id: ticketsPayload.tenant_id,
							user_id: ticketsPayload.user_id,
							ingestion_run_id: ticketsPayload.ingestion_run_id,
							connection_id: ticketsPayload.connection_id,
							status: "running",
							records_processed: 0,
							records_failed: 0,
							total_estimated: 270, // ~10 per cluster * 27 clusters
							timestamp: new Date().toISOString(),
						};
						await rabbitmqService.publishToQueue(
							"data_source_status",
							initialMessage,
						);

						// Perform actual data insertion
						// Pass settings to enable username-based training state scenarios
						const syncResult = await syncServiceNowData(
							ticketsPayload.tenant_id,
							ticketsPayload.connection_id,
							ticketsPayload.ingestion_run_id,
							ticketsPayload.settings,
						);

						totalTickets = syncResult.ticketsCreated;
						ticketsCreated = syncResult.ticketsCreated;

						contextLogger.info(
							{
								modelId: syncResult.modelId,
								clustersCreated: syncResult.clustersCreated,
								ticketsCreated: syncResult.ticketsCreated,
							},
							"ServiceNow data inserted successfully",
						);

						// Simulate realistic sync time with partial progress updates
						// 0s: 0 tickets (already sent)
						// 2s: ~50% progress
						// 4s: ~80% progress
						// 5s: complete
						const progressUpdates = [
							{ delay: 2000, percent: 0.5 },
							{ delay: 2000, percent: 0.8 },
						];

						for (const update of progressUpdates) {
							await new Promise((resolve) => setTimeout(resolve, update.delay));
							const progressMessage = {
								type: "ticket_ingestion",
								tenant_id: ticketsPayload.tenant_id,
								user_id: ticketsPayload.user_id,
								ingestion_run_id: ticketsPayload.ingestion_run_id,
								connection_id: ticketsPayload.connection_id,
								status: "running",
								records_processed: Math.floor(totalTickets * update.percent),
								records_failed: 0,
								total_estimated: totalTickets,
								timestamp: new Date().toISOString(),
							};
							await rabbitmqService.publishToQueue(
								"data_source_status",
								progressMessage,
							);
							contextLogger.info(
								{
									percent: update.percent * 100,
									processed: progressMessage.records_processed,
								},
								"Sent progress update",
							);
						}

						// Final delay before completion
						await new Promise((resolve) => setTimeout(resolve, 1000));
					} else {
						// For other ITSM types, just simulate (no actual data insertion)
						totalTickets = Math.floor(Math.random() * 150) + 50;
						await new Promise((resolve) => setTimeout(resolve, 2000));
					}

					// Send completion message with actual counts
					const completedMessage = {
						type: "ticket_ingestion",
						tenant_id: ticketsPayload.tenant_id,
						user_id: ticketsPayload.user_id,
						ingestion_run_id: ticketsPayload.ingestion_run_id,
						connection_id: ticketsPayload.connection_id,
						status: "completed",
						records_processed: totalTickets,
						records_failed: 0,
						total_estimated: totalTickets,
						timestamp: new Date().toISOString(),
					};

					await rabbitmqService.publishToQueue(
						"data_source_status",
						completedMessage,
					);

					contextLogger.info(
						{
							ingestionRunId: ticketsPayload.ingestion_run_id,
							recordsProcessed: totalTickets,
							ticketsCreated,
							isServiceNow,
						},
						"Published ticket_ingestion completed message",
					);
				} catch (error) {
					contextLogger.error({ error }, "Failed to sync tickets");

					// Send failure message
					try {
						const rabbitmqService = getRabbitMQService();
						const failedMessage = {
							type: "ticket_ingestion",
							tenant_id: ticketsPayload.tenant_id,
							user_id: ticketsPayload.user_id,
							ingestion_run_id: ticketsPayload.ingestion_run_id,
							connection_id: ticketsPayload.connection_id,
							status: "failed",
							records_processed: 0,
							records_failed: 0,
							total_estimated: 0,
							error: error instanceof Error ? error.message : "Unknown error",
							timestamp: new Date().toISOString(),
						};

						await rabbitmqService.publishToQueue(
							"data_source_status",
							failedMessage,
						);
					} catch (publishError) {
						contextLogger.error(
							{ error: publishError },
							"Failed to publish failure message",
						);
					}
				}
			})();

			res.status(200).json({
				success: true,
				message: "Ticket sync triggered successfully",
				ingestion_run_id: ticketsPayload.ingestion_run_id,
			});
			return;
		} else if (
			payload.source === "rita-credential-delegation" &&
			payload.action === "send_delegation_email"
		) {
			const delegationPayload = payload as CredentialDelegationEmailPayload;

			const contextLogger = createContextLogger(webhookLogger, correlationId, {
				tenantId: delegationPayload.tenant_id,
				email: delegationPayload.admin_email,
			});

			contextLogger.info(
				{
					source: delegationPayload.source,
					action: delegationPayload.action,
					admin_email: delegationPayload.admin_email,
					organization_name: delegationPayload.organization_name,
					itsm_system_type: delegationPayload.itsm_system_type,
					delegation_token_id: delegationPayload.delegation_token_id,
					expires_at: delegationPayload.expires_at,
				},
				"Received send_delegation_email webhook",
			);

			// Send delegation email via Mailpit
			try {
				await emailService.sendCredentialDelegation(
					delegationPayload.admin_email,
					delegationPayload.delegation_url,
					delegationPayload.organization_name,
					delegationPayload.itsm_system_type,
					delegationPayload.user_email || "Unknown",
					delegationPayload.expires_at,
				);

				contextLogger.info(
					{
						admin_email: delegationPayload.admin_email,
						delegation_token_id: delegationPayload.delegation_token_id,
					},
					"📧 Credential delegation email sent successfully via Mailpit",
				);

				res.status(200).json({
					success: true,
					message: "Credential delegation email sent successfully",
					admin_email: delegationPayload.admin_email,
					delegation_token_id: delegationPayload.delegation_token_id,
				});
				return;
			} catch (error) {
				logError(contextLogger, error as Error, {
					operation: "send-delegation-email",
				});

				res.status(500).json({
					success: false,
					message: "Failed to send credential delegation email",
					error: error instanceof Error ? error.message : "Unknown error",
				});
				return;
			}
		} else {
			const errorLogger = createContextLogger(webhookLogger, correlationId);
			// Avoid accessing properties on a value narrowed to never by referencing raw body as BaseWebhookPayload
			const basePayload = req.body as BaseWebhookPayload;
			errorLogger.warn(
				{
					source: basePayload.source,
					action: basePayload.action,
				},
				"Unsupported webhook type",
			);
			res.status(400).json({
				error: `Unsupported webhook type: ${basePayload.source}:${basePayload.action}`,
			});
			return;
		}

		const contextLogger = createContextLogger(webhookLogger, correlationId, {
			tenantId: payload.tenant_id,
			userId: payload.user_id,
		});

		// Check authorization
		const authHeader = req.headers.authorization;
		const expectedAuth = process.env.AUTOMATION_AUTH;

		// Handle both "Basic token" and "token" formats
		const receivedToken = authHeader?.startsWith("Basic ")
			? authHeader.substring(6)
			: authHeader;

		if (receivedToken !== expectedAuth) {
			contextLogger.warn(
				{
					hasAuthHeader: !!authHeader,
					authHeaderPrefix: `${authHeader?.substring(0, 10)}...`,
					expectedAuth: `${expectedAuth?.substring(0, 10)}...`,
				},
				"Webhook authentication failed",
			);
			res.status(401).json({ error: "Unauthorized" });
			return;
		}

		contextLogger.info({}, "Webhook authenticated successfully");

		// Handle processing based on webhook type
		if (payload.source === "rita-chat") {
			// Message processing - generate response and send to RabbitMQ
			const estimatedCompletion = new Date(
				Date.now() + MOCK_CONFIG.responseDelay,
			);
			timer.end({
				messageId: (payload as MessageWebhookPayload).message_id,
				estimatedCompletion: estimatedCompletion.toISOString(),
				responseDelay: MOCK_CONFIG.responseDelay,
				success: true,
			});

			contextLogger.info(
				{
					estimatedCompletion: estimatedCompletion.toISOString(),
					responseDelay: MOCK_CONFIG.responseDelay,
				},
				"Message webhook acknowledged, processing scheduled",
			);

			res.status(202).json({
				message: "Message webhook received, processing started",
				message_id: (payload as MessageWebhookPayload).message_id,
				estimated_completion: estimatedCompletion.toISOString(),
			});

			// Process message with configured delay
			setTimeout(async () => {
				const processingTimer = new PerformanceTimer(
					webhookLogger,
					"mock-message-processing",
				);
				const messagePayload = payload as MessageWebhookPayload;
				const processingLogger = createContextLogger(
					webhookLogger,
					correlationId,
					{
						messageId: messagePayload.message_id,
						tenantId: messagePayload.tenant_id,
						userId: messagePayload.user_id,
						conversationId: messagePayload.conversation_id,
					},
				);

				try {
					processingLogger.info(
						{},
						"Starting mock message response generation",
					);
					const responses = generateMockResponse(payload);
					if (responses && responses.length > 0) {
						// Publish each response part separately with incremental delays to ensure proper ordering
						for (let i = 0; i < responses.length; i++) {
							const response = responses[i];
							// Add small delay between parts (100ms * index) to ensure chronological order
							if (i > 0) {
								await new Promise((resolve) => setTimeout(resolve, 100 * i));
							}
							await publishResponse(response);
						}
						processingTimer.end({
							messageId: messagePayload.message_id,
							responseCount: responses.length,
							success: true,
						});
						processingLogger.info(
							{ responseCount: responses.length },
							"Mock message processing completed successfully",
						);
					} else {
						processingLogger.warn({}, "No response generated for message");
					}
				} catch (error) {
					processingTimer.end({ success: false });
					logError(processingLogger, error as Error, {
						operation: "mock-message-processing",
						messageId: messagePayload.message_id,
					});

					// Send failure response
					const failureResponses = generateMockResponse(payload, "failure");
					if (failureResponses && failureResponses.length > 0) {
						try {
							for (const response of failureResponses) {
								await publishResponse(response);
							}
							processingLogger.info(
								{ responseCount: failureResponses.length },
								"Published failure response after error",
							);
						} catch (publishError) {
							logError(processingLogger, publishError as Error, {
								operation: "publish-failure-response",
								messageId: messagePayload.message_id,
							});
						}
					}
				}
			}, MOCK_CONFIG.responseDelay);
		} else if (payload.source === "rita-documents") {
			// Document processing - simulate processing and send status update
			const documentPayload = payload as DocumentWebhookPayload;
			timer.end({
				blobMetadataId: documentPayload.blob_metadata_id,
				blobId: documentPayload.blob_id,
				success: true,
			});

			contextLogger.info(
				{
					blob_metadata_id: documentPayload.blob_metadata_id,
					blob_id: documentPayload.blob_id,
					document_url: documentPayload.document_url,
					file_type: documentPayload.file_type,
					file_size: documentPayload.file_size,
					original_filename: documentPayload.original_filename,
				},
				"📄 Document processing webhook received",
			);

			// Publish processing_completed message to RabbitMQ after 3 second delay
			setTimeout(async () => {
				try {
					const rabbitmqService = getRabbitMQService();

					// Randomly simulate successful or failed document processing
					const isSuccess = Math.random() > 0.5; // 50% success rate
					const processingMessage: any = {
						type: "document_processing",
						blob_metadata_id: documentPayload.blob_metadata_id,
						tenant_id: documentPayload.tenant_id,
						user_id: documentPayload.user_id,
						status: isSuccess ? "processing_completed" : "processing_failed",
						timestamp: new Date().toISOString(),
					};

					if (isSuccess) {
						// Add processed content for successful processing
						processingMessage.processed_markdown = `# Processed Document: ${documentPayload.original_filename}\n\nThis is mock processed content from the document.\n\n## Summary\n- **File Type**: ${documentPayload.file_type}\n- **File Size**: ${documentPayload.file_size} bytes\n- **Processed At**: ${new Date().toISOString()}\n\n## Content\nMock extracted text content from the uploaded document. In a real scenario, this would contain the actual parsed and processed content from the PDF, DOCX, or other file format.`;
					} else {
						// Add error message for failed processing (using error_message to match consumer expectations)
						processingMessage.error_message =
							"Mock processing error: Failed to extract text from document";
					}

					await rabbitmqService.publishToQueue(
						"document_processing_status",
						processingMessage,
					);

					contextLogger.info(
						{
							blobMetadataId: documentPayload.blob_metadata_id,
							status: "processing_completed",
						},
						"Published document processing_completed message to RabbitMQ",
					);
				} catch (error) {
					contextLogger.error(
						{ error },
						"Failed to publish document processing message",
					);
				}
			}, 3000); // 3 second delay to simulate processing time

			res.status(200).json({
				message: "Document webhook received, processing started",
				blob_metadata_id: documentPayload.blob_metadata_id,
				blob_id: documentPayload.blob_id,
				status: "processing",
			});
		} else if (payload.source === "rita-signup") {
			// Signup processing - create Keycloak user and log verification URL
			const signupPayload = payload as SignupWebhookPayload;
			timer.end({
				email: signupPayload.user_email,
				pendingUserId: signupPayload.pending_user_id,
				success: true,
			});

			try {
				// Create user in Keycloak
				const keycloakUserId = await createKeycloakUser(signupPayload);

				// Send verification email via Mailpit
				await emailService.sendSignupVerification(
					signupPayload.user_email!,
					`${signupPayload.first_name} ${signupPayload.last_name}`,
					signupPayload.verification_url,
				);

				contextLogger.info(
					{
						email: signupPayload.user_email,
						keycloakUserId,
						verification_url: signupPayload.verification_url,
						pending_user_id: signupPayload.pending_user_id,
					},
					"🎉 SIGNUP SUCCESS: Keycloak user created and verification email sent",
				);

				res.status(200).json({
					message: "Signup webhook processed successfully",
					keycloak_user_id: keycloakUserId,
					email: signupPayload.user_email,
					status: "user_created_and_email_sent",
				});
			} catch (error) {
				logError(contextLogger, error as Error, {
					operation: "signup-processing",
				});

				res.status(200).json({
					message: "Signup webhook received but user creation failed",
					error: error instanceof Error ? error.message : "Unknown error",
					status: "failed_but_acknowledged",
				});
			}
		}
	} catch (error) {
		timer.end({ success: false });
		const errorLogger = createContextLogger(webhookLogger, correlationId);
		logError(errorLogger, error as Error, { operation: "webhook-processing" });
		res.status(500).json({ error: "Internal server error" });
	}
});

// Configuration endpoint
app.get("/config", (_req, res) => {
	const correlationId = generateCorrelationId();
	const contextLogger = createContextLogger(configLogger, correlationId);

	contextLogger.info({}, "Configuration requested");

	res.json({
		config: MOCK_CONFIG,
		scenarios: ["success", "failure", "processing", "random"],
		description: "Mock automation service for Rita Chat testing",
	});
});

// Start server
app.listen(PORT, async () => {
	logger.info(
		{
			port: PORT,
			endpoints: {
				health: `http://localhost:${PORT}/health`,
				config: `http://localhost:${PORT}/config`,
				webhook: `http://localhost:${PORT}/webhook`,
			},
			scenario: MOCK_CONFIG.defaultScenario,
			responseDelay: MOCK_CONFIG.responseDelay,
		},
		"Rita Mock Automation Service started",
	);

	// Initialize RabbitMQ with automatic retry on failure
	const rabbitmqService = getRabbitMQService();
	try {
		await rabbitmqService.connect();
		logger.info("RabbitMQ connected successfully");
	} catch (error) {
		// Don't crash the server - automatic reconnection will handle this
		logger.warn(
			{
				error: (error as Error).message,
				errorCode: (error as any).code,
			},
			"RabbitMQ initial connection failed - will retry automatically in background",
		);

		// Start reconnection in background (access private method via bracket notation)
		(rabbitmqService as any).reconnect();
	}
});

// Graceful shutdown
process.on("SIGINT", async () => {
	const shutdownLogger = logger.child({ operation: "graceful-shutdown" });
	shutdownLogger.info({}, "Mock service shutting down gracefully...");

	try {
		const rabbitmqService = getRabbitMQService();
		await rabbitmqService.close();
		shutdownLogger.info({}, "Graceful shutdown completed");
	} catch (error) {
		logError(shutdownLogger, error as Error, {
			operation: "graceful-shutdown",
		});
	}
	process.exit(0);
});
