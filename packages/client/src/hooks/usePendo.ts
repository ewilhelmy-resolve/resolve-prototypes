/**
 * Pendo Analytics React Hook
 *
 * This hook automatically manages Pendo lifecycle based on authentication
 * and profile state. It initializes Pendo when the user logs in and cleans
 * up when the user logs out.
 *
 * @module hooks/usePendo
 */

import { useEffect, useRef } from "react";
import {
	type PendoAccount,
	type PendoVisitor,
	pendoManager,
} from "@/lib/pendo";
import { useProfile } from "./api/useProfile";
import { useAuth } from "./useAuth";

/**
 * Hook to automatically initialize Pendo when user logs in
 * and clean up when user logs out.
 *
 * This hook:
 * 1. Watches authentication state (useAuth)
 * 2. Watches profile data (useProfile)
 * 3. Initializes Pendo when user is authenticated AND profile is loaded
 * 4. Shuts down Pendo when user logs out
 *
 * Usage: Call once in App.tsx or main layout component
 *
 * @example
 * ```tsx
 * function App() {
 *   usePendo(); // Initialize Pendo lifecycle
 *
 *   return <AppRouter />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Pendo lifecycle flow:
 * // 1. User logs in → authenticated = true
 * // 2. Profile loads → profile data available
 * // 3. usePendo detects both conditions → pendoManager.initialize()
 * // 4. User logs out → authenticated = false
 * // 5. usePendo detects logout → pendoManager.shutdown()
 * ```
 */
export function usePendo() {
	const { authenticated, sessionReady } = useAuth();
	const { data: profile, isLoading: isLoadingProfile } = useProfile();
	const initializedRef = useRef(false);

	// Initialize Pendo once when user is authenticated and profile is loaded
	useEffect(() => {
		// Only initialize if user is authenticated and profile is loaded
		if (!authenticated || !sessionReady || isLoadingProfile || !profile) {
			return;
		}

		// Skip if already initialized (prevents duplicate script injection)
		if (initializedRef.current) {
			return;
		}

		// Map user data to Pendo Visitor format
		const visitor: PendoVisitor = {
			id: profile.user.id,
			email: profile.user.email,
			full_name:
				[profile.user.firstName, profile.user.lastName]
					.filter(Boolean)
					.join(" ") || undefined,
			role: profile.organization.role,
			username: profile.user.username,
		};

		// Map organization data to Pendo Account format
		const account: PendoAccount = {
			id: profile.organization.id,
			name: profile.organization.name,
			member_count: profile.organization.memberCount,
			created_at: profile.organization.createdAt,
		};

		// Initialize Pendo asynchronously (only once)
		pendoManager
			.initialize(visitor, account)
			.then(() => {
				initializedRef.current = true;
			})
			.catch((error) => {
				// Error is already logged by PendoManager, but we catch here
				// to prevent unhandled promise rejection
				console.error("Failed to initialize Pendo:", error);
			});
	}, [authenticated, sessionReady, isLoadingProfile, profile]);

	// Update Pendo metadata when profile changes (after initial load)
	useEffect(() => {
		// Only update if already initialized and profile is available
		if (!initializedRef.current || !profile) {
			return;
		}

		// Map user data to Pendo Visitor format
		const visitor: PendoVisitor = {
			id: profile.user.id,
			email: profile.user.email,
			full_name:
				[profile.user.firstName, profile.user.lastName]
					.filter(Boolean)
					.join(" ") || undefined,
			role: profile.organization.role,
			username: profile.user.username,
		};

		// Map organization data to Pendo Account format
		const account: PendoAccount = {
			id: profile.organization.id,
			name: profile.organization.name,
			member_count: profile.organization.memberCount,
			created_at: profile.organization.createdAt,
		};

		// Update metadata without re-initializing
		pendoManager.updateMetadata(visitor, account);
	}, [profile]);

	// Cleanup on logout
	useEffect(() => {
		if (!authenticated) {
			pendoManager.shutdown();
			initializedRef.current = false; // Reset for next login
		}
	}, [authenticated]);
}
