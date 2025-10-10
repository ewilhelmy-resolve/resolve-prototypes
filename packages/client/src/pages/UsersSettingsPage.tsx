/**
 * UsersSettingsPage - Users management under Settings > Admin
 *
 * This page uses RitaSettingsLayout and displays user management UI
 */

import SettingsUsers from "@/pages/settings/SettingsUsers";
import RitaSettingsLayout from "../components/layouts/RitaSettingsLayout";

const UsersSettingsPage: React.FC = () => {
	return (
		<RitaSettingsLayout>
			<SettingsUsers />
		</RitaSettingsLayout>
	);
};

export default UsersSettingsPage;
