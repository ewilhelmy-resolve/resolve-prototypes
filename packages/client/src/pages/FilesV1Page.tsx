/**
 * FilesV1Page - Knowledge Articles Management with Full Functionality
 *
 * This integrates the complete file management functionality from the original FilesPage
 * with the RITA V1 layout system. Includes upload, search, filtering, download, and
 * all file management capabilities with proper API integration.
 * Follows SOC2 compliance, WCAG 2.1 AA accessibility, and Component-Based Architecture.
 */

import FilesV1Content from "../components/FilesV1Content";
import RitaLayout from "../components/layouts/RitaLayout";

export default function FilesV1Page() {
	return (
		<RitaLayout activePage="files">
			<FilesV1Content />
		</RitaLayout>
	);
}
