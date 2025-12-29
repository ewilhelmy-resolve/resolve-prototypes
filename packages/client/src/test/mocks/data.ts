/**
 * Mock data factories for testing
 */

/**
 * Creates a mock user object
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
	return {
		id: "user-123",
		email: "test@example.com",
		name: "Test User",
		role: "user",
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

interface MockUser {
	id: string;
	email: string;
	name: string;
	role: string;
	createdAt: string;
}

/**
 * Creates a mock conversation object
 */
export function createMockConversation(
	overrides: Partial<MockConversation> = {}
): MockConversation {
	return {
		id: "conv-123",
		title: "Test Conversation",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		messageCount: 0,
		...overrides,
	};
}

interface MockConversation {
	id: string;
	title: string;
	createdAt: string;
	updatedAt: string;
	messageCount: number;
}

/**
 * Creates a mock message object
 */
export function createMockMessage(
	overrides: Partial<MockMessage> = {}
): MockMessage {
	return {
		id: "msg-123",
		conversationId: "conv-123",
		role: "user",
		content: "Test message content",
		createdAt: new Date().toISOString(),
		status: "completed",
		...overrides,
	};
}

interface MockMessage {
	id: string;
	conversationId: string;
	role: "user" | "assistant" | "system";
	content: string;
	createdAt: string;
	status: "pending" | "processing" | "completed" | "failed";
}

/**
 * Creates a mock file/knowledge article object
 */
export function createMockFile(overrides: Partial<MockFile> = {}): MockFile {
	return {
		id: "file-123",
		name: "test-document.pdf",
		size: 1024000,
		type: "application/pdf",
		uploadedAt: new Date().toISOString(),
		status: "processed",
		...overrides,
	};
}

interface MockFile {
	id: string;
	name: string;
	size: number;
	type: string;
	uploadedAt: string;
	status: "uploading" | "processing" | "processed" | "failed";
}

/**
 * Creates a mock connection source object
 */
export function createMockConnection(
	overrides: Partial<MockConnection> = {}
): MockConnection {
	return {
		id: "conn-123",
		name: "Test Connection",
		type: "confluence",
		status: "connected",
		lastSyncAt: new Date().toISOString(),
		...overrides,
	};
}

interface MockConnection {
	id: string;
	name: string;
	type: "confluence" | "sharepoint" | "servicenow" | "web";
	status: "connected" | "syncing" | "error" | "not_connected";
	lastSyncAt: string | null;
}
