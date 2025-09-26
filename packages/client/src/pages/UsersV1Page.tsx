/**
 * UsersV1Page - Users Management Dashboard with UX Design Integration
 *
 * This integrates the UX team's design with Rita Go development standards,
 * user management capabilities, and comprehensive user administration.
 * Follows SOC2 compliance, WCAG 2.1 AA accessibility, and Component-Based Architecture.
 */

import RitaV1Layout from '../components/layouts/RitaV1Layout'
import UsersPage from '../components/UsersPage'

export default function UsersV1Page() {
  return (
    <RitaV1Layout activePage="users">
      <UsersPage />
    </RitaV1Layout>
  )
}