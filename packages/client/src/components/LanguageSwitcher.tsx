/**
 * LanguageSwitcher - Language selection dropdown
 *
 * Allows users to switch between supported languages.
 * Persists selection to localStorage.
 */

import { Globe } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n"

const STORAGE_KEY = "rita_language"

export function LanguageSwitcher() {
	const { i18n } = useTranslation()

	const currentLanguage =
		SUPPORTED_LANGUAGES.find((lang) => lang.code === i18n.language) ||
		SUPPORTED_LANGUAGES[0]

	const handleLanguageChange = (code: SupportedLanguage) => {
		i18n.changeLanguage(code)
		localStorage.setItem(STORAGE_KEY, code)
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="gap-2 h-9 px-3 text-sm">
					<Globe className="w-4 h-4" />
					<span className="hidden sm:inline">{currentLanguage.label}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{SUPPORTED_LANGUAGES.map((lang) => (
					<DropdownMenuItem
						key={lang.code}
						onClick={() => handleLanguageChange(lang.code)}
						className={i18n.language === lang.code ? "bg-accent" : ""}
					>
						{lang.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
