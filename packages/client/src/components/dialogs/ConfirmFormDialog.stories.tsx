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
	title: "Components/Overlays/Confirm Form Dialog",
	tags: ["autodocs"],
	args: {
		onConfirm: fn(),
		onClose: fn(),
		onOpenChange: fn(),
	},
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Flexible confirmation dialog with Zod form validation. Supports both simple text confirmation and complex forms with multiple inputs.",
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
	render: () => (
		<ConfirmFormDialog
			trigger={<Button variant="destructive">Delete Item</Button>}
			title="Delete Item"
			description="This action cannot be undone. This will permanently delete the item."
			validationSchema={simpleSchema}
			defaultValues={{ confirmText: "" }}
			actionLabel="Delete"
			actionVariant="destructive"
			onConfirm={fn()}
		>
			{(form) => (
				<div className="flex flex-col gap-2 py-4">
					<Label htmlFor="confirmText">
						Type <strong>delete</strong> to confirm
					</Label>
					<Input
						id="confirmText"
						placeholder="delete"
						{...form.register("confirmText")}
					/>
					{form.formState.errors.confirmText && (
						<p className="text-sm text-destructive">
							{form.formState.errors.confirmText.message as string}
						</p>
					)}
				</div>
			)}
		</ConfirmFormDialog>
	),
};

const complexSchema = z.object({
	permanent: z.boolean().refine((val) => val === true, {
		message: "You must acknowledge this is permanent",
	}),
	dataDeleted: z.boolean().refine((val) => val === true, {
		message: "You must acknowledge data deletion",
	}),
	confirmText: z.string().refine((val) => val.toLowerCase() === "delete", {
		message: "Must type 'delete' to confirm",
	}),
});

export const ComplexForm: Story = {
	render: () => (
		<ConfirmFormDialog
			trigger={<Button variant="destructive">Delete Account</Button>}
			title="Delete your account"
			description="This action cannot be undone. All your data will be permanently removed."
			validationSchema={complexSchema}
			defaultValues={{ permanent: false, dataDeleted: false, confirmText: "" }}
			actionLabel="Delete Account"
			actionVariant="destructive"
			onConfirm={fn()}
		>
			{(form) => (
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
							<label
								htmlFor="permanent"
								className="text-sm leading-none cursor-pointer"
							>
								I understand this action is permanent and cannot be undone
							</label>
						</div>
						<div className="flex items-start gap-3">
							<Checkbox
								id="dataDeleted"
								checked={form.watch("dataDeleted")}
								onCheckedChange={(checked) =>
									form.setValue("dataDeleted", checked === true, {
										shouldValidate: true,
									})
								}
							/>
							<label
								htmlFor="dataDeleted"
								className="text-sm leading-none cursor-pointer"
							>
								I understand all my data will be deleted
							</label>
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="confirmText">
							Type <strong>delete</strong> to confirm
						</Label>
						<Input
							id="confirmText"
							placeholder="delete"
							{...form.register("confirmText")}
						/>
					</div>
				</div>
			)}
		</ConfirmFormDialog>
	),
};

const renameSchema = z.object({
	name: z.string().min(1, "Name is required"),
});

export const DefaultVariant: Story = {
	render: () => (
		<ConfirmFormDialog
			trigger={<Button>Rename Item</Button>}
			title="Rename Item"
			description="Enter a new name for this item."
			validationSchema={renameSchema}
			defaultValues={{ name: "" }}
			actionLabel="Rename"
			actionVariant="default"
			onConfirm={fn()}
		>
			{(form) => (
				<div className="flex flex-col gap-2 py-4">
					<Label htmlFor="name">New name</Label>
					<Input
						id="name"
						placeholder="Enter new name"
						{...form.register("name")}
					/>
					{form.formState.errors.name && (
						<p className="text-sm text-destructive">
							{form.formState.errors.name.message as string}
						</p>
					)}
				</div>
			)}
		</ConfirmFormDialog>
	),
};

const emailSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
	reason: z.string().optional(),
});

export const WithOptionalFields: Story = {
	render: () => (
		<ConfirmFormDialog
			trigger={<Button variant="outline">Transfer Ownership</Button>}
			title="Transfer Ownership"
			description="Transfer this project to another user by email."
			validationSchema={emailSchema}
			defaultValues={{ email: "", reason: "" }}
			actionLabel="Transfer"
			actionVariant="default"
			onConfirm={fn()}
		>
			{(form) => (
				<div className="flex flex-col gap-4 py-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="email">New owner email *</Label>
						<Input
							id="email"
							type="email"
							placeholder="user@example.com"
							{...form.register("email")}
						/>
						{form.formState.errors.email && (
							<p className="text-sm text-destructive">
								{form.formState.errors.email.message as string}
							</p>
						)}
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="reason">Reason (optional)</Label>
						<Input
							id="reason"
							placeholder="Why are you transferring?"
							{...form.register("reason")}
						/>
					</div>
				</div>
			)}
		</ConfirmFormDialog>
	),
};
