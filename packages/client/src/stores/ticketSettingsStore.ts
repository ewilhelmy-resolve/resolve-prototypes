import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface TicketSettingsState {
	costPerTicket: number;
	avgTimePerTicket: number;

	setCostPerTicket: (cost: number) => void;
	setAvgTimePerTicket: (time: number) => void;
	setSettings: (settings: {
		costPerTicket: number;
		avgTimePerTicket: number;
	}) => void;
}

export const useTicketSettingsStore = create<TicketSettingsState>()(
	devtools(
		persist(
			(set) => ({
				costPerTicket: 30,
				avgTimePerTicket: 12,

				setCostPerTicket: (cost) => set({ costPerTicket: cost }),
				setAvgTimePerTicket: (time) => set({ avgTimePerTicket: time }),
				setSettings: (settings) =>
					set({
						costPerTicket: settings.costPerTicket,
						avgTimePerTicket: settings.avgTimePerTicket,
					}),
			}),
			{
				name: "ticket-settings-store",
			},
		),
		{ name: "ticket-settings-store" },
	),
);
