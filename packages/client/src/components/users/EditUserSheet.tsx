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

interface User {
	id: string;
	name: string;
	email: string;
	role: string;
}

interface EditUserSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	user: User | null;
	onSave: (userId: string, role: string) => void;
}

/**
 * Sheet component for editing user information
 * Displays user email and allows role modification
 */
export default function EditUserSheet({
	open,
	onOpenChange,
	user,
	onSave,
}: EditUserSheetProps) {
	const [selectedRole, setSelectedRole] = useState<string>(user?.role || "User");

	// Update selected role when user changes
	useEffect(() => {
		if (user) {
			setSelectedRole(user.role);
		}
	}, [user]);

	const handleSave = () => {
		if (user) {
			onSave(user.id, selectedRole);
			onOpenChange(false);
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
						<Input id="name" value={user.name} readOnly />
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="email">User Email</Label>
						<Input id="email" value={user.email} readOnly />
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="role">Role</Label>
						<Select value={selectedRole} onValueChange={setSelectedRole}>
							<SelectTrigger id="role">
								<SelectValue placeholder="Select role" />
							</SelectTrigger>
							<SelectContent>
								<SelectItemWithDescription
									value="Admin"
									description="Can view and chat with content but not manage"
								>
									Admin
								</SelectItemWithDescription>
								<SelectItemWithDescription
									value="User"
									description="Full control over all content, members, and settings"
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
