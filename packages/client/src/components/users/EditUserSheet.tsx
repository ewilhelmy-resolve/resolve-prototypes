import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
	const { t } = useTranslation(["settings", "common"]);
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
					<SheetTitle>{t("users.editSheet.title")}</SheetTitle>
					<SheetDescription>{t("users.editSheet.description")}</SheetDescription>
				</SheetHeader>

				<div className="flex flex-col gap-4 px-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="name">{t("common:labels.name")}</Label>
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
						<Label htmlFor="email">{t("common:labels.email")}</Label>
						<Input
							id="email"
							type="email"
							value={user.email}
							readOnly
							className="bg-muted"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="role">{t("common:labels.role")}</Label>
						<Select
							value={selectedRole}
							onValueChange={(value) =>
								setSelectedRole(value as OrganizationRole)
							}
							disabled={isLastActiveOwner}
						>
							<SelectTrigger id="role">
								<SelectValue placeholder={t("common:labels.selectRole")} />
							</SelectTrigger>
							<SelectContent>
								{/* Admins can assign all roles */}
								{isAdmin() && (
									<>
										<SelectItemWithDescription
											value="owner"
											description={t("users.editSheet.roles.ownerDescription")}
										>
											{t("users.editSheet.roles.owner")}
										</SelectItemWithDescription>
										<SelectItemWithDescription
											value="admin"
											description={t("users.editSheet.roles.adminDescription")}
										>
											{t("users.editSheet.roles.admin")}
										</SelectItemWithDescription>
									</>
								)}
								{/* Owners can assign owner role (but not admin) */}
								{isOwner() && !isAdmin() && (
									<SelectItemWithDescription
										value="owner"
										description={t("users.editSheet.roles.ownerDescription")}
									>
										{t("users.editSheet.roles.owner")}
									</SelectItemWithDescription>
								)}
								{/* Both owners and admins can assign User role */}
								<SelectItemWithDescription
									value="user"
									description={t("users.editSheet.roles.userDescription")}
								>
									{t("users.editSheet.roles.user")}
								</SelectItemWithDescription>
							</SelectContent>
						</Select>
						{isLastActiveOwner && (
							<p className="text-sm text-muted-foreground">
								{t("users.editSheet.lastOwnerWarning")}
							</p>
						)}
					</div>
				</div>

				<SheetFooter className="px-4 flex-row justify-end">
					<Button onClick={handleSave}>{t("common:actions.update")}</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
