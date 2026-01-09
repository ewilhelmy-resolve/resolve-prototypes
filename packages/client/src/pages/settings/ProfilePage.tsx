import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { ConfirmFormDialog } from "@/components/dialogs/ConfirmFormDialog";
import RitaSettingsLayout from "@/components/layouts/RitaSettingsLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import i18n from "@/i18n";
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
		.min(1, i18n.t("profile.validation.firstNameRequired", { ns: "settings" }))
		.max(100, i18n.t("profile.validation.firstNameTooLong", { ns: "settings" })),
	lastName: z
		.string()
		.min(1, i18n.t("profile.validation.lastNameRequired", { ns: "settings" }))
		.max(100, i18n.t("profile.validation.lastNameTooLong", { ns: "settings" })),
	organization: z.string().min(1, i18n.t("profile.validation.organizationRequired", { ns: "settings" })),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
	const { t } = useTranslation("settings");
	const { t: tToast } = useTranslation("toast");
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
				toast.success(tToast("success.profileUpdated"));
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
						toast.error(tToast("error.profileUpdateFailed"), {
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
						toast.error(tToast("error.organizationUpdateFailed"), {
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
			message: t("profile.validation.mustConfirmPermanent"),
		}),
		data: z.boolean().refine((val) => val === true, {
			message: t("profile.validation.mustConfirmData"),
		}),
		tenantAccess: z.boolean().refine((val) => val === true, {
			message: t("profile.validation.mustConfirmTenantAccess"),
		}),
		confirmText: z.string().refine((val) => val.toLowerCase() === "delete", {
			message: t("profile.validation.mustTypeDelete"),
		}),
	});

	return (
		<RitaSettingsLayout>
			<div className="flex-1 inline-flex flex-col items-center gap-8 w-full">
				<div className="self-stretch flex flex-col items-start gap-8">
					<SettingsHeader
						title={t("profile.title")}
						description={t("profile.description")}
					/>
				</div>

				<div className="px-6 pb-8 max-w-2xl mx-auto w-full flex flex-col gap-6">
					<h4 className="text-xl font-normal text-foreground">{t("profile.general")}</h4>

					<form
						onSubmit={handleSubmit(handleUpdateProfile)}
						className="flex flex-col gap-8 bg-white"
					>
						<div className="flex flex-col gap-4">
							<div className="flex flex-col md:flex-row gap-4">
								<div className="flex flex-col gap-2 flex-1">
									<Label htmlFor="firstName" className="text-foreground">
										{t("profile.firstName")}
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
										{t("profile.lastName")}
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
										{t("profile.email")}
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
										{t("profile.organization")}
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
								? t("profile.updating")
								: t("profile.updateProfile")}
						</Button>
					</form>

					{isAdmin && (
						<div className="flex flex-col gap-6">
							<div className="flex flex-col gap-2.5">
								<div className="flex flex-col gap-2">
									<h4 className="text-xl font-normal text-foreground">
										{t("profile.dangerZone")}
									</h4>
								</div>
							</div>

							<div className="border border-border rounded-md p-4 bg-neutral-50">
								<div className="flex flex-col md:flex-row justify-between items-center gap-6">
									<div className="flex flex-col gap-2">
										<div className="flex justify-start items-center">
											<p className="text-base font-bold text-foreground">
												{t("profile.deleteAccount.title")}
											</p>
										</div>
										<p className="text-sm text-foreground">
											{isAdmin
												? t("profile.deleteAccount.descriptionAdmin")
												: t("profile.deleteAccount.description")}
										</p>
									</div>
									<ConfirmFormDialog
										trigger={
											<Button
												variant="destructive"
												disabled={isDeletingAccount}
											>
												{isDeletingAccount ? t("profile.deleting") : t("profile.deleteAccountBtn")}
											</Button>
										}
										title={t("profile.deleteAccount.title")}
										description={isAdmin
											? t("profile.deleteAccount.dialogDescriptionAdmin")
											: t("profile.deleteAccount.dialogDescription")}
										validationSchema={deleteAccountSchema}
										defaultValues={{
											permanent: false,
											data: false,
											tenantAccess: false,
											confirmText: "",
										}}
										actionLabel={t("profile.deleteAccountBtn")}
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
															{t("profile.deleteAccount.confirmPermanent")}
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
															{t("profile.deleteAccount.confirmData")}
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
															{t("profile.deleteAccount.confirmTenantAccess", {
																scope: isAdmin ? "organization" : "tenant",
															})}
														</label>
													</div>
												</div>

												<div className="flex flex-col gap-2">
													<Label htmlFor="confirmText" className="text-sm">
														{t("profile.deleteAccount.typeDelete").split("<strong>")[0]}
														<span className="font-mono font-semibold">delete</span>
														{t("profile.deleteAccount.typeDelete").split("</strong>")[1]}
													</Label>
													<Input
														id="confirmText"
														{...form.register("confirmText")}
														placeholder={t("profile.typeDeletePlaceholder")}
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
