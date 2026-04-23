import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface PresenterState {
	active: boolean;
	step: number;
	/** A ticket to open the dry-run sheet on, set by a scripted step. Consumed by ClusterDetailPage. */
	scriptedOpenTicket: {
		ticketId: string;
		externalId?: string;
		title: string;
		/** Auto-skip the animation and go straight to rating. */
		skipAnimation?: boolean;
		/** Auto-click a rating after the sheet opens. */
		autoRate?: "good" | "bad";
	} | null;
	enter: () => void;
	exit: () => void;
	setStep: (n: number) => void;
	setScriptedOpenTicket: (t: PresenterState["scriptedOpenTicket"]) => void;
	clearScriptedOpenTicket: () => void;
}

export const usePresenterStore = create<PresenterState>()(
	devtools(
		(set) => ({
			active: false,
			step: 0,
			scriptedOpenTicket: null,
			enter: () => set({ active: true, step: 0 }),
			exit: () =>
				set({ active: false, step: 0, scriptedOpenTicket: null }),
			setStep: (n) => set({ step: n }),
			setScriptedOpenTicket: (t) => set({ scriptedOpenTicket: t }),
			clearScriptedOpenTicket: () => set({ scriptedOpenTicket: null }),
		}),
		{ name: "rita-presenter-store" },
	),
);
