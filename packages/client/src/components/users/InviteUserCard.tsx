import { useProfilePermissions } from "@/hooks/api/useProfile";
import InviteUsersButton from "./InviteUsersButton";

/**
 * Card component for inviting users
 * Only visible to users with invitation management permissions (admin/owner)
 */
const InviteUserCard = () => {
	const { canManageInvitations } = useProfilePermissions();

	// Hide card for regular users
	if (!canManageInvitations()) {
		return null;
	}

	return (
		<div className="mt-auto pt-6">
			<div className="space-y-3 p-4 border border-border rounded-lg bg-blue-50/30">
				<h3 className="text-base font-semibold text-foreground">
					Invite Users
				</h3>
				<p className="text-sm text-muted-foreground">
					Invite teammates to use RITA and resolve support faster.
				</p>
				<InviteUsersButton className="w-full gap-2 h-9" />
			</div>
		</div>
	);
};

export default InviteUserCard;
