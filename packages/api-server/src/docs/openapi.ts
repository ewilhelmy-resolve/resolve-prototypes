import {
	extendZodWithOpenApi,
	OpenAPIRegistry,
	OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import type { OpenAPIObject } from "openapi3-ts/oas31";
import { z } from "zod";

// Extend Zod with OpenAPI support
extendZodWithOpenApi(z);

// Create singleton registry
export const registry = new OpenAPIRegistry();

// Register security schemes
registry.registerComponent("securitySchemes", "bearerAuth", {
	type: "http",
	scheme: "bearer",
	bearerFormat: "JWT",
	description: "Keycloak JWT token",
});

registry.registerComponent("securitySchemes", "cookieAuth", {
	type: "apiKey",
	in: "cookie",
	name: "session",
	description: "Session cookie authentication",
});

/**
 * Generate OpenAPI document from registered schemas and paths
 */
export function generateOpenAPIDocument(): OpenAPIObject {
	const generator = new OpenApiGeneratorV31(registry.definitions);

	return generator.generateDocument({
		openapi: "3.1.0",
		info: {
			title: "Rita API",
			version: "1.0.0",
			description: `
Rita API Server for the RITA Go application.

## Authentication
Most endpoints require authentication via Keycloak JWT token or session cookie.

## Organization Context
All data is scoped to the user's active organization (tenant).

## Real-time Updates
For real-time updates, connect to the SSE endpoint at \`/api/sse/events\`.
See AsyncAPI spec for event documentation.
			`.trim(),
			contact: {
				name: "Rita Team",
			},
		},
		servers: [
			{
				url: "/",
				description: "Current server",
			},
		],
		tags: [
			{ name: "Auth", description: "Authentication and session management" },
			{ name: "Clusters", description: "Ticket cluster management" },
			{ name: "Conversations", description: "Chat conversation management" },
			{ name: "Data Sources", description: "Data source connections" },
			{ name: "Files", description: "File upload and management" },
			{ name: "Members", description: "Organization member management" },
			{ name: "Organizations", description: "Organization settings" },
			{ name: "Invitations", description: "User invitations" },
			{ name: "Credential Delegations", description: "ITSM credential setup" },
			{ name: "Feature Flags", description: "Feature flag access" },
			{ name: "SSE", description: "Server-Sent Events" },
			{ name: "Workflows", description: "Dynamic workflow generation" },
			{ name: "Health", description: "Health check endpoints" },
		],
		security: [{ bearerAuth: [] }, { cookieAuth: [] }],
	});
}

export { z };
