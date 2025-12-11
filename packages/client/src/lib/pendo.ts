/**
 * Pendo Analytics Integration
 *
 * This module manages the Pendo SDK lifecycle for RITA Go.
 * Pendo is conditionally loaded based on VITE_PENDO_API_KEY environment variable.
 *
 * @module lib/pendo
 * @see docs/PENDO_INTEGRATION_DESIGN.md
 */

declare global {
	interface Window {
		pendo?: {
			initialize: (options: PendoInitOptions) => void;
			identify: (visitorData: PendoVisitor, accountData: PendoAccount) => void;
			updateOptions: (options: Partial<PendoInitOptions>) => void;
			isReady: () => boolean;
		};
	}
}

/**
 * Pendo Visitor metadata (user-level data)
 */
export interface PendoVisitor {
	/** Required: Unique user identifier (Keycloak user ID) */
	id: string;
	/** Optional: User email address */
	email?: string;
	/** Optional: User display name */
	full_name?: string;
	/** Optional: User role in organization */
	role?: string;
	/** Optional: Keycloak username */
	username?: string;
	/** Custom visitor metadata */
	[key: string]: string | number | boolean | undefined;
}

/**
 * Pendo Account metadata (organization-level data)
 */
export interface PendoAccount {
	/** Required: Unique account/organization identifier */
	id: string;
	/** Optional: Organization display name */
	name?: string;
	/** Optional: Number of members in organization */
	member_count?: number;
	/** Optional: Organization creation timestamp */
	created_at?: string;
	/** Custom account metadata */
	[key: string]: string | number | boolean | undefined;
}

/**
 * Pendo initialization options
 */
export interface PendoInitOptions {
	visitor: PendoVisitor;
	account: PendoAccount;
	events?: {
		ready?: () => void;
	};
}

/**
 * PendoManager - Singleton class for managing Pendo SDK lifecycle
 *
 * Responsibilities:
 * - Dynamically load Pendo script from CDN
 * - Initialize Pendo with user/account metadata
 * - Update metadata when profile changes
 * - Clean up on user logout
 *
 * @example
 * ```typescript
 * import { pendoManager } from '@/lib/pendo';
 *
 * // Initialize with user data
 * await pendoManager.initialize(
 *   { id: 'user-123', email: 'user@example.com' },
 *   { id: 'org-456', name: 'Acme Corp' }
 * );
 *
 * // Update metadata
 * pendoManager.updateMetadata(visitor, account);
 *
 * // Cleanup on logout
 * pendoManager.shutdown();
 * ```
 */
class PendoManager {
	private apiKey: string | null;
	private isInitialized = false;
	private scriptLoaded = false;
	private static readonly SCRIPT_ID = "pendo-script";

	constructor() {
		this.apiKey = import.meta.env.VITE_PENDO_API_KEY || null;

		if (!this.apiKey) {
			console.log("Pendo: API key not configured, analytics disabled");
		}
	}

	/**
	 * Load Pendo script asynchronously from CDN
	 * Checks DOM to prevent duplicate script injection
	 * @private
	 */
	private async loadScript(): Promise<void> {
		if (this.scriptLoaded || !this.apiKey) {
			return;
		}

		// Check if script already exists in DOM
		const existingScript = document.getElementById(PendoManager.SCRIPT_ID);
		if (existingScript) {
			console.log("Pendo: Script already exists in DOM, skipping injection");
			this.scriptLoaded = true;
			return;
		}

		return new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.id = PendoManager.SCRIPT_ID;
			script.async = true;
			script.src = `https://cdn.pendo.io/agent/static/${this.apiKey}/pendo.js`;

			script.onload = () => {
				this.scriptLoaded = true;
				console.log("Pendo: Script loaded successfully");
				resolve();
			};

			script.onerror = (error) => {
				console.error("Pendo: Failed to load script", error);
				reject(error);
			};

			document.head.appendChild(script);
		});
	}

	/**
	 * Initialize Pendo with user and account data
	 *
	 * This method:
	 * 1. Checks if API key is configured
	 * 2. Loads Pendo script if not already loaded
	 * 3. Initializes Pendo SDK with visitor/account metadata
	 * 4. Prevents duplicate initialization
	 *
	 * @param visitor - User metadata (id, email, name, etc.)
	 * @param account - Organization metadata (id, name, etc.)
	 * @throws {Error} If script fails to load or pendo object unavailable
	 *
	 * @example
	 * ```typescript
	 * await pendoManager.initialize(
	 *   { id: 'user-123', email: 'user@example.com', role: 'admin' },
	 *   { id: 'org-456', name: 'Acme Corp', member_count: 25 }
	 * );
	 * ```
	 */
	async initialize(
		visitor: PendoVisitor,
		account: PendoAccount,
	): Promise<void> {
		if (!this.apiKey) {
			console.log("Pendo: API key not configured, skipping initialization");
			return;
		}

		if (this.isInitialized) {
			console.log("Pendo: Already initialized, updating metadata");
			this.updateMetadata(visitor, account);
			return;
		}

		try {
			// Load script first
			await this.loadScript();

			// Wait for pendo to be available
			if (!window.pendo) {
				throw new Error("Pendo object not available after script load");
			}

			// Initialize Pendo
			window.pendo.initialize({
				visitor,
				account,
				events: {
					ready: () => {
						console.log("Pendo: Initialized and ready", { visitor, account });
					},
				},
			});

			this.isInitialized = true;
		} catch (error) {
			console.error("Pendo: Initialization failed", error);
			throw error;
		}
	}

	/**
	 * Update visitor and account metadata (for profile changes)
	 *
	 * Use this when user profile changes (e.g., name update, role change)
	 * without requiring full re-initialization.
	 *
	 * @param visitor - Updated visitor metadata
	 * @param account - Updated account metadata
	 *
	 * @example
	 * ```typescript
	 * // After user updates their profile
	 * pendoManager.updateMetadata(
	 *   { id: 'user-123', email: 'newemail@example.com', full_name: 'New Name' },
	 *   { id: 'org-456', name: 'Updated Org Name' }
	 * );
	 * ```
	 */
	updateMetadata(visitor: PendoVisitor, account: PendoAccount): void {
		if (!this.isInitialized || !window.pendo) {
			console.warn("Pendo: Cannot update metadata, not initialized");
			return;
		}

		try {
			window.pendo.identify(visitor, account);
			console.log("Pendo: Metadata updated", { visitor, account });
		} catch (error) {
			console.error("Pendo: Failed to update metadata", error);
		}
	}

	/**
	 * Check if Pendo is ready
	 *
	 * @returns {boolean} True if Pendo SDK is loaded and initialized
	 */
	isReady(): boolean {
		return this.isInitialized && !!window.pendo?.isReady?.();
	}

	/**
	 * Shutdown Pendo (on logout)
	 *
	 * Clears the current visitor session to prevent data leakage
	 * between different user sessions.
	 *
	 * @example
	 * ```typescript
	 * // On user logout
	 * pendoManager.shutdown();
	 * ```
	 */
	shutdown(): void {
		if (!this.isInitialized) {
			return;
		}

		console.log("Pendo: Shutting down (clearing visitor)");

		// Clear visitor by identifying with anonymous placeholder IDs
		if (window.pendo) {
			window.pendo.identify(
				{ id: "VISITOR-UNIQUE-ID" }, // Anonymous placeholder
				{ id: "ACCOUNT-UNIQUE-ID" }, // Anonymous placeholder
			);
		}

		this.isInitialized = false;
	}
}

/**
 * Singleton instance of PendoManager
 *
 * @example
 * ```typescript
 * import { pendoManager } from '@/lib/pendo';
 *
 * await pendoManager.initialize(visitor, account);
 * ```
 */
export const pendoManager = new PendoManager();
