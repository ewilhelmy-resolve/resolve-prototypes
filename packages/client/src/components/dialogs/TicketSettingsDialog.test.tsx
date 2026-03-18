import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TicketSettingsDialog from "./TicketSettingsDialog";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, params?: Record<string, unknown>) => {
			if (params) {
				return Object.entries(params).reduce(
					(str, [k, v]) => str.replace(`{{${k}}}`, String(v)),
					key,
				);
			}
			return key;
		},
	}),
}));

const defaultProps = {
	open: true,
	onOpenChange: vi.fn(),
	onSave: vi.fn(),
};

function renderDialog(
	props: Partial<Parameters<typeof TicketSettingsDialog>[0]> = {},
) {
	return render(<TicketSettingsDialog {...defaultProps} {...props} />);
}

describe("TicketSettingsDialog", () => {
	it("renders dialog with title and description when open", () => {
		renderDialog();

		expect(screen.getByText("ticketSettings.title")).toBeInTheDocument();
		expect(screen.getByText("ticketSettings.description")).toBeInTheDocument();
	});

	it("shows form labels", () => {
		renderDialog();

		expect(
			screen.getByText("ticketSettings.blendedRatePerHour"),
		).toBeInTheDocument();
		expect(
			screen.getByText("ticketSettings.avgMinutesPerTicket"),
		).toBeInTheDocument();
	});

	it("pre-fills form with provided defaultValues", () => {
		renderDialog({
			defaultValues: { blendedRatePerHour: 50, avgMinutesPerTicket: 20 },
		});

		const rateInput = screen.getByRole("spinbutton", {
			name: "ticketSettings.blendedRatePerHour",
		});
		const timeInput = screen.getByRole("spinbutton", {
			name: "ticketSettings.avgMinutesPerTicket",
		});
		expect(rateInput).toHaveValue(50);
		expect(timeInput).toHaveValue(20);
	});

	it("uses FORM_DEFAULTS when no defaultValues provided", () => {
		renderDialog();

		const rateInput = screen.getByRole("spinbutton", {
			name: "ticketSettings.blendedRatePerHour",
		});
		const timeInput = screen.getByRole("spinbutton", {
			name: "ticketSettings.avgMinutesPerTicket",
		});
		expect(rateInput).toHaveValue(30);
		expect(timeInput).toHaveValue(12);
	});

	it("disables save button when form is not dirty", () => {
		renderDialog();

		const saveBtn = screen.getByRole("button", { name: "actions.save" });
		expect(saveBtn).toBeDisabled();
	});

	it("enables save button after editing a field", async () => {
		const user = userEvent.setup();
		renderDialog();

		const rateInput = screen.getByRole("spinbutton", {
			name: "ticketSettings.blendedRatePerHour",
		});
		await user.clear(rateInput);
		await user.type(rateInput, "40");

		const saveBtn = screen.getByRole("button", { name: "actions.save" });
		expect(saveBtn).toBeEnabled();
	});

	it("calls onSave with form values on submit", async () => {
		const onSave = vi.fn();
		const user = userEvent.setup();
		renderDialog({ onSave });

		const rateInput = screen.getByRole("spinbutton", {
			name: "ticketSettings.blendedRatePerHour",
		});
		await user.clear(rateInput);
		await user.type(rateInput, "45");

		const saveBtn = screen.getByRole("button", { name: "actions.save" });
		await user.click(saveBtn);

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith({
				blendedRatePerHour: 45,
				avgMinutesPerTicket: 12,
			});
		});
	});

	it("closes dialog after save", async () => {
		const onOpenChange = vi.fn();
		const user = userEvent.setup();
		renderDialog({ onOpenChange });

		const rateInput = screen.getByRole("spinbutton", {
			name: "ticketSettings.blendedRatePerHour",
		});
		await user.clear(rateInput);
		await user.type(rateInput, "40");

		const saveBtn = screen.getByRole("button", { name: "actions.save" });
		await user.click(saveBtn);

		await waitFor(() => {
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});

	it("calls onOpenChange(false) on cancel without saving", async () => {
		const onSave = vi.fn();
		const onOpenChange = vi.fn();
		const user = userEvent.setup();
		renderDialog({ onSave, onOpenChange });

		const cancelBtn = screen.getByRole("button", { name: "actions.cancel" });
		await user.click(cancelBtn);

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(onSave).not.toHaveBeenCalled();
	});

	it("shows calculator preview section", () => {
		renderDialog();

		expect(
			screen.getByText("ticketSettings.estMoneySaved"),
		).toBeInTheDocument();
		expect(screen.getByText("ticketSettings.estTimeSaved")).toBeInTheDocument();
		expect(
			screen.getByText("ticketSettings.calculatorNote"),
		).toBeInTheDocument();
	});

	it("validates positive numbers", async () => {
		const user = userEvent.setup();
		renderDialog();

		const rateInput = screen.getByRole("spinbutton", {
			name: "ticketSettings.blendedRatePerHour",
		});
		await user.clear(rateInput);
		await user.type(rateInput, "0");

		const saveBtn = screen.getByRole("button", { name: "actions.save" });
		await user.click(saveBtn);

		await waitFor(() => {
			expect(
				screen.getByText("ticketSettings.validation.costMustBePositive"),
			).toBeInTheDocument();
		});
	});
});
