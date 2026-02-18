import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ritaToast } from "@/components/ui/rita-toast";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
	useAutopilotSettings,
	useUpdateAutopilotSettings,
} from "@/hooks/api/useAutopilotSettings";

interface TicketSettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const FORM_ID = "ticket-settings-form";

export default function TicketSettingsDialog({
	open,
	onOpenChange,
}: TicketSettingsDialogProps) {
	const { t } = useTranslation("tickets");
	const { t: tCommon } = useTranslation("common");
	const { t: tToast } = useTranslation("toast");

	const { data: settings, isLoading } = useAutopilotSettings();
	const updateMutation = useUpdateAutopilotSettings();

	const ticketSettingsSchema = z.object({
		costPerTicket: z.number().positive({
			message: t("ticketSettings.validation.costMustBePositive"),
		}),
		avgTimePerTicket: z.number().positive({
			message: t("ticketSettings.validation.timeMustBePositive"),
		}),
		timeUnit: z.enum(["minutes"]),
	});

	type TicketSettingsForm = z.infer<typeof ticketSettingsSchema>;

	const {
		register,
		handleSubmit,
		watch,
		setValue,
		reset,
		formState: { errors, isDirty },
	} = useForm<TicketSettingsForm>({
		resolver: zodResolver(ticketSettingsSchema),
		defaultValues: {
			costPerTicket: 30,
			avgTimePerTicket: 12,
			timeUnit: "minutes" as const,
		},
		mode: "onChange",
	});

	// Populate form with server data when loaded
	useEffect(() => {
		if (settings && open) {
			reset({
				costPerTicket: settings.cost_per_ticket,
				avgTimePerTicket: settings.avg_time_per_ticket_minutes,
				timeUnit: "minutes",
			});
		}
	}, [settings, open, reset]);

	// Reset form when dialog closes (after animation)
	useEffect(() => {
		if (!open) {
			const timeout = setTimeout(() => {
				if (settings) {
					reset({
						costPerTicket: settings.cost_per_ticket,
						avgTimePerTicket: settings.avg_time_per_ticket_minutes,
						timeUnit: "minutes",
					});
				}
			}, 300);
			return () => clearTimeout(timeout);
		}
	}, [open, reset, settings]);

	const onSubmit = (data: TicketSettingsForm) => {
		updateMutation.mutate(
			{
				cost_per_ticket: data.costPerTicket,
				avg_time_per_ticket_minutes: data.avgTimePerTicket,
			},
			{
				onSuccess: () => {
					ritaToast.success({
						title: tToast("success.autopilotSettingsUpdated"),
					});
					onOpenChange(false);
				},
				onError: () => {
					ritaToast.error({
						title: tToast("error.autopilotSettingsFailed"),
					});
				},
			},
		);
	};

	const isSaving = updateMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{t("ticketSettings.title")}</DialogTitle>
					<DialogDescription>
						{t("ticketSettings.description")}
					</DialogDescription>
				</DialogHeader>

				<Separator />

				{isLoading ? (
					<div className="flex flex-col gap-6">
						<div className="flex flex-col gap-4">
							<Skeleton className="h-5 w-48" />
							<div className="grid gap-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-4 w-64" />
							</div>
						</div>
						<div className="flex flex-col gap-4">
							<Skeleton className="h-5 w-52" />
							<div className="grid gap-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-4 w-64" />
							</div>
						</div>
					</div>
				) : (
					<form
						id={FORM_ID}
						onSubmit={handleSubmit(onSubmit)}
						className="flex flex-col gap-6"
					>
						<div className="flex flex-col gap-4">
							<p className="text-base">{t("ticketSettings.savingsSection")}</p>
							<div className="grid gap-2">
								<Label htmlFor="costPerTicket">
									{t("ticketSettings.costPerTicket")}
								</Label>
								<div className="relative">
									<span
										className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
										aria-hidden="true"
									>
										$
									</span>
									<Input
										id="costPerTicket"
										type="number"
										step="0.01"
										min="0"
										className="pl-7"
										disabled={isSaving}
										aria-invalid={!!errors.costPerTicket}
										aria-describedby="costPerTicket-error costPerTicket-help"
										{...register("costPerTicket", {
											valueAsNumber: true,
										})}
									/>
								</div>
								{errors.costPerTicket && (
									<p
										id="costPerTicket-error"
										className="text-sm text-destructive"
										role="alert"
									>
										{errors.costPerTicket.message}
									</p>
								)}
								<p
									id="costPerTicket-help"
									className="text-sm text-muted-foreground"
								>
									{t("ticketSettings.costHelper")}
								</p>
							</div>
						</div>

						<div className="flex flex-col gap-4">
							<p className="text-base">
								{t("ticketSettings.timeSavedSection")}
							</p>
							<div className="grid gap-2">
								<Label htmlFor="avgTimePerTicket">
									{t("ticketSettings.avgTimePerTicket")}
								</Label>
								<div className="flex gap-2.5">
									<Input
										id="avgTimePerTicket"
										type="number"
										step="1"
										min="0"
										className="flex-1"
										disabled={isSaving}
										aria-invalid={!!errors.avgTimePerTicket}
										aria-describedby="avgTimePerTicket-error avgTimePerTicket-help"
										{...register("avgTimePerTicket", {
											valueAsNumber: true,
										})}
									/>
									<Select
										value={watch("timeUnit")}
										onValueChange={(val) =>
											setValue("timeUnit", val as "minutes", {
												shouldDirty: true,
											})
										}
										disabled={isSaving}
									>
										<SelectTrigger
											className="w-[130px]"
											aria-label={t("ticketSettings.avgTimePerTicket")}
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="minutes">
												{t("ticketSettings.timeUnit.minutes")}
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
								{errors.avgTimePerTicket && (
									<p
										id="avgTimePerTicket-error"
										className="text-sm text-destructive"
										role="alert"
									>
										{errors.avgTimePerTicket.message}
									</p>
								)}
								<p
									id="avgTimePerTicket-help"
									className="text-sm text-muted-foreground"
								>
									{t("ticketSettings.timeHelper")}
								</p>
							</div>
						</div>
					</form>
				)}

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isSaving}
					>
						{tCommon("actions.cancel")}
					</Button>
					<Button
						type="submit"
						form={FORM_ID}
						disabled={!isDirty || isLoading || isSaving}
					>
						{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{tCommon("actions.save")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
