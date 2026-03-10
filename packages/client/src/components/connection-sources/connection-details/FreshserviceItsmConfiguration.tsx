import ItsmConfigurationBase from "./ItsmConfigurationBase";

interface FreshserviceItsmConfigurationProps {
	onEdit?: () => void;
}

export default function FreshserviceItsmConfiguration({
	onEdit,
}: FreshserviceItsmConfigurationProps) {
	return (
		<ItsmConfigurationBase
			titleKey="config.titles.freshserviceItsm"
			syncStartedDescKey="config.toast.syncStartedFreshservice"
			onEdit={onEdit}
		/>
	);
}
