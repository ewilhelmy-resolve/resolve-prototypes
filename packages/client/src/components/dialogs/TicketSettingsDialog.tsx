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

export interface TicketSettingsValues {
	blendedRatePerHour: number;
	avgMinutesPerTicket: number;
}

interface TicketSettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultValues?: TicketSettingsValues;
	onSave: (values: TicketSettingsValues) => void;
}

const FORM_ID = "ticket-settings-form";

const FORM_DEFAULTS: TicketSettingsValues & { timeUnit: "minutes" } = {
	blendedRatePerHour: 30,
	avgMinutesPerTicket: 12,
	timeUnit: "minutes",
};

export default function TicketSettingsDialog({
	open,
	onOpenChange,
	defaultValues,
	onSave,
}: TicketSettingsDialogProps) {
	const { t } = useTranslation("tickets");
	const { t: tCommon } = useTranslation("common");

	const ticketSettingsSchema = z.object({
		blendedRatePerHour: z.number().positive({
			message: t("ticketSettings.validation.costMustBePositive"),
		}),
		avgMinutesPerTicket: z.number().positive({
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
			blendedRatePerHour:
				defaultValues?.blendedRatePerHour ?? FORM_DEFAULTS.blendedRatePerHour,
			avgMinutesPerTicket:
				defaultValues?.avgMinutesPerTicket ?? FORM_DEFAULTS.avgMinutesPerTicket,
			timeUnit: FORM_DEFAULTS.timeUnit,
		},
		mode: "onChange",
	});

	useEffect(() => {
		if (!open) {
			const timeout = setTimeout(() => {
				reset({
					blendedRatePerHour:
						defaultValues?.blendedRatePerHour ??
						FORM_DEFAULTS.blendedRatePerHour,
					avgMinutesPerTicket:
						defaultValues?.avgMinutesPerTicket ??
						FORM_DEFAULTS.avgMinutesPerTicket,
					timeUnit: FORM_DEFAULTS.timeUnit,
				});
			}, 300);
			return () => clearTimeout(timeout);
		}
	}, [
		open,
		reset,
		defaultValues?.blendedRatePerHour,
		defaultValues?.avgMinutesPerTicket,
	]);

	const onSubmit = (data: TicketSettingsForm) => {
		onSave({
			blendedRatePerHour: data.blendedRatePerHour,
			avgMinutesPerTicket: data.avgMinutesPerTicket,
		});
		onOpenChange(false);
	};

	const rate = watch("blendedRatePerHour") || 0;
	const minutes = watch("avgMinutesPerTicket") || 0;
	const perTicketCost = rate * (minutes / 60);

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
									step="0.5"
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
							<Label htmlFor="avgMinutesPerTicket">
								{t("ticketSettings.avgMinutesPerTicket")}
							</Label>
							<div className="flex gap-2.5">
								<Input
									id="avgMinutesPerTicket"
									type="number"
									step="1"
									min="0"
									className="flex-1"
									aria-invalid={!!errors.avgMinutesPerTicket}
									aria-describedby="avgMinutesPerTicket-error avgMinutesPerTicket-help"
									{...register("avgMinutesPerTicket", {
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
										aria-label={t("ticketSettings.avgMinutesPerTicket")}
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
							{errors.avgMinutesPerTicket && (
								<p
									id="avgMinutesPerTicket-error"
									className="text-sm text-destructive"
									role="alert"
								>
									{errors.avgMinutesPerTicket.message}
								</p>
							)}
							<p
								id="avgMinutesPerTicket-help"
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
						<p className="text-sm font-medium mb-1">
							{t("ticketSettings.estMoneySaved")}
						</p>
						<p className="text-xs text-muted-foreground">
							{t("ticketSettings.calculatorFormula", {
								rate: rate.toLocaleString(undefined, {
									maximumFractionDigits: 2,
								}),
								time: minutes,
								perTicket: perTicketCost.toLocaleString(undefined, {
									maximumFractionDigits: 2,
								}),
							})}
						</p>
					</div>
					<div>
						<p className="text-sm font-medium mb-1">
							{t("ticketSettings.estTimeSaved")}
						</p>
						<p className="text-xs text-muted-foreground">
							{t("ticketSettings.timeFormula", { time: minutes })}
						</p>
					</div>
					<p className="text-xs text-muted-foreground">
						{t("ticketSettings.calculatorNote")}
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
