import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface BuildingAgent {
	id: string;
	name: string;
	status: "building" | "complete";
}

interface AgentBuildState {
	builds: Record<string, BuildingAgent>;
	startBuild: (agent: { id: string; name: string }) => void;
	completeBuild: (id: string) => void;
	dismissBuild: (id: string) => void;
}

const BUILD_DURATION_MS = 10_000;

// Track timers outside the store so they don't get serialized
const buildTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useAgentBuildStore = create<AgentBuildState>()(
	devtools(
		persist(
			(set) => ({
				builds: {},

				startBuild: (agent) => {
					set((state) => ({
						builds: {
							...state.builds,
							[agent.id]: {
								id: agent.id,
								name: agent.name,
								status: "building",
							},
						},
					}));

					// Clear any existing timer for this id
					const existingTimer = buildTimers.get(agent.id);
					if (existingTimer) {
						clearTimeout(existingTimer);
					}

					const timer = setTimeout(() => {
						set((state) => {
							const build = state.builds[agent.id];
							if (!build || build.status !== "building") return state;
							return {
								builds: {
									...state.builds,
									[agent.id]: { ...build, status: "complete" },
								},
							};
						});
						buildTimers.delete(agent.id);
					}, BUILD_DURATION_MS);

					buildTimers.set(agent.id, timer);
				},

				completeBuild: (id) => {
					const timer = buildTimers.get(id);
					if (timer) {
						clearTimeout(timer);
						buildTimers.delete(id);
					}
					set((state) => {
						const build = state.builds[id];
						if (!build) return state;
						return {
							builds: {
								...state.builds,
								[id]: { ...build, status: "complete" },
							},
						};
					});
				},

				dismissBuild: (id) => {
					set((state) => {
						const { [id]: _, ...rest } = state.builds;
						return { builds: rest };
					});
				},
			}),
			{
				name: "rita-agent-build-store",
			},
		),
		{ name: "rita-agent-build-store" },
	),
);

// Restart timers for any "building" entries after rehydration
useAgentBuildStore.persist.onFinishHydration((state) => {
	for (const [id, build] of Object.entries(state.builds)) {
		if (build.status === "building" && !buildTimers.has(id)) {
			const timer = setTimeout(() => {
				useAgentBuildStore.getState().completeBuild(id);
				buildTimers.delete(id);
			}, 5_000);
			buildTimers.set(id, timer);
		}
	}
});
