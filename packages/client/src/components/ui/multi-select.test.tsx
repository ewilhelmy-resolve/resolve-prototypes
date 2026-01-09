import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MultiSelect } from "./multi-select";

// Mock scrollIntoView for cmdk
beforeAll(() => {
	Element.prototype.scrollIntoView = vi.fn();
});

describe("MultiSelect", () => {
	const simpleOptions = [
		{ label: "Option 1", value: "option1" },
		{ label: "Option 2", value: "option2" },
		{ label: "Option 3", value: "option3" },
	];

	const defaultProps = {
		options: simpleOptions,
		onValueChange: vi.fn(),
	};

	describe("Rendering", () => {
		it("renders with placeholder", () => {
			render(<MultiSelect {...defaultProps} placeholder="Select options..." />);
			expect(screen.getByText("Select options...")).toBeInTheDocument();
		});

		it("renders default placeholder", () => {
			render(<MultiSelect {...defaultProps} />);
			expect(screen.getByText("placeholders.selectOptions")).toBeInTheDocument();
		});

		it("renders as combobox", () => {
			render(<MultiSelect {...defaultProps} />);
			expect(screen.getByRole("combobox")).toBeInTheDocument();
		});

		it("has aria-expanded false when closed", () => {
			render(<MultiSelect {...defaultProps} />);
			expect(screen.getByRole("combobox")).toHaveAttribute(
				"aria-expanded",
				"false"
			);
		});
	});

	describe("Opening dropdown", () => {
		it("sets aria-expanded true when clicked", async () => {
			const user = userEvent.setup();
			render(<MultiSelect {...defaultProps} />);
			const combobox = screen.getByRole("combobox");

			await user.click(combobox);

			// The popover state should update
			await waitFor(
				() => {
					expect(combobox).toHaveAttribute("aria-expanded", "true");
				},
				{ timeout: 2000 }
			);
		});
	});

	describe("Selection", () => {
		it("shows selected values as badges", () => {
			render(
				<MultiSelect {...defaultProps} defaultValue={["option1", "option2"]} />
			);

			expect(screen.getByText("Option 1")).toBeInTheDocument();
			expect(screen.getByText("Option 2")).toBeInTheDocument();
		});

		it("removes selection when badge X is clicked", async () => {
			const user = userEvent.setup();
			const onValueChange = vi.fn();
			render(
				<MultiSelect
					{...defaultProps}
					defaultValue={["option1"]}
					onValueChange={onValueChange}
				/>
			);

			const removeBtn = screen.getByLabelText("accessibility.removeFromSelection");
			await user.click(removeBtn);

			expect(onValueChange).toHaveBeenCalledWith([]);
		});
	});

	describe("Disabled state", () => {
		it("disables combobox when disabled prop is true", () => {
			render(<MultiSelect {...defaultProps} disabled />);
			expect(screen.getByRole("combobox")).toBeDisabled();
		});

		it("applies disabled styling", () => {
			render(<MultiSelect {...defaultProps} disabled />);
			const combobox = screen.getByRole("combobox");
			expect(combobox).toHaveClass("opacity-50");
		});
	});

	describe("MaxCount", () => {
		it("shows overflow badge when selections exceed maxCount", () => {
			render(
				<MultiSelect
					{...defaultProps}
					defaultValue={["option1", "option2", "option3"]}
					maxCount={2}
				/>
			);

			expect(screen.getByText("+ 1 more")).toBeInTheDocument();
		});
	});

	describe("Clear functionality", () => {
		it("clears all selections when clear button is clicked", async () => {
			const user = userEvent.setup();
			const onValueChange = vi.fn();
			render(
				<MultiSelect
					{...defaultProps}
					defaultValue={["option1", "option2"]}
					onValueChange={onValueChange}
				/>
			);

			const clearBtn = screen.getByLabelText(
				"accessibility.clearAllSelected"
			);
			await user.click(clearBtn);

			expect(onValueChange).toHaveBeenCalledWith([]);
		});
	});

	describe("Accessibility", () => {
		it("has proper aria-label", () => {
			render(<MultiSelect {...defaultProps} />);
			expect(screen.getByRole("combobox")).toHaveAttribute(
				"aria-label",
				expect.stringContaining("Multi-select")
			);
		});

		it("has aria-haspopup attribute", () => {
			render(<MultiSelect {...defaultProps} />);
			expect(screen.getByRole("combobox")).toHaveAttribute(
				"aria-haspopup",
				"listbox"
			);
		});
	});
});
