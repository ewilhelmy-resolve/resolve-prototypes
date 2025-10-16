import { Plus } from "lucide-react";
import { type ComponentProps, useState } from "react";
import InviteUsersDialog from "@/components/dialogs/InviteUsersDialog";
import { Button } from "@/components/ui/button";
import { useProfilePermissions } from "@/hooks/api/useProfile";

interface InviteUsersButtonProps extends Omit<ComponentProps<typeof Button>, "onClick"> {
	/** Button text (defaults to "Invite users") */
	children?: React.ReactNode;
	/** Optional icon to override the default Plus icon */
	icon?: React.ReactNode;
}

/**
 * Reusable button that opens the InviteUsersDialog
 * Manages dialog state internally
 * Only visible to users with invitation management permissions (admin/owner)
 */
export default function InviteUsersButton({
	children = "Invite users",
	icon,
	...buttonProps
}: InviteUsersButtonProps) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const { canManageInvitations } = useProfilePermissions();

	// Hide button for regular users
	if (!canManageInvitations()) {
		return null;
	}

	return (
		<>
			<Button onClick={() => setDialogOpen(true)} {...buttonProps}>
				{icon !== undefined ? icon : <Plus className="h-4 w-4" />}
				{children}
			</Button>

			<InviteUsersDialog open={dialogOpen} onOpenChange={setDialogOpen} />
		</>
	);
}
