import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InviteUsersButton from "@/components/users/InviteUsersButton";
import PendingInvitationsTable from "@/components/users/PendingInvitationsTable";
import UsersTable from "@/components/users/UsersTable";
import { useInvitations } from "@/hooks/api/useInvitations";
import { useProfilePermissions } from "@/hooks/api/useProfile";
import SettingsHeader from "@/pages/settings/SettingsHeader";
import { InvitationStatus } from "@/types/invitations";

export default function SettingsUsers() {
	const [activeTab, setActiveTab] = useState("users");
	const { isOwnerOrAdmin } = useProfilePermissions();
	const navigate = useNavigate();

	// Page-level permission check
	useEffect(() => {
		if (!isOwnerOrAdmin()) {
			navigate("/404", { replace: true });
		}
	}, [isOwnerOrAdmin, navigate]);

	// Fetch pending invitations for badge count
	const { data: pendingData } = useInvitations({
		status: InvitationStatus.PENDING,
	});
	const pendingCount = pendingData?.total || 0;

	return (
		<div className="flex-1 inline-flex flex-col items-center gap-8 w-full">
			<div className="self-stretch flex flex-col items-start gap-8">
				<SettingsHeader
					title="Users"
					description="Manage users and invitations to your organization."
					action={<InviteUsersButton />}
				/>
			</div>

			<div className="pb-8 w-full flex flex-col gap-6">
				{/* 
				TODO : Hide for now, will implement later

				 <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
					<Card className="p-4 bg-popover border border-border">
						<div className="flex flex-col gap-0">
							<div className="flex items-center gap-3">
								<h3 className="text-2xl font-normal text-foreground">4</h3>
								<Badge variant="outline" className="flex items-center gap-1">
									<TrendingUp className="h-3 w-3" />
									+4.5%
								</Badge>
							</div>
							<p className="text-sm text-muted-foreground">Total Users</p>
						</div>
					</Card>

					<Card className="p-4 bg-popover border border-border">
						<div className="flex flex-col gap-0">
							<div className="flex items-center gap-3">
								<h3 className="text-2xl font-normal text-foreground">9</h3>
								<Badge variant="outline" className="flex items-center gap-1">
									<TrendingUp className="h-3 w-3" />
									+4.5%
								</Badge>
							</div>
							<p className="text-sm text-muted-foreground">
								Avg . Active Users
							</p>
						</div>
					</Card>

					<Card className="p-4 bg-popover border border-border">
						<div className="flex flex-col gap-0">
							<div className="flex items-center gap-3">
								<h3 className="text-2xl font-normal text-foreground">
									{pendingCount}
								</h3>
								<Badge variant="outline" className="flex items-center gap-1">
									<TrendingUp className="h-3 w-3" />
									+5%
								</Badge>
							</div>
							<p className="text-sm text-muted-foreground">
								Pending Invitations
							</p>
						</div>
					</Card>
				</div> */}

				<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full pr-[2em]">
					<TabsList>
						<TabsTrigger value="users">Users</TabsTrigger>
						<TabsTrigger value="pending">
							Invite Pending
							{pendingCount > 0 && ` (${pendingCount})`}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="users" className="mt-6">
						<UsersTable />
					</TabsContent>

					<TabsContent value="pending" className="mt-6">
						<PendingInvitationsTable />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
