import { Ban, Check, Loader, MoreHorizontal } from "lucide-react";
import { BulkActions } from "@/components/BulkActions";
import { CrashPage } from "@/components/CrashPage";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import EditUserSheet from "@/components/users/EditUserSheet";
import {
	useMembers,
	useRemoveMember,
	useUpdateMemberRole,
	useUpdateMemberStatus,
} from "@/hooks/api/useMembers";
import { useUsersTableState } from "@/hooks/useUsersTableState";
import { formatDate, renderSortIcon } from "@/lib/table-utils";
import type { OrganizationRole } from "@/types/member";

export default function UsersTable() {
	// Use custom hook for state management
	const {
		selectedUsers,
		setSelectedUsers,
		handleSelectAll,
		handleSelectUser,
		searchQuery,
		setSearchQuery,
		sortBy,
		sortOrder,
		handleSort,
		editingUser,
		deletingUser,
		setDeletingUser,
		deactivatingUser,
		setDeactivatingUser,
		handleEditUser,
		// handleDeactivateUser,
		handleDeleteUser,
		editSheetOpen,
		setEditSheetOpen,
		deleteDialogOpen,
		setDeleteDialogOpen,
		bulkDeleteDialogOpen,
		setBulkDeleteDialogOpen,
		roleChangeDialogOpen,
		setRoleChangeDialogOpen,
		deactivateDialogOpen,
		setDeactivateDialogOpen,
		pendingRoleChange,
		setPendingRoleChange,
	} = useUsersTableState();

	// Fetch members from API
	const { data, isLoading, error } = useMembers({
		limit: 50,
		offset: 0,
		sortBy,
		sortOrder,
	});

	// Mutations
	const { mutate: updateRole } = useUpdateMemberRole();
	const { mutate: updateStatus } = useUpdateMemberStatus();
	const { mutate: removeMember } = useRemoveMember();

	const allMembers = data?.members || [];

	// Client-side search filtering
	const members = allMembers.filter((member) => {
		if (!searchQuery.trim()) return true;

		const query = searchQuery.toLowerCase();
		const name =
			`${member.firstName || ""} ${member.lastName || ""}`.toLowerCase();
		const email = member.email.toLowerCase();

		return name.includes(query) || email.includes(query);
	});

	// Loading state
	if (isLoading) {
		return (
			<div className="flex justify-center items-center py-12">
				<Loader className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<CrashPage
				title="Failed to load members"
				description={error.message || "An error occurred while fetching members. Please try again."}
				actionLabel="Try Again"
				onAction={() => window.location.reload()}
			/>
		);
	}

	const handleSaveUser = (
		userId: string,
		updates: {
			role?: OrganizationRole;
		},
	) => {
		const member = members.find((m) => m.id === userId);
		if (!member) return;

		const hasRoleUpdate = updates.role !== undefined;

		// Check if role is being downgraded
		if (hasRoleUpdate && (member.role === "owner" || member.role === "admin")) {
			if (updates.role && updates.role !== member.role) {
				setPendingRoleChange({
					userId,
					newRole: updates.role,
					oldRole: member.role,
				});
				setRoleChangeDialogOpen(true);
				return;
			}
		}

		// Handle role update
		if (hasRoleUpdate && updates.role) {
			updateRole(
				{ userId, role: updates.role },
				{
					onSuccess: () => {
						setEditSheetOpen(false);
					},
				},
			);
		} else {
			// No updates
			setEditSheetOpen(false);
		}
	};

	const handleConfirmRoleChange = () => {
		if (!pendingRoleChange) return;

		updateRole(
			{ userId: pendingRoleChange.userId, role: pendingRoleChange.newRole },
			{
				onSuccess: () => {
					setPendingRoleChange(null);
					setRoleChangeDialogOpen(false);
					setEditSheetOpen(false);
				},
			},
		);
	};

	const handleConfirmDeactivate = () => {
		if (!deactivatingUser) return;

		updateStatus(
			{ userId: deactivatingUser.id, isActive: false },
			{
				onSuccess: () => {
					setDeactivateDialogOpen(false);
					setDeactivatingUser(null);
				},
			},
		);
	};

	// TODO: Enable activate action when we have a nicer way to prevent those users from logging in

	// const handleActivateUser = (member: Member) => {
	// 	updateStatus({ userId: member.id, isActive: true });
	// };

	const handleConfirmDelete = () => {
		if (!deletingUser) return;

		removeMember(
			{ userId: deletingUser.id },
			{
				onSuccess: () => {
					setDeleteDialogOpen(false);
					setDeletingUser(null);
				},
			},
		);
	};

	const handleBulkDeleteClick = () => {
		setBulkDeleteDialogOpen(true);
	};

	const handleConfirmBulkDelete = async () => {
		setBulkDeleteDialogOpen(false);

		// Delete selected users one by one
		let successCount = 0;
		let failCount = 0;

		for (const userId of selectedUsers) {
			try {
				await new Promise<void>((resolve, reject) => {
					removeMember(
						{ userId },
						{
							onSuccess: () => {
								successCount++;
								resolve();
							},
							onError: () => {
								failCount++;
								reject();
							},
						},
					);
				});
			} catch {
				// Error already handled by mutation
			}
		}

		// Clear selection after deletion attempts
		setSelectedUsers([]);

		// Show summary toast
		if (successCount > 0 && failCount === 0) {
			// All successful
			// Success feedback is handled by useRemoveMember hook
		} else if (failCount > 0) {
			// Some or all failed - already handled by useRemoveMember error handler
		}
	};

	return (
		<>
			<div className="flex flex-col gap-5">
				{selectedUsers.length === 0 ? (
					<div className="flex justify-between items-center py-4">
						<Input
							placeholder="Search by name or email..."
							className="max-w-sm"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
				) : (
					<BulkActions
						selectedItems={selectedUsers}
						onDelete={handleBulkDeleteClick}
						onClose={() => setSelectedUsers([])}
						itemLabel="users"
					/>
				)}

				<div className="border rounded-md">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-8">
									<Checkbox
										checked={selectedUsers.length === members.length}
										onCheckedChange={(checked) =>
											handleSelectAll(checked as boolean, members)
										}
									/>
								</TableHead>
								<TableHead>
									<Button
										variant="ghost"
										className="flex items-center gap-2"
										onClick={() => handleSort("email")}
									>
										Name
										{renderSortIcon(sortBy, "email", sortOrder)}
									</Button>
								</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>
									<Button
										variant="ghost"
										className="flex items-center gap-2"
										onClick={() => handleSort("role")}
									>
										Role
										{renderSortIcon(sortBy, "role", sortOrder)}
									</Button>
								</TableHead>
								<TableHead className="text-right">Conversations</TableHead>
								<TableHead className="text-right">
									<Button
										variant="ghost"
										className="flex items-center gap-2 ml-auto"
										onClick={() => handleSort("joinedAt")}
									>
										Joined
										{renderSortIcon(sortBy, "joinedAt", sortOrder)}
									</Button>
								</TableHead>
								<TableHead className="w-8"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{members.map((member) => (
								<TableRow key={member.id}>
									<TableCell>
										<Checkbox
											checked={selectedUsers.includes(member.id)}
											onCheckedChange={(checked) =>
												handleSelectUser(member.id, checked as boolean)
											}
										/>
									</TableCell>
									<TableCell>
										<div className="flex flex-col">
											<span className="text-sm text-foreground">
												{member.firstName && member.lastName
													? `${member.firstName} ${member.lastName}`
													: member.email}
											</span>
											<span className="text-sm text-muted-foreground">
												{member.email}
											</span>
										</div>
									</TableCell>
									<TableCell>
										<Badge
											variant="outline"
											className="flex items-center gap-1 w-fit"
										>
											{member.isActive ? (
												<Check className="h-3 w-3" />
											) : (
												<Ban className="h-3 w-3" />
											)}
											{member.isActive ? "Active" : "Inactive"}
										</Badge>
									</TableCell>
									<TableCell>
										<Badge variant="outline" className="capitalize">
											{member.role}
										</Badge>
									</TableCell>
									<TableCell className="text-right">
										{member.conversationsCount}
									</TableCell>
									<TableCell className="text-right">
										{formatDate(member.joinedAt)}
									</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="sm"
													className="h-8 w-8 p-0"
												>
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem
													onClick={() => handleEditUser(member)}
												>
													Edit
												</DropdownMenuItem>
												{/* 
												 TODO: Enable activate/deactivate actions when we have a nicer way to prevent those user from logging in
												{member.isActive ? (
													<DropdownMenuItem
														onClick={() => handleDeactivateUser(member)}
													>
														Deactivate
													</DropdownMenuItem>
												) : (
													<DropdownMenuItem
														onClick={() => handleActivateUser(member)}
													>
														Activate
													</DropdownMenuItem>
												)} */}
												<DropdownMenuItem
													onClick={() => handleDeleteUser(member)}
													className="text-destructive focus:text-destructive"
												>
													Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>

				<div className="flex justify-between items-center py-4">
					<p className="text-sm text-muted-foreground">
						{members.length} User{members.length !== 1 ? "s" : ""}
						{searchQuery && ` (filtered from ${allMembers.length})`}
					</p>
					{/* TODO: Add pagination when implementing */}
				</div>
			</div>

			{/* Edit User Sheet */}
			<EditUserSheet
				open={editSheetOpen}
				onOpenChange={setEditSheetOpen}
				user={editingUser}
				onSave={handleSaveUser}
			/>

			{/* Deactivate Dialog */}
			<ConfirmDialog
				open={deactivateDialogOpen}
				onOpenChange={setDeactivateDialogOpen}
				title="Deactivate User"
				description={`Are you sure you want to deactivate ${deactivatingUser?.email}? They will be blocked from accessing the system immediately.`}
				onConfirm={handleConfirmDeactivate}
				confirmLabel="Deactivate"
				cancelLabel="Cancel"
				variant="destructive"
			/>

			{/* Remove User Dialog */}
			<ConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				title="Remove User"
				description={`Are you sure you want to remove ${deletingUser?.email}? This will remove them from the organization. They can be re-invited later.`}
				onConfirm={handleConfirmDelete}
				confirmLabel="Remove"
				cancelLabel="Cancel"
				variant="destructive"
			/>

			{/* Role Change Confirmation Dialog */}
			<ConfirmDialog
				open={roleChangeDialogOpen}
				onOpenChange={setRoleChangeDialogOpen}
				title="Change User Role"
				description={`This will change ${editingUser?.email}'s role from ${pendingRoleChange?.oldRole} to ${pendingRoleChange?.newRole}. This may affect their permissions.`}
				onConfirm={handleConfirmRoleChange}
				confirmLabel="Confirm"
				cancelLabel="Cancel"
			/>

			{/* Bulk Delete Confirmation Dialog */}
			<ConfirmDialog
				open={bulkDeleteDialogOpen}
				onOpenChange={setBulkDeleteDialogOpen}
				title="Remove Users"
				description={`Are you sure you want to remove ${selectedUsers.length} user${selectedUsers.length !== 1 ? "s" : ""}? This will remove them from the organization. They can be re-invited later.`}
				onConfirm={handleConfirmBulkDelete}
				confirmLabel="Remove Users"
				cancelLabel="Cancel"
				variant="destructive"
			/>
		</>
	);
}
