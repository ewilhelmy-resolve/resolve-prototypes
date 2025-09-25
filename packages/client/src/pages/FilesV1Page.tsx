/**
 * FilesV1Page - Knowledge Articles Dashboard with UX Design Integration
 *
 * This integrates the UX team's design with Rita Go development standards,
 * API integration, and comprehensive file management capabilities.
 * Follows SOC2 compliance, WCAG 2.1 AA accessibility, and Component-Based Architecture.
 */

import React from 'react'
import RitaV1Layout from '../components/layouts/RitaV1Layout'
import KnowledgeArticlesDashboard from '../components/KnowledgeArticlesDashboard'

export default function FilesV1Page() {
  return (
    <RitaV1Layout activePage="files">
      <KnowledgeArticlesDashboard />
    </RitaV1Layout>
  )
}