import { useProfilePermissions } from "@/hooks/api/useProfile";
import { useTranslation } from "react-i18next";
import InviteUsersButton from "./InviteUsersButton";

/**
 * Card component for inviting users
 * Only visible to users with invitation management permissions (admin/owner)
 */
const InviteUserCard = () => {
	const { t } = useTranslation();
	const { canManageInvitations } = useProfilePermissions();

	// Hide card for regular users
	if (!canManageInvitations()) {
		return null;
	}

	return (
		<div className="mt-auto pt-6">
			<div className="space-y-3 p-4 border border-border rounded-lg bg-blue-50/30">
				<h3 className="text-base font-semibold text-foreground">
					{t("inviteCard.title")}
				</h3>
				<p className="text-sm text-muted-foreground">
					{t("inviteCard.description")}
				</p>
				<InviteUsersButton className="w-full gap-2 h-9" />
			</div>
		</div>
	);
};

export default InviteUserCard;
