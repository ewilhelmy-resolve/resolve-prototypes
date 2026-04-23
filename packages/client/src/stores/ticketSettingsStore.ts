import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface TicketSettingsState {
	blendedRatePerHour: number;
	avgMinutesPerTicket: number;

	setBlendedRatePerHour: (rate: number) => void;
	setAvgMinutesPerTicket: (time: number) => void;
	setSettings: (settings: {
		blendedRatePerHour: number;
		avgMinutesPerTicket: number;
	}) => void;
}

export const useTicketSettingsStore = create<TicketSettingsState>()(
	devtools(
		persist(
			(set) => ({
				blendedRatePerHour: 30,
				avgMinutesPerTicket: 12,

				setBlendedRatePerHour: (rate) => set({ blendedRatePerHour: rate }),
				setAvgMinutesPerTicket: (time) => set({ avgMinutesPerTicket: time }),
				setSettings: (settings) =>
					set({
						blendedRatePerHour: settings.blendedRatePerHour,
						avgMinutesPerTicket: settings.avgMinutesPerTicket,
					}),
			}),
			{
				name: "ticket-settings-store",
			},
		),
		{ name: "ticket-settings-store" },
	),
);
