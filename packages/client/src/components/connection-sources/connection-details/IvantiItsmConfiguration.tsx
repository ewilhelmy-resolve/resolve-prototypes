import ItsmConfigurationBase from "./ItsmConfigurationBase";

interface IvantiItsmConfigurationProps {
	onEdit?: () => void;
}

export default function IvantiItsmConfiguration({
	onEdit,
}: IvantiItsmConfigurationProps = {}) {
	return (
		<ItsmConfigurationBase
			titleKey="config.titles.ivantiItsm"
			syncStartedDescKey="config.toast.syncStartedIvantiItsm"
			onEdit={onEdit}
		/>
	);
}
