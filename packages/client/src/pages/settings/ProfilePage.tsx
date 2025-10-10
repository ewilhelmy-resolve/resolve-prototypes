import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/Header";
import RitaSettingsLayout from "@/components/layouts/RitaSettingsLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmFormDialog } from "@/components/dialogs/ConfirmFormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// import useAuth from "@/hooks/useAuth";

/**
 * ProfilePage - Unified profile settings page
 * Displays different content based on user role:
 * - Admin users: Can edit all fields including organization and delete account
 * - Regular users: Can only edit name fields, organization is read-only, no delete option
 */
// Profile form validation schema
const profileSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
	organization: z.string().min(1, "Organization is required"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
	// TODO: Re-enable auth and role checks when auth is implemented
	// const { hasRole } = useAuth();
	// const isAdmin = hasRole("admin");
	const isAdmin = true;

	const [originalValues] = useState<ProfileFormData>({
		firstName: "Charlie",
		lastName: "Smith",
		organization: "Acme Inc.",
	});

	const {
		register,
		handleSubmit,
		formState: { errors, isValid, isDirty },
	} = useForm<ProfileFormData>({
		resolver: zodResolver(profileSchema),
		mode: "onChange",
		defaultValues: originalValues,
	});

	const handleUpdateProfile = (data: ProfileFormData) => {
		console.log("Profile updated:", data);
		// Handle profile update here
	};

	const handleDeleteAccount = () => {
		// Handle account deletion here
		console.log("Account deleted");
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
		confirmText: z
			.string()
			.refine((val) => val.toLowerCase() === "delete", {
				message: 'Must type "delete" to confirm',
			}),
	});

	return (
		<RitaSettingsLayout>
			<div className="flex flex-col">
				<div className="flex flex-col gap-8">
					<Header
						title="Profile"
						description="Manage your personal information"
					/>

					<div className="flex justify-center items-start px-6 py-8 border-border">
						<div className="flex flex-col gap-8">
							<div className="flex flex-col gap-6">
								<div className="flex flex-col gap-2.5">
									<div className="flex flex-col gap-2">
										<h4 className="text-xl font-normal text-foreground">
											General
										</h4>
									</div>

									<form
										onSubmit={handleSubmit(handleUpdateProfile)}
										className="flex flex-col gap-8 bg-white"
									>
										<div className="flex flex-col gap-4">
											<div className="flex gap-4">
												<div className="flex flex-col gap-2 flex-1">
													<Label
														htmlFor="firstName"
														className="text-foreground"
													>
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
														defaultValue="charlie@acme.com"
														disabled
														className="opacity-50"
													/>
												</div>

												<div className="flex flex-col gap-2">
													<Label
														htmlFor="organization"
														className="text-foreground"
													>
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
											disabled={!isValid || !isDirty}
											className={
												!isValid || !isDirty ? "opacity-50 w-fit" : "w-fit"
											}
										>
											Update profile
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
												<div className="flex justify-between items-center gap-6">
													<div className="flex flex-col gap-2">
														<div className="flex justify-start items-center">
															<p className="text-base font-bold text-foreground">
																Delete your account
															</p>
														</div>
														<p className="text-sm text-foreground">
															Permanently delete your entire account, and all
															data you have uploaded.
														</p>
													</div>
													<ConfirmFormDialog
														trigger={
															<Button variant="destructive">
																Delete Account
															</Button>
														}
														title="Delete your account"
														description="This action cannot be undone. This will permanently delete your account and remove all your data from our servers."
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
																			I understand this action is permanent and
																			cannot be undone
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
																				form.setValue("tenantAccess", checked === true, {
																					shouldValidate: true,
																				})
																			}
																		/>
																		<label
																			htmlFor="tenantAccess"
																			className="text-sm leading-relaxed cursor-pointer select-none"
																		>
																			I understand all users in this tenant will no
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
						</div>
					</div>
				</div>
			</div>
		</RitaSettingsLayout>
	);
}
