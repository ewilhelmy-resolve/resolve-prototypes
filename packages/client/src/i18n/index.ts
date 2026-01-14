import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Import all namespaces
import authEn from "./locales/en/auth.json";
import chatEn from "./locales/en/chat.json";
import commonEn from "./locales/en/common.json";
import connectionsEn from "./locales/en/connections.json";
import credentialDelegationEn from "./locales/en/credentialDelegation.json";
import dialogsEn from "./locales/en/dialogs.json";
import errorsEn from "./locales/en/errors.json";
import kbsEn from "./locales/en/kbs.json";
import settingsEn from "./locales/en/settings.json";
import ticketsEn from "./locales/en/tickets.json";
import toastEn from "./locales/en/toast.json";
import validationEn from "./locales/en/validation.json";

export const defaultNS = "common";

export const resources = {
	en: {
		auth: authEn,
		chat: chatEn,
		common: commonEn,
		connections: connectionsEn,
		credentialDelegation: credentialDelegationEn,
		dialogs: dialogsEn,
		errors: errorsEn,
		kbs: kbsEn,
		settings: settingsEn,
		tickets: ticketsEn,
		toast: toastEn,
		validation: validationEn,
	},
} as const;

i18n.use(initReactI18next).init({
	resources,
	lng: "en",
	fallbackLng: "en",
	defaultNS,
	ns: Object.keys(resources.en),
	interpolation: {
		escapeValue: false, // React already escapes
	},
	// Debug in dev only
	debug: import.meta.env.DEV,
	// Return key if missing (dev visibility)
	returnNull: false,
});

export default i18n;
