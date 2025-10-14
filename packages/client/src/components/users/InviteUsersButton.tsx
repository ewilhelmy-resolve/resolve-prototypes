import { Share2 } from "lucide-react";
import { type ComponentProps, useState } from "react";
import InviteUsersDialog from "@/components/dialogs/InviteUsersDialog";
import { Button } from "@/components/ui/button";

interface InviteUsersButtonProps extends Omit<ComponentProps<typeof Button>, "onClick"> {
	/** Button text (defaults to "Share") */
	children?: React.ReactNode;
}

/**
 * Reusable button that opens the InviteUsersDialog
 * Manages dialog state internally
 */
export default function InviteUsersButton({
	children = "Share",
	...buttonProps
}: InviteUsersButtonProps) {
	const [dialogOpen, setDialogOpen] = useState(false);

	return (
		<>
			<Button onClick={() => setDialogOpen(true)} {...buttonProps}>
				<Share2 className="h-4 w-4" />
				{children}
			</Button>

			<InviteUsersDialog open={dialogOpen} onOpenChange={setDialogOpen} />
		</>
	);
}
