import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface TicketSettingsState {
	blendedRatePerHour: number;
	timeToTake: number;

	setBlendedRatePerHour: (rate: number) => void;
	setTimeToTake: (time: number) => void;
	setSettings: (settings: {
		blendedRatePerHour: number;
		timeToTake: number;
	}) => void;
}

export const useTicketSettingsStore = create<TicketSettingsState>()(
	devtools(
		persist(
			(set) => ({
				blendedRatePerHour: 30,
				timeToTake: 12,

				setBlendedRatePerHour: (rate) => set({ blendedRatePerHour: rate }),
				setTimeToTake: (time) => set({ timeToTake: time }),
				setSettings: (settings) =>
					set({
						blendedRatePerHour: settings.blendedRatePerHour,
						timeToTake: settings.timeToTake,
					}),
			}),
			{
				name: "ticket-settings-store",
			},
		),
		{ name: "ticket-settings-store" },
	),
);
