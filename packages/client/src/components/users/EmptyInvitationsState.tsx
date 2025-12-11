import { MailOpen } from "lucide-react";
import InviteUsersButton from "@/components/users/InviteUsersButton";

export default function EmptyInvitationsState() {
	return (
		<div className="bg-background flex flex-col items-center w-full">
			<div className="p-6 border border-border rounded-lg flex flex-col items-center gap-6 w-full">
 				
				<MailOpen className="w-12 h-12 text-foreground" />

				<div className="flex flex-col items-center gap-2">
					<h2 className="text-xl font-normal text-foreground text-center leading-7">
						No pending invitations
					</h2>
					<p className="text-sm text-muted-foreground text-center">
						When you invite users, they will appear here
					</p>
				</div>

				<div className="flex justify-center items-center gap-3">
					<InviteUsersButton variant={"secondary"} className="shadow-sm" />
				</div>
			</div>
		</div>
	);
}
