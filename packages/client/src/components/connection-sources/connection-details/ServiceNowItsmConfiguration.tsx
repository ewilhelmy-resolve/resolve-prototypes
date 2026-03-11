import ItsmConfigurationBase from "./ItsmConfigurationBase";

interface ServiceNowItsmConfigurationProps {
	onEdit?: () => void;
}

export default function ServiceNowItsmConfiguration({
	onEdit,
}: ServiceNowItsmConfigurationProps = {}) {
	return (
		<ItsmConfigurationBase
			titleKey="config.titles.servicenowItsm"
			syncStartedDescKey="config.toast.syncStartedServiceNowItsm"
			onEdit={onEdit}
		/>
	);
}
