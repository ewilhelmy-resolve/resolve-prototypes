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
			firstName?: string;
			lastName?: string;
			role?: OrganizationRole;
		},
	) => void;
}

/**
 * Sheet component for editing user information
 * Allows editing first name, last name, and role (email is read-only)
 * Permission-based:
 * - Admins can assign: owner, admin, user (all roles)
 * - Owners can assign: owner, user (NOT admin)
 */
export default function EditUserSheet({
	open,
	onOpenChange,
	user,
	onSave,
}: EditUserSheetProps) {
	const { isOwner, isAdmin } = useProfilePermissions();
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [selectedRole, setSelectedRole] = useState<OrganizationRole>("user");

	// Update form fields when user changes
	useEffect(() => {
		if (user) {
			setFirstName(user.firstName || "");
			setLastName(user.lastName || "");
			setEmail(user.email);
			setSelectedRole(user.role);
		}
	}, [user]);

	const handleSave = () => {
		if (user) {
			const updates: {
				firstName?: string;
				lastName?: string;
				role?: OrganizationRole;
			} = {};

			// Only include changed fields
			if (firstName !== (user.firstName || "")) updates.firstName = firstName;
			if (lastName !== (user.lastName || "")) updates.lastName = lastName;
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
						<Label htmlFor="firstName">First Name</Label>
						<Input
							id="firstName"
							value={firstName}
							onChange={(e) => setFirstName(e.target.value)}
							placeholder="Enter first name"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="lastName">Last Name</Label>
						<Input
							id="lastName"
							value={lastName}
							onChange={(e) => setLastName(e.target.value)}
							placeholder="Enter last name"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="email">User Email</Label>
						<Input
							id="email"
							type="email"
							value={email}
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
					</div>
				</div>

				<SheetFooter className="px-4 flex-row justify-end">
					<Button onClick={handleSave}>Update</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
