import {
	ArrowUpDown,
	Check,
	Loader,
	MoreHorizontal,
} from "lucide-react";
import { useState } from "react";
import { BulkActions } from "@/components/BulkActions";
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

interface User {
	id: string;
	name: string;
	email: string;
	status: string;
	role: string;
	queries: string;
	lastModified: string;
}

export default function UsersTable() {
	const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [deletingUser, setDeletingUser] = useState<User | null>(null);
	const [editSheetOpen, setEditSheetOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [roleChangeDialogOpen, setRoleChangeDialogOpen] = useState(false);
	const [pendingRoleChange, setPendingRoleChange] = useState<{
		userId: string;
		newRole: string;
		oldRole: string;
	} | null>(null);

	// Mock data - only active users (no "Invite pending" status)
	const users = [
		{
			id: "2",
			name: "Taylor Brown",
			email: "Taylor@acme.com",
			status: "Active",
			role: "Admin",
			queries: "4",
			lastModified: "03 Sep, 2025 18:07",
		},
		{
			id: "4",
			name: "Riley Green",
			email: "Riley@acme.com",
			status: "Active",
			role: "User",
			queries: "43",
			lastModified: "03 Sep, 2025 18:07",
		},
	];

	const handleSelectAll = (checked: boolean) => {
		if (checked) {
			setSelectedUsers(users.map((user) => user.id));
		} else {
			setSelectedUsers([]);
		}
	};

	const handleSelectUser = (userId: string, checked: boolean) => {
		if (checked) {
			setSelectedUsers([...selectedUsers, userId]);
		} else {
			setSelectedUsers(selectedUsers.filter((id) => id !== userId));
		}
	};

	const handleEditUser = (user: User) => {
		setEditingUser(user);
		setEditSheetOpen(true);
	};

	const handleDeleteUser = (user: User) => {
		setDeletingUser(user);
		setDeleteDialogOpen(true);
	};

	const handleSaveUser = (userId: string, newRole: string) => {
		// Check if role is being downgraded from Admin
		const user = users.find((u) => u.id === userId);
		if (user && user.role === "Admin" && newRole !== "Admin") {
			// Show confirmation dialog for role downgrade
			setPendingRoleChange({ userId, newRole, oldRole: user.role });
			setRoleChangeDialogOpen(true);
		} else {
			// Direct update for non-Admin downgrades
			console.log("Updating user:", userId, "with role:", newRole);
			setEditSheetOpen(false);
			// TODO: Implement actual user update logic
		}
	};

	const handleConfirmRoleChange = () => {
		if (pendingRoleChange) {
			console.log(
				"Updating user:",
				pendingRoleChange.userId,
				"with role:",
				pendingRoleChange.newRole,
			);
			// TODO: Implement actual user update logic
			setPendingRoleChange(null);
			setEditSheetOpen(false);
		}
	};

	const handleConfirmDelete = () => {
		console.log("Deleting user:", deletingUser?.id);
		// TODO: Implement actual user deletion logic
	};

	const handleDeleteUsers = () => {
		console.log("Deleting users:", selectedUsers);
		// TODO: Implement actual user deletion logic
	};

	return (
		<>
			<div className="flex flex-col gap-5">
				{selectedUsers.length === 0 ? (
					<div className="flex justify-between items-center py-4">
						<Input placeholder="Search users....." className="max-w-sm" />
					</div>
				) : (
					<BulkActions
						selectedItems={selectedUsers}
						onDelete={handleDeleteUsers}
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
										checked={selectedUsers.length === users.length}
										onCheckedChange={handleSelectAll}
									/>
								</TableHead>
								<TableHead>Name</TableHead>
								<TableHead>
									<Button variant="ghost" className="flex items-center gap-2">
										Status
										<ArrowUpDown className="h-4 w-4" />
									</Button>
								</TableHead>
								<TableHead>
									<Button variant="ghost" className="flex items-center gap-2">
										Roles
										<ArrowUpDown className="h-4 w-4" />
									</Button>
								</TableHead>
								<TableHead>
									<Button variant="ghost" className="flex items-center gap-2">
										Queries
										<ArrowUpDown className="h-4 w-4" />
									</Button>
								</TableHead>
								<TableHead className="text-right">Last Modified</TableHead>
								<TableHead className="w-8"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{users.map((user) => (
								<TableRow key={user.id}>
									<TableCell>
										<Checkbox
											checked={selectedUsers.includes(user.id)}
											onCheckedChange={(checked) =>
												handleSelectUser(user.id, checked as boolean)
											}
										/>
									</TableCell>
									<TableCell>
										<div className="flex flex-col">
											<span className="text-sm text-foreground">
												{user.name}
											</span>
											<span className="text-sm text-muted-foreground">
												{user.email}
											</span>
										</div>
									</TableCell>
									<TableCell>
										<Badge
											variant="outline"
											className="flex items-center gap-1 w-fit"
										>
											{user.status === "Active" ? (
												<Check className="h-3 w-3" />
											) : (
												<Loader className="h-3 w-3" />
											)}
											{user.status}
										</Badge>
									</TableCell>
									<TableCell>
										<Badge variant="outline">{user.role}</Badge>
									</TableCell>
									<TableCell className="text-right">{user.queries}</TableCell>
									<TableCell className="text-right">
										{user.lastModified}
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
													onClick={() => handleEditUser(user)}
												>
													Edit
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => handleDeleteUser(user)}
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
					<p className="text-sm text-muted-foreground">{users.length} Users</p>
					<div className="flex items-center gap-2">
						<Button variant="outline" disabled>
							Previous
						</Button>
						<Button variant="outline" disabled>
							Next
						</Button>
					</div>
				</div>
			</div>

			<EditUserSheet
				open={editSheetOpen}
				onOpenChange={setEditSheetOpen}
				user={editingUser}
				onSave={handleSaveUser}
			/>

			<ConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				title="Remove User"
				description="Are you sure you want remove this user? Once removed they will no longer have access and no data will be recovered."
				onConfirm={handleConfirmDelete}
				confirmLabel="Remove"
				cancelLabel="Cancel"
				variant="destructive"
			/>

			<ConfirmDialog
				open={roleChangeDialogOpen}
				onOpenChange={setRoleChangeDialogOpen}
				title="Change User Role"
				description={
					"This change will reduce this user's permissions from Admin to User. They will no longer have management access. Do you want to continue?"
				}
				onConfirm={handleConfirmRoleChange}
				confirmLabel="Confirm"
				cancelLabel="Cancel"
			/>
		</>
	);
}
