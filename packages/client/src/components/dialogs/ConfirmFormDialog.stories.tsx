import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmFormDialog } from "./ConfirmFormDialog";

const meta: Meta<typeof ConfirmFormDialog> = {
	component: ConfirmFormDialog,
	title: "Dialogs/ConfirmFormDialog",
	tags: ["autodocs"],
	args: {
		onConfirm: fn(),
		open: true, // Default to open so dialogs are visible in Docs view
	},
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"Confirmation dialog with Zod form validation. Supports custom form content via children prop.",
			},
			story: {
				inline: false,
				iframeHeight: 400,
			},
		},
	},
};

export default meta;
type Story = StoryObj<typeof ConfirmFormDialog>;

const simpleSchema = z.object({
	confirmText: z.string().refine((val) => val.toLowerCase() === "delete", {
		message: "Must type 'delete' to confirm",
	}),
});

export const Default: Story = {
	args: {
		trigger: <Button variant="destructive">Delete Account</Button>,
		title: "Delete Account",
		description: "This action cannot be undone. Type 'delete' to confirm.",
		validationSchema: simpleSchema,
		defaultValues: { confirmText: "" },
		actionLabel: "Delete",
		actionVariant: "destructive",
		children: (
			<div className="flex flex-col gap-2 py-4">
				<Label htmlFor="confirmText">Type "delete" to confirm</Label>
				<Input id="confirmText" name="confirmText" placeholder="delete" />
			</div>
		),
	},
};

const checkboxSchema = z.object({
	acknowledge: z.boolean().refine((val) => val === true, {
		message: "You must acknowledge to continue",
	}),
});

export const WithCheckbox: Story = {
	args: {
		trigger: <Button>Submit Request</Button>,
		title: "Confirm Submission",
		description: "Please acknowledge the terms before submitting.",
		validationSchema: checkboxSchema,
		defaultValues: { acknowledge: false },
		actionLabel: "Submit",
		children: (form) => (
			<div className="flex items-start gap-3 py-4">
				<Checkbox
					id="acknowledge"
					checked={form.watch("acknowledge")}
					onCheckedChange={(checked) =>
						form.setValue("acknowledge", checked === true, {
							shouldValidate: true,
						})
					}
				/>
				<Label htmlFor="acknowledge" className="text-sm leading-relaxed">
					I acknowledge that this action cannot be undone and I have reviewed
					all the information.
				</Label>
			</div>
		),
	},
};

const complexSchema = z.object({
	permanent: z.boolean().refine((val) => val === true),
	dataLoss: z.boolean().refine((val) => val === true),
	confirmText: z.string().refine((val) => val.toLowerCase() === "delete"),
});

export const ComplexForm: Story = {
	args: {
		trigger: <Button variant="destructive">Delete Organization</Button>,
		title: "Delete Organization",
		description:
			"This will permanently delete your organization and all associated data.",
		validationSchema: complexSchema,
		defaultValues: { permanent: false, dataLoss: false, confirmText: "" },
		actionLabel: "Delete Organization",
		actionVariant: "destructive",
		children: (form) => (
			<div className="flex flex-col gap-6 py-4">
				<div className="flex flex-col gap-4">
					<div className="flex items-start gap-3">
						<Checkbox
							id="permanent"
							checked={form.watch("permanent")}
							onCheckedChange={(checked) =>
								form.setValue("permanent", checked === true, {
									shouldValidate: true,
								})
							}
						/>
						<Label htmlFor="permanent" className="text-sm">
							I understand this action is permanent
						</Label>
					</div>
					<div className="flex items-start gap-3">
						<Checkbox
							id="dataLoss"
							checked={form.watch("dataLoss")}
							onCheckedChange={(checked) =>
								form.setValue("dataLoss", checked === true, {
									shouldValidate: true,
								})
							}
						/>
						<Label htmlFor="dataLoss" className="text-sm">
							I understand all data will be lost
						</Label>
					</div>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="confirmText">Type "delete" to confirm</Label>
					<Input
						id="confirmText"
						{...form.register("confirmText")}
						placeholder="delete"
					/>
				</div>
			</div>
		),
	},
};

const renameSchema = z.object({
	newName: z.string().min(1, "Name is required").max(50, "Name too long"),
});

export const RenameForm: Story = {
	args: {
		trigger: <Button variant="outline">Rename</Button>,
		title: "Rename Item",
		description: "Enter a new name for this item.",
		validationSchema: renameSchema,
		defaultValues: { newName: "My Document" },
		actionLabel: "Rename",
		children: (form) => (
			<div className="flex flex-col gap-2 py-4">
				<Label htmlFor="newName">New name</Label>
				<Input id="newName" {...form.register("newName")} />
				{form.formState.errors.newName && (
					<p className="text-sm text-destructive">
						{form.formState.errors.newName.message as string}
					</p>
				)}
			</div>
		),
	},
};

export const ControlledOpen: Story = {
	args: {
		trigger: <Button>Open Dialog</Button>,
		title: "Controlled Dialog",
		description: "This dialog is controlled by the open prop.",
		validationSchema: z.object({ name: z.string().min(1) }),
		defaultValues: { name: "Pre-filled" },
		actionLabel: "Confirm",
		children: (form) => (
			<div className="flex flex-col gap-2 py-4">
				<Label htmlFor="name">Name</Label>
				<Input id="name" {...form.register("name")} />
			</div>
		),
	},
	parameters: {
		docs: {
			description: {
				story: "Dialog with controlled open state via the open prop",
			},
		},
	},
};
