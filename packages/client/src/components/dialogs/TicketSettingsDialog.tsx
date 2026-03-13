import { zodResolver } from "@hookform/resolvers/zod";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useTicketSettingsStore } from "@/stores/ticketSettingsStore";

interface TicketSettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const FORM_ID = "ticket-settings-form";

const FORM_DEFAULTS = {
	timeUnit: "minutes" as const,
};

export default function TicketSettingsDialog({
	open,
	onOpenChange,
}: TicketSettingsDialogProps) {
	const { t } = useTranslation("tickets");
	const { t: tCommon } = useTranslation("common");
	const settingsStore = useTicketSettingsStore();

	const ticketSettingsSchema = z.object({
		blendedRatePerHour: z.number().positive({
			message: t("ticketSettings.validation.costMustBePositive"),
		}),
		timeToTake: z.number().positive({
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
			blendedRatePerHour: settingsStore.blendedRatePerHour,
			timeToTake: settingsStore.timeToTake,
			timeUnit: FORM_DEFAULTS.timeUnit,
		},
		mode: "onChange",
	});

	useEffect(() => {
		if (!open) {
			const timeout = setTimeout(() => {
				reset({
					blendedRatePerHour: settingsStore.blendedRatePerHour,
					timeToTake: settingsStore.timeToTake,
					timeUnit: FORM_DEFAULTS.timeUnit,
				});
			}, 300);
			return () => clearTimeout(timeout);
		}
	}, [
		open,
		reset,
		settingsStore.blendedRatePerHour,
		settingsStore.timeToTake,
	]);

	const onSubmit = (data: TicketSettingsForm) => {
		settingsStore.setSettings({
			blendedRatePerHour: data.blendedRatePerHour,
			timeToTake: data.timeToTake,
		});
		onOpenChange(false);
	};

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

				<form
					id={FORM_ID}
					onSubmit={handleSubmit(onSubmit)}
					className="flex flex-col gap-6"
				>
					<div className="flex flex-col gap-4">
						<p className="text-base">{t("ticketSettings.savingsSection")}</p>
						<div className="grid gap-2">
							<Label htmlFor="blendedRatePerHour">
								{t("ticketSettings.blendedRatePerHour")}
							</Label>
							<div className="relative">
								<span
									className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
									aria-hidden="true"
								>
									$
								</span>
								<Input
									id="blendedRatePerHour"
									type="number"
									step="0.01"
									min="0"
									className="pl-7"
									aria-invalid={!!errors.blendedRatePerHour}
									aria-describedby="blendedRatePerHour-error blendedRatePerHour-help"
									{...register("blendedRatePerHour", {
										valueAsNumber: true,
									})}
								/>
							</div>
							{errors.blendedRatePerHour && (
								<p
									id="blendedRatePerHour-error"
									className="text-sm text-destructive"
									role="alert"
								>
									{errors.blendedRatePerHour.message}
								</p>
							)}
							<p
								id="blendedRatePerHour-help"
								className="text-sm text-muted-foreground"
							>
								{t("ticketSettings.costHelper")}
							</p>
						</div>
					</div>

					<div className="flex flex-col gap-4">
						<p className="text-base">{t("ticketSettings.timeSavedSection")}</p>
						<div className="grid gap-2">
							<Label htmlFor="timeToTake">
								{t("ticketSettings.timeToTake")}
							</Label>
							<div className="flex gap-2.5">
								<Input
									id="timeToTake"
									type="number"
									step="1"
									min="0"
									className="flex-1"
									aria-invalid={!!errors.timeToTake}
									aria-describedby="timeToTake-error timeToTake-help"
									{...register("timeToTake", {
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
								>
									<SelectTrigger
										className="w-[130px]"
										aria-label={t("ticketSettings.timeToTake")}
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
							{errors.timeToTake && (
								<p
									id="timeToTake-error"
									className="text-sm text-destructive"
									role="alert"
								>
									{errors.timeToTake.message}
								</p>
							)}
							<p
								id="timeToTake-help"
								className="text-sm text-muted-foreground"
							>
								{t("ticketSettings.timeHelper")}
							</p>
						</div>
					</div>
				</form>

				<Separator />

				<div className="rounded-md bg-muted/50 px-4 py-3 space-y-3">
					<div>
						<p className="text-sm font-medium mb-1">Est. Money Saved</p>
						<p className="text-xs text-muted-foreground">
							${watch("blendedRatePerHour") || 0}/hr × {watch("timeToTake") || 0} min × # of tickets
							{" "}= <span className="font-medium text-foreground">${((watch("blendedRatePerHour") || 0) * ((watch("timeToTake") || 0) / 60)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> per ticket
						</p>
					</div>
					<div>
						<p className="text-sm font-medium mb-1">Est. Time Saved</p>
						<p className="text-xs text-muted-foreground">
							{watch("timeToTake") || 0} min × # of tickets
						</p>
					</div>
					<p className="text-xs text-muted-foreground">
						# of tickets is determined by your ticket data per cluster. These settings update the Est. Money Saved and Est. Time Saved metrics on the dashboard and cluster pages.
					</p>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{tCommon("actions.cancel")}
					</Button>
					<Button type="submit" form={FORM_ID} disabled={!isDirty}>
						{tCommon("actions.save")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
