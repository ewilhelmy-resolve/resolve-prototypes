/**
 * Feature Flags Store (Zustand)
 *
 * Two-tier feature flag system:
 * - Platform flags: Fetched from Platform Actions API per tenant
 * - Local overrides: localStorage-based for dev/testing
 *
 * Resolution order: Local Override > Platform Flag > Default (false)
 */

import { create } from "zustand";
import {
	fetchAllPlatformFlags,
	updatePlatformFlag,
} from "@/services/platformFlags";
import {
	FEATURE_FLAGS,
	type FeatureFlagKey,
	type FlagSource,
} from "@/types/featureFlags";

const LOCAL_STORAGE_KEY = "rita_feature_flags";

/** Platform-controlled flag keys */
export const PLATFORM_CONTROLLED_FLAGS: FeatureFlagKey[] = [
	"ENABLE_AUTO_PILOT",
	"ENABLE_AUTO_PILOT_SUGGESTIONS",
	"ENABLE_AUTO_PILOT_ACTIONS",
	"ENABLE_IFRAME_DEV_TOOLS",
];

interface FeatureFlagsState {
	/** Flags fetched from Platform Actions API */
	platformFlags: Record<string, boolean>;
	/** Local overrides from localStorage */
	localOverrides: Record<string, boolean>;
	/** Whether platform flags have been fetched */
	initialized: boolean;
	/** Whether platform flags are currently being fetched */
	loading: boolean;
	/** Current tenant ID (for API calls) */
	tenantId: string | null;

	/** Initialize platform flags for a tenant */
	initialize: (tenantId: string) => Promise<void>;
	/** Get resolved flag value (local > platform > default) */
	getFlag: (key: FeatureFlagKey) => boolean;
	/** Set a local override for a flag */
	setLocalOverride: (key: FeatureFlagKey, value: boolean) => void;
	/** Clear a local override for a flag */
	clearLocalOverride: (key: FeatureFlagKey) => void;
	/** Clear all local overrides */
	clearAllLocalOverrides: () => void;
	/** Get the source of a flag's resolved value */
	getFlagSource: (key: FeatureFlagKey) => FlagSource;
	/** Get platform value for a flag (if available) */
	getPlatformValue: (key: FeatureFlagKey) => boolean | undefined;
	/** Check if a flag has a local override */
	hasLocalOverride: (key: FeatureFlagKey) => boolean;
	/** Update a platform flag value (calls Platform Actions API) */
	setPlatformFlag: (key: FeatureFlagKey, value: boolean) => Promise<boolean>;
	/** Subscribe to flag changes (for React re-renders) */
	subscribe: (listener: () => void) => () => void;
}

/**
 * Load local overrides from localStorage
 */
function loadLocalOverrides(): Record<string, boolean> {
	if (typeof window === "undefined") return {};

	try {
		const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
		return stored ? JSON.parse(stored) : {};
	} catch {
		return {};
	}
}

/**
 * Save local overrides to localStorage
 */
function saveLocalOverrides(overrides: Record<string, boolean>): void {
	if (typeof window === "undefined") return;

	try {
		localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(overrides));
	} catch (error) {
		console.warn("Failed to save feature flags to localStorage:", error);
	}
}

export const useFeatureFlagsStore = create<FeatureFlagsState>((set, get) => {
	const listeners = new Set<() => void>();

	const notifyListeners = () => {
		for (const listener of listeners) {
			listener();
		}
	};

	return {
		platformFlags: {},
		localOverrides: loadLocalOverrides(),
		initialized: false,
		loading: false,
		tenantId: null,

		initialize: async (tenantId: string) => {
			const state = get();
			if (state.initialized || state.loading) {
				return;
			}

			set({ loading: true, tenantId });

			try {
				const platformFlags = await fetchAllPlatformFlags(
					PLATFORM_CONTROLLED_FLAGS,
					tenantId,
				);

				set({
					platformFlags,
					initialized: true,
					loading: false,
				});
				notifyListeners();
			} catch (error) {
				console.warn("Failed to fetch platform flags:", error);
				set({
					initialized: true,
					loading: false,
				});
			}
		},

		getFlag: (key: FeatureFlagKey) => {
			const { localOverrides, platformFlags } = get();
			const config = FEATURE_FLAGS[key];

			// Resolution: local > platform > default
			if (key in localOverrides) {
				return localOverrides[key];
			}
			if (key in platformFlags) {
				return platformFlags[key];
			}
			return config?.defaultValue ?? false;
		},

		setLocalOverride: (key: FeatureFlagKey, value: boolean) => {
			const localOverrides = { ...get().localOverrides, [key]: value };
			saveLocalOverrides(localOverrides);
			set({ localOverrides });
			notifyListeners();
		},

		clearLocalOverride: (key: FeatureFlagKey) => {
			const { [key]: _, ...rest } = get().localOverrides;
			saveLocalOverrides(rest);
			set({ localOverrides: rest });
			notifyListeners();
		},

		clearAllLocalOverrides: () => {
			saveLocalOverrides({});
			set({ localOverrides: {} });
			notifyListeners();
		},

		getFlagSource: (key: FeatureFlagKey) => {
			const { localOverrides, platformFlags } = get();
			if (key in localOverrides) return "local";
			if (key in platformFlags) return "platform";
			return "default";
		},

		getPlatformValue: (key: FeatureFlagKey) => {
			const { platformFlags } = get();
			return key in platformFlags ? platformFlags[key] : undefined;
		},

		hasLocalOverride: (key: FeatureFlagKey) => {
			return key in get().localOverrides;
		},

		setPlatformFlag: async (key: FeatureFlagKey, value: boolean) => {
			const { tenantId } = get();
			if (!tenantId) {
				console.warn("Cannot update platform flag: tenant ID not available");
				return false;
			}

			const success = await updatePlatformFlag(key, tenantId, value);
			if (success) {
				// Update local state to reflect the change
				const platformFlags = { ...get().platformFlags, [key]: value };
				set({ platformFlags });
				notifyListeners();
			}
			return success;
		},

		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
});
