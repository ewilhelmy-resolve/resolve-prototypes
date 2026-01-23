import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Import all namespaces - English
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

// Import namespaces - Spanish (Mexico) - partial, rest fallback to en
import chatEsMX from "./locales/es-MX/chat.json";
import commonEsMX from "./locales/es-MX/common.json";

export const defaultNS = "common";

// Supported languages
export const SUPPORTED_LANGUAGES = [
	{ code: "en", label: "English (USA)" },
	{ code: "es-MX", label: "Español (Mexico)" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

// Get saved language from localStorage or default to "en"
const getSavedLanguage = (): string => {
	if (typeof window !== "undefined") {
		return localStorage.getItem("rita_language") || "en";
	}
	return "en";
};

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
	"es-MX": {
		chat: chatEsMX,
		common: commonEsMX,
	},
} as const;

i18n.use(initReactI18next).init({
	resources,
	lng: getSavedLanguage(),
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
