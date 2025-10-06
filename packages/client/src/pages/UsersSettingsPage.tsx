/**
 * UsersSettingsPage - Users management under Settings > Admin
 *
 * This page uses RitaSettingsLayout and displays user management UI
 */

import RitaSettingsLayout from '../components/layouts/RitaSettingsLayout'
import SettingsUsers from '../components/SettingsUsers'

const UsersSettingsPage: React.FC = () => {
  return (
    <RitaSettingsLayout>
      <SettingsUsers />
    </RitaSettingsLayout>
  )
}

export default UsersSettingsPage
