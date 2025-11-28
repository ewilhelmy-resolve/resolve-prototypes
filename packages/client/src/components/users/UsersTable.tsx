import { Ban, Check, ChevronDown, Loader, MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
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
	useDeleteMemberPermanent,
	useUpdateMemberRole,
	useUpdateMemberStatus,
} from "@/hooks/api/useMembers";
import { useProfile } from "@/hooks/api/useProfile";
import { useUsersTableState } from "@/hooks/useUsersTableState";
import { formatDate, renderSortIcon } from "@/lib/table-utils";
import type { OrganizationRole } from "@/types/member";

const PAGE_SIZE = 50;

export default function UsersTable() {
	// Use custom hook for state management
	const {
		selectedUsers,
		setSelectedUsers,
		handleSelectAll,
		handleSelectUser,
		searchInput,
		setSearchInput,
		searchQuery,
		setSearchQuery,
		statusFilter,
		setStatusFilter,
		sortBy,
		sortOrder,
		handleSort,
		page,
		setPage,
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

	// Loading state for bulk delete
	const [isBulkDeleting, setIsBulkDeleting] = useState(false);
	const [deletingRemaining, setDeletingRemaining] = useState<number | null>(null);

	// Get current user profile to hide delete option for self
	const { data: profile } = useProfile();
	const currentUserId = profile?.user.id;

	// Debounce search input - wait 500ms after user stops typing
	useEffect(() => {
		const timer = setTimeout(() => {
			setSearchQuery(searchInput);
		}, 500);

		return () => clearTimeout(timer);
	}, [searchInput, setSearchQuery]);

	// Fetch members from API with server-side filtering, sorting, pagination
	const { data, isLoading, error } = useMembers({
		limit: PAGE_SIZE,
		offset: page * PAGE_SIZE,
		sortBy,
		sortOrder,
		search: searchQuery || undefined,
		status: statusFilter !== "All" ? statusFilter : undefined,
	});

	// Mutations
	const { mutate: updateRole } = useUpdateMemberRole();
	const { mutate: updateStatus } = useUpdateMemberStatus();
	const { mutate: deleteMemberPermanent } = useDeleteMemberPermanent();

	const members = data?.members || [];
	const totalMembers = data?.total || 0;

	// Pagination calculations
	const hasNextPage = (page + 1) * PAGE_SIZE < totalMembers;
	const hasPrevPage = page > 0;

	const handleNextPage = () => {
		if (hasNextPage) {
			setPage(page + 1);
		}
	};

	const handlePrevPage = () => {
		if (hasPrevPage) {
			setPage(page - 1);
		}
	};

	// Check if a user is the last active owner in the organization
	// Note: This uses the current page's members, but the backend validates this properly
	const isLastActiveOwner = (userId: string): boolean => {
		const activeOwners = members.filter(
			(m) => m.role === "owner" && m.isActive
		);
		return activeOwners.length === 1 && activeOwners[0].id === userId;
	};

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

		deleteMemberPermanent(
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
		// Close dialog first, then start deletion
		setBulkDeleteDialogOpen(false);
		setIsBulkDeleting(true);

		// Delete selected users one by one
		let successCount = 0;
		let failCount = 0;
		const usersToDelete = [...selectedUsers];
		let remaining = usersToDelete.length;
		setDeletingRemaining(remaining);

		for (const userId of usersToDelete) {
			try {
				await new Promise<void>((resolve, reject) => {
					deleteMemberPermanent(
						{ userId },
						{
							onSuccess: () => {
								successCount++;
								remaining--;
								setDeletingRemaining(remaining);
								resolve();
							},
							onError: () => {
								failCount++;
								remaining--;
								setDeletingRemaining(remaining);
								reject();
							},
						},
					);
				});
			} catch {
				// Error already handled by mutation
			}
		}

		// Clear loading state
		setIsBulkDeleting(false);
		setDeletingRemaining(null);

		// Clear selection after deletion attempts
		setSelectedUsers([]);

		// Show summary toast
		if (successCount > 0 && failCount === 0) {
			// All successful
			// Success feedback is handled by useDeleteMemberPermanent hook
		} else if (failCount > 0) {
			// Some or all failed - already handled by useDeleteMemberPermanent error handler
		}
	};

	return (
		<>
			<div className="flex flex-col gap-5">
				{selectedUsers.length === 0 ? (
					<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 py-4">
						<Input
							placeholder="Search by name or email..."
							className="max-w-sm"
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
						/>
						<div className="flex gap-4">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline">
										Status: {statusFilter === "All" ? "All" : statusFilter === "active" ? "Active" : "Inactive"}
										<ChevronDown className="h-4 w-4 ml-2" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<DropdownMenuItem onSelect={() => setStatusFilter("All")}>
										All
									</DropdownMenuItem>
									<DropdownMenuItem onSelect={() => setStatusFilter("active")}>
										Active
									</DropdownMenuItem>
									<DropdownMenuItem onSelect={() => setStatusFilter("inactive")}>
										Inactive
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				) : (
					<BulkActions
						selectedItems={selectedUsers}
						onDelete={handleBulkDeleteClick}
						onClose={() => setSelectedUsers([])}
						itemLabel="users"
						isLoading={isBulkDeleting}
						remainingCount={deletingRemaining}
					/>
				)}

				{/* Table */}
				<div className="relative border rounded-md">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-8">
									<Checkbox
										checked={selectedUsers.length === members.length && members.length > 0}
										onCheckedChange={(checked) =>
											handleSelectAll(checked as boolean, members)
										}
									/>
								</TableHead>
								<TableHead>
									<Button
										variant="ghost"
										className="flex items-center gap-2 -ml-3"
										onClick={() => handleSort("name")}
									>
										Name
										{renderSortIcon(sortBy, "name", sortOrder)}
									</Button>
								</TableHead>
								<TableHead>
									<Button
										variant="ghost"
										className="flex items-center gap-2 -ml-3"
										onClick={() => handleSort("status")}
									>
										Status
										{renderSortIcon(sortBy, "status", sortOrder)}
									</Button>
								</TableHead>
								<TableHead>
									<Button
										variant="ghost"
										className="flex items-center gap-2 -ml-3"
										onClick={() => handleSort("role")}
									>
										Role
										{renderSortIcon(sortBy, "role", sortOrder)}
									</Button>
								</TableHead>
								<TableHead className="text-right">
									<Button
										variant="ghost"
										className="flex items-center gap-2 ml-auto -mr-3"
										onClick={() => handleSort("conversationsCount")}
									>
										Conversations
										{renderSortIcon(sortBy, "conversationsCount", sortOrder)}
									</Button>
								</TableHead>
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
												{/* Hide delete option for current user - they should use Profile page to delete own account */}
												{member.id !== currentUserId && (
													<DropdownMenuItem
														onClick={() => handleDeleteUser(member)}
														variant="destructive"
													>
														Delete
													</DropdownMenuItem>
												)}
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>

				{/* Footer with Pagination */}
				{!isLoading && members.length > 0 && (
					<div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4">
						<p className="text-sm text-muted-foreground">
							{searchInput || statusFilter !== "All" ? (
								<>Showing {members.length} of {totalMembers} users (filtered)</>
							) : (
								<>Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalMembers)} of {totalMembers} users</>
							)}
						</p>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={handlePrevPage}
								disabled={!hasPrevPage}
							>
								Previous
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={handleNextPage}
								disabled={!hasNextPage}
							>
								Next
							</Button>
						</div>
					</div>
				)}
			</div>

			{/* Edit User Sheet */}
			<EditUserSheet
				open={editSheetOpen}
				onOpenChange={setEditSheetOpen}
				user={editingUser}
				onSave={handleSaveUser}
				isLastActiveOwner={editingUser ? isLastActiveOwner(editingUser.id) : false}
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

			{/* Permanently Delete User Dialog */}
			<ConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				title="Permanently Delete User"
				description={`Are you sure you want to PERMANENTLY delete ${deletingUser?.email}? This will delete their account from Keycloak, remove all their data (messages, conversations, files), and cannot be undone.${deletingUser?.role === "owner" ? " ⚠️ WARNING: If they are the only member, this will delete the entire organization and all data." : ""}`}
				onConfirm={handleConfirmDelete}
				confirmLabel="Delete Permanently"
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
				title="Permanently Delete Users"
				description={`Are you sure you want to PERMANENTLY delete ${selectedUsers.length} user${selectedUsers.length !== 1 ? "s" : ""}? This will delete their accounts from Keycloak, remove all their data (messages, conversations, files), and cannot be undone. If any are the only owner, their entire organization will be deleted.`}
				onConfirm={handleConfirmBulkDelete}
				confirmLabel="Delete Users Permanently"
				cancelLabel="Cancel"
				variant="destructive"
			/>
		</>
	);
}
