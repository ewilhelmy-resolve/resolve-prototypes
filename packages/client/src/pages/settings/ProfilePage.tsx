import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ConfirmFormDialog } from "@/components/dialogs/ConfirmFormDialog";
import RitaSettingsLayout from "@/components/layouts/RitaSettingsLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeleteOwnAccount } from "@/hooks/api/useMembers";
import { useProfile, useProfilePermissions } from "@/hooks/api/useProfile";
import { useUpdateOrganization } from "@/hooks/api/useUpdateOrganization";
import { useUpdateProfile } from "@/hooks/api/useUpdateProfile";
import { toast } from "@/lib/toast";
import SettingsHeader from "@/pages/settings/SettingsHeader";

/**
 * ProfilePage - Unified profile settings page
 * Displays different content based on user role:
 * - Admin users: Can edit all fields including organization and delete account
 * - Regular users: Can only edit name fields, organization is read-only, no delete option
 */
// Profile form validation schema
const profileSchema = z.object({
	firstName: z
		.string()
		.min(1, "First name is required")
		.max(100, "First name is too long"),
	lastName: z
		.string()
		.min(1, "Last name is required")
		.max(100, "Last name is too long"),
	organization: z.string().min(1, "Organization is required"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
	const { isOwnerOrAdmin } = useProfilePermissions();
	const isAdmin = isOwnerOrAdmin(); // For delete account section AND organization editing
	const { data: profile } = useProfile();
	const { mutate: updateProfile, isPending: isUpdatingProfile } =
		useUpdateProfile();
	const { mutate: updateOrganization, isPending: isUpdatingOrganization } =
		useUpdateOrganization();
	const { mutate: deleteOwnAccount, isPending: isDeletingAccount } =
		useDeleteOwnAccount();

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isValid, isDirty },
	} = useForm<ProfileFormData>({
		resolver: zodResolver(profileSchema),
		mode: "onChange",
		defaultValues: {
			firstName: "",
			lastName: "",
			organization: "Acme Inc.", // TODO: Load from organization data when available
		},
	});

	// Reset form when profile data loads
	useEffect(() => {
		if (profile?.user) {
			reset({
				firstName: profile.user.firstName || "",
				lastName: profile.user.lastName || "",
				organization: profile.organization.name || "",
			});
		}
	}, [profile, reset]);

	const handleUpdateProfile = (data: ProfileFormData) => {
		const hasProfileChanges =
			data.firstName !== profile?.user.firstName ||
			data.lastName !== profile?.user.lastName;
		const hasOrganizationChanges =
			isAdmin && data.organization !== profile?.organization.name;

		// Track pending operations
		let completedOperations = 0;
		const totalOperations =
			(hasProfileChanges ? 1 : 0) + (hasOrganizationChanges ? 1 : 0);

		const checkAllComplete = () => {
			completedOperations++;
			if (completedOperations === totalOperations) {
				toast.success("Profile updated successfully");
				reset(data);
			}
		};

		// Update user profile (firstName, lastName)
		if (hasProfileChanges) {
			updateProfile(
				{
					firstName: data.firstName,
					lastName: data.lastName,
				},
				{
					onSuccess: checkAllComplete,
					onError: (error) => {
						toast.error("Failed to update profile", {
							description: error.message || "Please try again.",
						});
					},
				},
			);
		}

		// Update organization name (admin only)
		if (hasOrganizationChanges && profile?.organization.id) {
			updateOrganization(
				{
					organizationId: profile.organization.id,
					name: data.organization,
				},
				{
					onSuccess: checkAllComplete,
					onError: (error) => {
						toast.error("Failed to update organization", {
							description: error.message || "Please try again.",
						});
					},
				},
			);
		}
	};

	const handleDeleteAccount = () => {
		deleteOwnAccount({ reason: "User requested account deletion" });
	};

	// Validation schema for delete account dialog
	const deleteAccountSchema = z.object({
		permanent: z.boolean().refine((val) => val === true, {
			message: "Must confirm this is permanent",
		}),
		data: z.boolean().refine((val) => val === true, {
			message: "Must confirm data deletion",
		}),
		tenantAccess: z.boolean().refine((val) => val === true, {
			message: "Must confirm tenant access removal",
		}),
		confirmText: z.string().refine((val) => val.toLowerCase() === "delete", {
			message: 'Must type "delete" to confirm',
		}),
	});

	return (
		<RitaSettingsLayout>
			<div className="flex-1 inline-flex flex-col items-center gap-8 w-full">
				<div className="self-stretch flex flex-col items-start gap-8">
					<SettingsHeader
						title="Profile"
						description="Manage your personal information"
					/>
				</div>

				<div className="px-6 pb-8 max-w-2xl mx-auto w-full flex flex-col gap-6">
					<h4 className="text-xl font-normal text-foreground">General</h4>

					<form
						onSubmit={handleSubmit(handleUpdateProfile)}
						className="flex flex-col gap-8 bg-white"
					>
						<div className="flex flex-col gap-4">
							<div className="flex flex-col md:flex-row gap-4">
								<div className="flex flex-col gap-2 flex-1">
									<Label htmlFor="firstName" className="text-foreground">
										First name
										<span className="text-destructive ml-1">*</span>
									</Label>
									<Input
										id="firstName"
										{...register("firstName")}
										className={errors.firstName ? "border-destructive" : ""}
									/>
									{errors.firstName && (
										<p className="text-sm text-destructive">
											{errors.firstName.message}
										</p>
									)}
								</div>
								<div className="flex flex-col gap-2 flex-1">
									<Label htmlFor="lastName" className="text-foreground">
										Last name
										<span className="text-destructive ml-1">*</span>
									</Label>
									<Input
										id="lastName"
										{...register("lastName")}
										className={errors.lastName ? "border-destructive" : ""}
									/>
									{errors.lastName && (
										<p className="text-sm text-destructive">
											{errors.lastName.message}
										</p>
									)}
								</div>
							</div>

							<div className="flex flex-col gap-4">
								<div className="flex flex-col gap-2">
									<Label htmlFor="email" className="text-foreground">
										Email
									</Label>
									<Input
										id="email"
										value={profile?.user?.email || ""}
										disabled
										className="opacity-50"
									/>
								</div>

								<div className="flex flex-col gap-2">
									<Label htmlFor="organization" className="text-foreground">
										Organization
										<span className="text-destructive ml-1">*</span>
									</Label>
									<Input
										id="organization"
										{...register("organization")}
										disabled={!isAdmin}
										className={
											!isAdmin
												? "opacity-50"
												: errors.organization
													? "border-destructive"
													: ""
										}
									/>
									{errors.organization && isAdmin && (
										<p className="text-sm text-destructive">
											{errors.organization.message}
										</p>
									)}
								</div>
							</div>
						</div>

						<Button
							type="submit"
							size="default"
							disabled={
								!isValid ||
								!isDirty ||
								isUpdatingProfile ||
								isUpdatingOrganization
							}
							className={
								!isValid ||
								!isDirty ||
								isUpdatingProfile ||
								isUpdatingOrganization
									? "opacity-50 w-fit"
									: "w-fit"
							}
						>
							{isUpdatingProfile || isUpdatingOrganization
								? "Updating..."
								: "Update profile"}
						</Button>
					</form>

					{isAdmin && (
						<div className="flex flex-col gap-6">
							<div className="flex flex-col gap-2.5">
								<div className="flex flex-col gap-2">
									<h4 className="text-xl font-normal text-foreground">
										Danger zone
									</h4>
								</div>
							</div>

							<div className="border border-border rounded-md p-4 bg-neutral-50">
								<div className="flex flex-col md:flex-row justify-between items-center gap-6">
									<div className="flex flex-col gap-2">
										<div className="flex justify-start items-center">
											<p className="text-base font-bold text-foreground">
												Delete your account
											</p>
										</div>
										<p className="text-sm text-foreground">
											Permanently delete your entire account
											{isAdmin ? ", organization," : ""} and all data you have
											uploaded.
											{isAdmin &&
												" As an owner, this will delete the entire organization and all members."}
										</p>
									</div>
									<ConfirmFormDialog
										trigger={
											<Button
												variant="destructive"
												disabled={isDeletingAccount}
											>
												{isDeletingAccount ? "Deleting..." : "Delete Account"}
											</Button>
										}
										title="Delete your account"
										description={`This action cannot be undone. This will permanently delete your account and remove all your data from our servers.${isAdmin ? " As an owner, this will also delete the entire organization and all members." : ""}`}
										validationSchema={deleteAccountSchema}
										defaultValues={{
											permanent: false,
											data: false,
											tenantAccess: false,
											confirmText: "",
										}}
										actionLabel="Delete Account"
										actionVariant="destructive"
										onConfirm={(data) => {
											console.log("Delete confirmed with data:", data);
											handleDeleteAccount();
										}}
										onClose={(data) => {
											console.log("Dialog closed with data:", data);
											if (data.confirmed) {
												console.log("User confirmed deletion");
											} else {
												console.log("User cancelled deletion");
											}
										}}
									>
										{(form) => (
											<div className="flex flex-col gap-6 py-4">
												<div className="flex flex-col gap-4">
													<div className="flex items-start gap-3">
														<Checkbox
															id="permanent"
															checked={form.watch("permanent") || false}
															onCheckedChange={(checked) =>
																form.setValue("permanent", checked === true, {
																	shouldValidate: true,
																})
															}
														/>
														<label
															htmlFor="permanent"
															className="text-sm leading-relaxed cursor-pointer select-none"
														>
															I understand this action is permanent and cannot
															be undone
														</label>
													</div>
													<div className="flex items-start gap-3">
														<Checkbox
															id="data"
															checked={form.watch("data") || false}
															onCheckedChange={(checked) =>
																form.setValue("data", checked === true, {
																	shouldValidate: true,
																})
															}
														/>
														<label
															htmlFor="data"
															className="text-sm leading-relaxed cursor-pointer select-none"
														>
															I understand all my data will be permanently
															deleted
														</label>
													</div>
													<div className="flex items-start gap-3">
														<Checkbox
															id="tenantAccess"
															checked={form.watch("tenantAccess") || false}
															onCheckedChange={(checked) =>
																form.setValue(
																	"tenantAccess",
																	checked === true,
																	{
																		shouldValidate: true,
																	},
																)
															}
														/>
														<label
															htmlFor="tenantAccess"
															className="text-sm leading-relaxed cursor-pointer select-none"
														>
															I understand all users in this{" "}
															{isAdmin ? "organization" : "tenant"} will no
															longer have access
														</label>
													</div>
												</div>

												<div className="flex flex-col gap-2">
													<Label htmlFor="confirmText" className="text-sm">
														Type{" "}
														<span className="font-mono font-semibold">
															delete
														</span>{" "}
														to confirm
													</Label>
													<Input
														id="confirmText"
														{...form.register("confirmText")}
														placeholder="Type delete here"
													/>
												</div>
											</div>
										)}
									</ConfirmFormDialog>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</RitaSettingsLayout>
	);
}
