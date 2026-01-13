import { useTranslation } from "react-i18next";
import { MAX_FILE_SIZE_MB, SUPPORTED_DOCUMENT_EXTENSIONS } from "@/lib/constants";

/**
 * FileUploadRequirements
 *
 * Displays file upload requirements for Knowledge Articles.
 * Shows supported file types and maximum file size.
 *
 * @component
 * @example
 * ```tsx
 * <FileUploadRequirements />
 * ```
 *
 * @example
 * // With custom max size
 * ```tsx
 * <FileUploadRequirements maxSizeMB={50} />
 * ```
 */

interface FileUploadRequirementsProps {
	/** Additional CSS classes */
	className?: string;
}

export function FileUploadRequirements({
	className = "",
}: FileUploadRequirementsProps) {
	const { t } = useTranslation("kbs");
	// Format file extensions from constants
	const fileTypesDisplay = SUPPORTED_DOCUMENT_EXTENSIONS.join(", ");

	return (
		<div
			className={`text-xs text-muted-foreground text-center max-w-xs space-y-2 ${className}`}
		>
			<p>{t("requirements.fileTypes", { types: fileTypesDisplay })}</p>
			<p>{t("requirements.maxSize", { size: MAX_FILE_SIZE_MB })}</p>
		</div>
	);
}
