import { useMutation } from "@tanstack/react-query";
import { type EnableShareResponse, shareApi } from "@/services/api";

export type { EnableShareResponse };

/**
 * Enable sharing for an authenticated user's own conversation.
 * Backed by POST /api/conversations/:id/share/enable (Keycloak + ownership).
 */
export function useEnableShare() {
	return useMutation({
		mutationFn: (conversationId: string) => shareApi.enable(conversationId),
	});
}

/**
 * Disable sharing for an authenticated user's own conversation.
 */
export function useDisableShare() {
	return useMutation({
		mutationFn: (conversationId: string) => shareApi.disable(conversationId),
	});
}

/**
 * Platform flow — enable sharing for the iframe-embedded conversation.
 * Auth via Valkey sessionKey (not Keycloak).
 * Used when Actions Platform triggers share from its own UI.
 */
export function useEnableShareFromSession() {
	return useMutation({
		mutationFn: (sessionKey: string) => shareApi.enableFromSession(sessionKey),
	});
}

export function useDisableShareFromSession() {
	return useMutation({
		mutationFn: (sessionKey: string) => shareApi.disableFromSession(sessionKey),
	});
}
