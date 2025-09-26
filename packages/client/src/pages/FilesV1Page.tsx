/**
 * FilesV1Page - Knowledge Articles Management with Full Functionality
 *
 * This integrates the complete file management functionality from the original FilesPage
 * with the Rita V1 layout system. Includes upload, search, filtering, download, and
 * all file management capabilities with proper API integration.
 * Follows SOC2 compliance, WCAG 2.1 AA accessibility, and Component-Based Architecture.
 */

import RitaV1Layout from '../components/layouts/RitaV1Layout'
import FilesV1Content from '../components/FilesV1Content'

export default function FilesV1Page() {
  return (
    <RitaV1Layout activePage="files">
      <FilesV1Content />
    </RitaV1Layout>
  )
}