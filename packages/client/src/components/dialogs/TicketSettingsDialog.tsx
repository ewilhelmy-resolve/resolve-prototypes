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
			costPerTicket: settingsStore.costPerTicket,
			avgTimePerTicket: settingsStore.avgTimePerTicket,
			timeUnit: FORM_DEFAULTS.timeUnit,
		},
		mode: "onChange",
	});

	useEffect(() => {
		if (!open) {
			const timeout = setTimeout(() => {
				reset({
					costPerTicket: settingsStore.costPerTicket,
					avgTimePerTicket: settingsStore.avgTimePerTicket,
					timeUnit: FORM_DEFAULTS.timeUnit,
				});
			}, 300);
			return () => clearTimeout(timeout);
		}
	}, [
		open,
		reset,
		settingsStore.costPerTicket,
		settingsStore.avgTimePerTicket,
	]);

	const onSubmit = (data: TicketSettingsForm) => {
		settingsStore.setSettings({
			costPerTicket: data.costPerTicket,
			avgTimePerTicket: data.avgTimePerTicket,
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
						<p className="text-base">{t("ticketSettings.timeSavedSection")}</p>
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
