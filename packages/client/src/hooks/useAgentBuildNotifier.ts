import { useEffect, useRef } from "react";
import { toast } from "@/lib/toast";
import { useAgentBuildStore } from "@/stores/agentBuildStore";

/**
 * Global hook that fires a toast when an agent build completes.
 * Mount once in RitaLayout so it works on any page.
 */
export function useAgentBuildNotifier() {
	const builds = useAgentBuildStore((state) => state.builds);
	const dismissBuild = useAgentBuildStore((state) => state.dismissBuild);
	const notified = useRef<Set<string>>(new Set());

	useEffect(() => {
		for (const [id, build] of Object.entries(builds)) {
			if (build.status === "complete" && !notified.current.has(id)) {
				notified.current.add(id);
				toast.success(`${build.name} is ready`, {
					description: "Your agent has been built successfully.",
				});
				dismissBuild(id);
			}
		}
	}, [builds, dismissBuild]);
}
