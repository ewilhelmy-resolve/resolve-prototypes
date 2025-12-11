import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SelectItemWithDescription } from "@/components/ui/select-with-description";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useProfilePermissions } from "@/hooks/api/useProfile";
import type { Member, OrganizationRole } from "@/types/member";

interface EditUserSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	user: Member | null;
	onSave: (
		userId: string,
		updates: {
			role?: OrganizationRole;
		},
	) => void;
	isLastActiveOwner?: boolean;
}

/**
 * Sheet component for editing user role
 * Allows editing role only (name and email are read-only for now)
 * Permission-based:
 * - Admins can assign: owner, admin, user (all roles)
 * - Owners can assign: owner, user (NOT admin)
 *
 * Note: Profile editing (firstName, lastName) will be added in a future update
 */
export default function EditUserSheet({
	open,
	onOpenChange,
	user,
	onSave,
	isLastActiveOwner = false,
}: EditUserSheetProps) {
	const { isOwner, isAdmin } = useProfilePermissions();
	const [selectedRole, setSelectedRole] = useState<OrganizationRole>("user");

	// Update form fields when user changes
	useEffect(() => {
		if (user) {
			setSelectedRole(user.role);
		}
	}, [user]);

	const handleSave = () => {
		if (user) {
			const updates: {
				role?: OrganizationRole;
			} = {};

			// Only include role if changed
			if (selectedRole !== user.role) updates.role = selectedRole;

			onSave(user.id, updates);
			// Note: Sheet is closed by parent component in onSuccess callback
		}
	};

	if (!user) return null;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Edit user</SheetTitle>
					<SheetDescription>Profile information</SheetDescription>
				</SheetHeader>

				<div className="flex flex-col gap-4 px-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							value={
								user.firstName && user.lastName
									? `${user.firstName} ${user.lastName}`
									: user.email
							}
							readOnly
							className="bg-muted"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							value={user.email}
							readOnly
							className="bg-muted"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="role">Role</Label>
						<Select
							value={selectedRole}
							onValueChange={(value) =>
								setSelectedRole(value as OrganizationRole)
							}
							disabled={isLastActiveOwner}
						>
							<SelectTrigger id="role">
								<SelectValue placeholder="Select role" />
							</SelectTrigger>
							<SelectContent>
								{/* Admins can assign all roles */}
								{isAdmin() && (
									<>
										<SelectItemWithDescription
											value="owner"
											description="Full control over all content, members, and settings"
										>
											Owner
										</SelectItemWithDescription>
										<SelectItemWithDescription
											value="admin"
											description="Can manage users and content, but not other admins/owners"
										>
											Admin
										</SelectItemWithDescription>
									</>
								)}
								{/* Owners can assign owner role (but not admin) */}
								{isOwner() && !isAdmin() && (
									<SelectItemWithDescription
										value="owner"
										description="Full control over all content, members, and settings"
									>
										Owner
									</SelectItemWithDescription>
								)}
								{/* Both owners and admins can assign User role */}
								<SelectItemWithDescription
									value="user"
									description="Can view and chat with content but not manage users"
								>
									User
								</SelectItemWithDescription>
							</SelectContent>
						</Select>
						{isLastActiveOwner && (
							<p className="text-sm text-muted-foreground">
								Cannot change role: This is the only active owner in the organization.
								Promote another member to owner first.
							</p>
						)}
					</div>
				</div>

				<SheetFooter className="px-4 flex-row justify-end">
					<Button onClick={handleSave}>Update</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
