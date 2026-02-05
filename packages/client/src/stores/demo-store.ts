import { create } from "zustand";

interface DemoState {
	// Tracks tickets handled automatically (for demo)
	ticketsAutomated: number;
	// Automation rate percentage
	automationRate: number;
	// Hours saved by AI
	hoursSaved: number;
	// Enable automation for a cluster (simulates turning on auto-respond)
	enableAutomation: (clusterTicketCount: number) => void;
	// Reset demo state
	resetDemo: () => void;
}

/**
 * Demo store for tracking automation metrics across pages
 * Used to show before/after state in demos
 */
export const useDemoStore = create<DemoState>((set) => ({
	ticketsAutomated: 0,
	automationRate: 0,
	hoursSaved: 0,

	enableAutomation: (clusterTicketCount: number) => {
		set((state) => {
			const newAutomated = state.ticketsAutomated + clusterTicketCount;
			// Assume total tickets is ~2500 based on demo data
			const totalTickets = 2517;
			const newRate = Math.round((newAutomated / totalTickets) * 100);
			// Assume 2 min saved per automated ticket
			const newHours = Math.round((newAutomated * 2) / 60);
			console.log("[Demo Store] Updating:", { newAutomated, newRate, newHours });
			return {
				ticketsAutomated: newAutomated,
				automationRate: newRate,
				hoursSaved: newHours,
			};
		});
	},

	resetDemo: () => {
		set({
			ticketsAutomated: 0,
			automationRate: 0,
			hoursSaved: 0,
		});
	},
}));
