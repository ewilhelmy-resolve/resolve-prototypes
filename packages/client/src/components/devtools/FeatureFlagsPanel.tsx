/**
 * FeatureFlagsPanel - Feature flags management UI
 *
 * Two-tier feature flag system:
 * - Platform-controlled flags: Synced with Platform Actions API
 * - Local flags: Stored in localStorage for dev/testing
 *
 * Resolution order: Local Override > Platform Flag > Default
 */

import { Cloud, RotateCcw, Settings } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { FEATURE_FLAGS, type FeatureFlagKey } from "@/types/featureFlags";

export function FeatureFlagsPanel() {
	const {
		flags,
		setFlag,
		resetAll,
		hasModifiedFlags,
		getPlatformValue,
		setPlatformFlag,
		initialized,
		loading,
	} = useFeatureFlags();

	// Track loading state per platform flag
	const [updatingFlags, setUpdatingFlags] = useState<Record<string, boolean>>(
		{},
	);

	// Group flags by category
	const categories = {
		general: [] as FeatureFlagKey[],
		debug: [] as FeatureFlagKey[],
		experimental: [] as FeatureFlagKey[],
		autopilot: [] as FeatureFlagKey[],
	};

	for (const key of Object.keys(FEATURE_FLAGS) as FeatureFlagKey[]) {
		const config = FEATURE_FLAGS[key];
		categories[config.category].push(key);
	}

	const handleReset = () => {
		resetAll();
		toast.success("All feature flags reset to defaults");
	};

	const handleToggle = (key: FeatureFlagKey, checked: boolean) => {
		setFlag(key, checked);
		const action = checked ? "enabled" : "disabled";
		toast.success(`${FEATURE_FLAGS[key].label} ${action}`);
	};

	const AUTO_PILOT_DEPENDENT_FLAGS: FeatureFlagKey[] = [
		"ENABLE_AUTO_PILOT_SUGGESTIONS",
		"ENABLE_AUTO_PILOT_ACTIONS",
	];

	const handlePlatformToggle = async (
		key: FeatureFlagKey,
		checked: boolean,
	) => {
		// If disabling master toggle, also disable dependent flags
		const flagsToUpdate: FeatureFlagKey[] = [key];
		if (key === "ENABLE_AUTO_PILOT" && !checked) {
			flagsToUpdate.push(...AUTO_PILOT_DEPENDENT_FLAGS);
		}

		setUpdatingFlags((prev) => {
			const updated = { ...prev };
			for (const flag of flagsToUpdate) {
				updated[flag] = true;
			}
			return updated;
		});

		const results = await Promise.all(
			flagsToUpdate.map((flag) =>
				setPlatformFlag(flag, flag === key ? checked : false),
			),
		);

		setUpdatingFlags((prev) => {
			const updated = { ...prev };
			for (const flag of flagsToUpdate) {
				updated[flag] = false;
			}
			return updated;
		});

		const allSuccess = results.every(Boolean);
		if (allSuccess) {
			const action = checked ? "enabled" : "disabled";
			if (key === "ENABLE_AUTO_PILOT" && !checked && flagsToUpdate.length > 1) {
				toast.success(`Auto Pilot and dependent features disabled on platform`);
			} else {
				toast.success(`${FEATURE_FLAGS[key].label} ${action} on platform`);
			}
		} else {
			toast.error(`Failed to update some flags on platform`);
		}
	};

	const isAutoPilotEnabled = getPlatformValue("ENABLE_AUTO_PILOT") ?? false;

	/** Render a platform-controlled flag item */
	const renderPlatformFlag = (key: FeatureFlagKey, disabled?: boolean) => {
		const config = FEATURE_FLAGS[key];
		const platformValue = getPlatformValue(key);
		const isUpdating = updatingFlags[key] || false;
		const isDisabled = disabled || isUpdating;

		return (
			<div
				key={key}
				className={`flex items-start justify-between gap-4 ${disabled ? "opacity-50" : ""}`}
			>
				<div className="flex-1 space-y-1">
					<Label
						htmlFor={`${key}-platform`}
						className={`text-sm font-medium ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
					>
						{config.label}
					</Label>
					<p className="text-sm text-muted-foreground">{config.description}</p>
				</div>
				<div className="flex items-center gap-2">
					{!initialized && loading ? (
						<span className="text-sm text-muted-foreground/50">Loading...</span>
					) : (
						<Switch
							id={`${key}-platform`}
							checked={platformValue ?? false}
							onCheckedChange={(checked) => handlePlatformToggle(key, checked)}
							disabled={isDisabled}
							aria-label={`Toggle ${config.label} on platform`}
						/>
					)}
					{isUpdating && (
						<span className="text-sm text-muted-foreground/50">Saving...</span>
					)}
				</div>
			</div>
		);
	};

	/** Render a local-only flag item */
	const renderLocalFlag = (key: FeatureFlagKey) => {
		const config = FEATURE_FLAGS[key];

		return (
			<div key={key} className="flex items-start justify-between gap-4">
				<div className="flex-1 space-y-1">
					<Label htmlFor={key} className="text-sm font-medium cursor-pointer">
						{config.label}
					</Label>
					<p className="text-sm text-muted-foreground">{config.description}</p>
				</div>
				<Switch
					id={key}
					checked={flags[key]}
					onCheckedChange={(checked) => handleToggle(key, checked)}
				/>
			</div>
		);
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Settings className="h-5 w-5 text-muted-foreground" />
					<div>
						<h2 className="text-lg font-semibold">Feature Flags</h2>
						<p className="text-sm text-muted-foreground">
							Platform + local control
						</p>
					</div>
				</div>
				{hasModifiedFlags() && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleReset}
						className="gap-2"
					>
						<RotateCcw className="h-4 w-4" />
						Reset All
					</Button>
				)}
			</div>

			{/* General Features */}
			{categories.general.length > 0 && (
				<Card className="p-6">
					<h3 className="font-medium mb-4">General Features</h3>
					<div className="space-y-4">
						{categories.general.map((key) =>
							FEATURE_FLAGS[key].platformControlled
								? renderPlatformFlag(key)
								: renderLocalFlag(key),
						)}
					</div>
				</Card>
			)}

			{/* Debug Features */}
			{categories.debug.length > 0 && (
				<Card className="p-6">
					<h3 className="font-medium mb-4">Debug Features</h3>
					<div className="space-y-4">
						{categories.debug.map((key) =>
							FEATURE_FLAGS[key].platformControlled
								? renderPlatformFlag(key)
								: renderLocalFlag(key),
						)}
					</div>
				</Card>
			)}

			{/* Experimental Features (includes Auto Pilot) */}
			{(categories.experimental.length > 0 ||
				categories.autopilot.length > 0) && (
				<Card className="p-6 border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
					<h3 className="font-medium mb-4 text-amber-900 dark:text-amber-100">
						Experimental Features
					</h3>
					<p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
						These features are in early development and may be unstable.
					</p>
					{categories.experimental.length > 0 && (
						<>
							<Separator className="my-4" />
							<div className="space-y-4">
								{categories.experimental.map((key) =>
									FEATURE_FLAGS[key].platformControlled
										? renderPlatformFlag(key)
										: renderLocalFlag(key),
								)}
							</div>
						</>
					)}

					{/* Auto Pilot (Platform-Controlled) */}
					{categories.autopilot.length > 0 && (
						<>
							<Separator className="my-4" />
							<div className="flex items-center gap-2 mb-4">
								<Cloud className="h-5 w-5 text-blue-600 dark:text-blue-400" />
								<h3 className="font-medium text-blue-900 dark:text-blue-100">
									Auto Pilot (Platform-Controlled)
								</h3>
							</div>
							<div className="space-y-4">
								{renderPlatformFlag("ENABLE_AUTO_PILOT")}

								{categories.autopilot
									.filter((key) => key !== "ENABLE_AUTO_PILOT")
									.map((key) => renderPlatformFlag(key, !isAutoPilotEnabled))}
							</div>
						</>
					)}
				</Card>
			)}

			<Card className="p-4 bg-muted/50">
				<p className="text-xs text-muted-foreground">
					<strong>Note:</strong> Feature flags are stored in localStorage and
					persist across browser sessions. Changes take effect immediately
					without requiring a page refresh.
				</p>
			</Card>
		</div>
	);
}
