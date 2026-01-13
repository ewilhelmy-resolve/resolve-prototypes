import { Loader, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import EmptyInvitationsState from "@/components/users/EmptyInvitationsState";
import {
	useCancelInvitation,
	useInvitations,
	useResendInvitation,
} from "@/hooks/api/useInvitations";
import { formatDate } from "@/lib/table-utils";
import { toast } from "@/lib/toast";
import {
	type Invitation,
	InvitationStatus,
	UserRole,
} from "@/types/invitations";

export default function PendingInvitationsTable() {
	const { t } = useTranslation("settings");
	const [selectedInvitations, setSelectedInvitations] = useState<string[]>([]);
	const [cancelingInvitation, setCancelingInvitation] =
		useState<Invitation | null>(null);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [bulkCancelDialogOpen, setBulkCancelDialogOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	// Fetch pending invitations
	const { data, isLoading, error } = useInvitations({
		status: InvitationStatus.PENDING,
	});

	const { mutate: resendInvitation, isPending: isResending } =
		useResendInvitation();
	const { mutate: cancelInvitation, isPending: isCanceling } =
		useCancelInvitation();

	const allInvitations = data?.invitations || [];

	// Client-side search filtering
	const invitations = allInvitations.filter((invitation) => {
		if (!searchQuery.trim()) return true;

		const query = searchQuery.toLowerCase();
		const email = invitation.email.toLowerCase();
		const invitedBy = (invitation.invited_by_name || "").toLowerCase();

		return email.includes(query) || invitedBy.includes(query);
	});

	const handleSelectAll = (checked: boolean) => {
		if (checked) {
			setSelectedInvitations(invitations.map((inv) => inv.id));
		} else {
			setSelectedInvitations([]);
		}
	};

	const handleSelectInvitation = (invitationId: string, checked: boolean) => {
		if (checked) {
			setSelectedInvitations([...selectedInvitations, invitationId]);
		} else {
			setSelectedInvitations(
				selectedInvitations.filter((id) => id !== invitationId),
			);
		}
	};

	const handleResendInvitation = (invitation: Invitation) => {
		// Note: API doesn't return role, defaulting to USER for resend
		// TODO: Backend should store and return role to preserve original assignment
		resendInvitation(
			{
				emails: [invitation.email],
				role: UserRole.USER,
			},
			{
				onSuccess: () => {
					toast.success(t("users.invitations.toast.resendSuccess"), {
						description: t("users.invitations.toast.resendSuccessDesc", { email: invitation.email }),
					});
				},
				onError: (error) => {
					toast.error(t("users.invitations.toast.resendError"), {
						description: error.message || t("users.invitations.toast.tryAgainLater"),
					});
				},
			},
		);
	};

	const handleCancelInvitation = (invitation: Invitation) => {
		setCancelingInvitation(invitation);
		setCancelDialogOpen(true);
	};

	const handleConfirmCancel = () => {
		if (!cancelingInvitation) return;

		cancelInvitation(
			{
				invitationId: cancelingInvitation.id,
			},
			{
				onSuccess: () => {
					toast.success(t("users.invitations.toast.cancelSuccess"), {
						description: t("users.invitations.toast.cancelSuccessDesc", { email: cancelingInvitation.email }),
					});
					setCancelDialogOpen(false);
					setCancelingInvitation(null);
				},
				onError: (error) => {
					toast.error(t("users.invitations.toast.cancelError"), {
						description: error.message || t("users.invitations.toast.tryAgainLater"),
					});
				},
			},
		);
	};

	const handleBulkCancelClick = () => {
		setBulkCancelDialogOpen(true);
	};

	const handleConfirmBulkCancel = async () => {
		setBulkCancelDialogOpen(false);

		// Cancel selected invitations one by one
		let successCount = 0;
		let failCount = 0;

		for (const invitationId of selectedInvitations) {
			try {
				await new Promise<void>((resolve, reject) => {
					cancelInvitation(
						{ invitationId },
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

		// Clear selection after cancellation attempts
		setSelectedInvitations([]);

		// Show summary toast
		if (successCount > 0 && failCount === 0) {
			toast.success(t("users.invitations.toast.bulkCancelSuccess"), {
				description: t("users.invitations.toast.bulkCancelSuccessDesc", { count: successCount }),
			});
		} else if (failCount > 0 && successCount > 0) {
			toast.warning(t("users.invitations.toast.bulkCancelPartial"), {
				description: t("users.invitations.toast.bulkCancelPartialDesc", { success: successCount, failed: failCount }),
			});
		} else if (failCount > 0) {
			toast.error(t("users.invitations.toast.bulkCancelError"), {
				description: t("users.invitations.toast.bulkCancelErrorDesc", { count: failCount }),
			});
		}
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
				title={t("users.invitations.error.title")}
				description={error.message || t("users.invitations.error.description")}
				actionLabel={t("errors.tryAgain")}
				onAction={() => window.location.reload()}
			/>
		);
	}

	// Empty state
	if (invitations.length === 0) {
		return <EmptyInvitationsState />;
	}

	return (
		<>
			<div className="flex flex-col gap-5">
				{selectedInvitations.length === 0 ? (
					<div className="flex justify-between items-center py-4">
						<Input
							placeholder={t("users.invitations.searchPlaceholder")}
							className="max-w-sm"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
				) : (
					<BulkActions
						selectedItems={selectedInvitations}
						onDelete={handleBulkCancelClick}
						deleteLabel={t("users.invitations.actions.bulkCancel")}
						onClose={() => setSelectedInvitations([])}
						itemLabel="invitations"
					/>
				)}

				<div className="border rounded-md">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-8">
									<Checkbox
										checked={selectedInvitations.length === invitations.length}
										onCheckedChange={handleSelectAll}
									/>
								</TableHead>
								<TableHead>{t("users.invitations.headers.email")}</TableHead>
								<TableHead>{t("users.invitations.headers.invitedBy")}</TableHead>
								<TableHead>{t("users.invitations.headers.invitedDate")}</TableHead>
								<TableHead>{t("users.invitations.headers.expiresAt")}</TableHead>
								<TableHead>{t("users.invitations.headers.status")}</TableHead>
								<TableHead className="w-8"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{invitations.map((invitation) => (
								<TableRow key={invitation.id}>
									<TableCell>
										<Checkbox
											checked={selectedInvitations.includes(invitation.id)}
											onCheckedChange={(checked) =>
												handleSelectInvitation(
													invitation.id,
													checked as boolean,
												)
											}
										/>
									</TableCell>
									<TableCell>
										<span className="text-sm text-foreground">
											{invitation.email}
										</span>
									</TableCell>
									<TableCell>
										<span className="text-sm text-muted-foreground">
											{invitation.invited_by_name || t("users.invitations.unknown")}
										</span>
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{formatDate(invitation.created_at)}
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{formatDate(invitation.token_expires_at)}
									</TableCell>
									<TableCell>
										<Badge
											variant="outline"
											className="flex items-center gap-1 w-fit"
										>
											<Loader className="h-3 w-3" />
											{t("users.invitations.status.pending")}
										</Badge>
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
													onClick={() => handleResendInvitation(invitation)}
													disabled={isResending}
												>
													{t("users.invitations.actions.resend")}
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => handleCancelInvitation(invitation)}
													disabled={isCanceling}
													variant="destructive"
												>
													{t("users.invitations.actions.cancel")}
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
						{t("users.invitations.count", { count: invitations.length })}
						{searchQuery && t("users.invitations.countFiltered", { total: allInvitations.length })}
					</p>
				</div>
			</div>

			{/* Single Cancel Dialog */}
			<ConfirmDialog
				open={cancelDialogOpen}
				onOpenChange={setCancelDialogOpen}
				title={t("users.invitations.dialogs.cancel.title")}
				description={t("users.invitations.dialogs.cancel.description", { email: cancelingInvitation?.email })}
				onConfirm={handleConfirmCancel}
				confirmLabel={t("users.invitations.dialogs.cancel.confirmLabel")}
				cancelLabel={t("users.invitations.dialogs.cancel.cancelLabel")}
				variant="destructive"
			/>

			{/* Bulk Cancel Dialog */}
			<ConfirmDialog
				open={bulkCancelDialogOpen}
				onOpenChange={setBulkCancelDialogOpen}
				title={t("users.invitations.dialogs.bulkCancel.title")}
				description={t("users.invitations.dialogs.bulkCancel.description", { count: selectedInvitations.length })}
				onConfirm={handleConfirmBulkCancel}
				confirmLabel={t("users.invitations.dialogs.bulkCancel.confirmLabel")}
				cancelLabel={t("users.invitations.dialogs.bulkCancel.cancelLabel")}
				variant="destructive"
			/>
		</>
	);
}
