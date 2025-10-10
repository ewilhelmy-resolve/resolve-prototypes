/**
 * SettingsV1Page - Settings page with unique layout
 *
 * This page uses its own dedicated RitaSettingsLayout component
 * and doesn't share the common RitaV1Layout used by other pages.
 */

import RitaSettingsLayout from '../components/layouts/RitaSettingsLayout'
import ConnectionSources from './settings/ConnectionSources'

const SettingsV1Page: React.FC = () => {
  return (
    <RitaSettingsLayout>
      <ConnectionSources />
    </RitaSettingsLayout>
  )
}

export default SettingsV1Page