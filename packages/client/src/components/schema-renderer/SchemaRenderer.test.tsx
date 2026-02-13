import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { UIActionPayload } from "../../types/uiSchema";
import { SchemaRenderer } from "./SchemaRenderer";

// Mock MermaidRenderer to avoid async mermaid rendering in tests
vi.mock("./MermaidRenderer", () => ({
	MermaidRenderer: ({ code, title }: { code: string; title?: string }) => (
		<div data-testid="mermaid-renderer">
			<span>{title || "Diagram"}</span>
			<pre>{code}</pre>
		</div>
	),
}));

/** Helper: build a flat-elements schema */
function schema(
	elements: Record<
		string,
		{ type: string; props?: Record<string, unknown>; children?: string[] }
	>,
	root = "main",
) {
	return { root, elements };
}

describe("SchemaRenderer", () => {
	const defaultProps = {
		messageId: "msg-123",
		conversationId: "conv-456",
	};

	describe("Schema Validation", () => {
		it("renders error for invalid schema (no elements)", () => {
			render(
				<SchemaRenderer schema={{ bad: true }} {...defaultProps} />,
			);
			expect(screen.getByText(/Invalid Schema/)).toBeInTheDocument();
		});

		it("renders nothing for empty Column root", () => {
			const s = schema({ main: { type: "Column", children: [] } });
			const { container } = render(
				<SchemaRenderer schema={s} {...defaultProps} />,
			);
			expect(container.querySelector(".schema-renderer")).toBeNull();
		});

		it("renders error when root references missing element", () => {
			const s = { root: "missing", elements: { other: { type: "Text" } } };
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText(/not found/)).toBeInTheDocument();
		});
	});

	describe("Text Component", () => {
		it("renders text with default variant", () => {
			const s = schema({
				main: { type: "Text", props: { content: "Hello World" } },
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Hello World")).toBeInTheDocument();
		});

		it("renders text with heading variant", () => {
			const s = schema({
				main: {
					type: "Text",
					props: { content: "Title", variant: "heading" },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			const heading = screen.getByText("Title");
			expect(heading.closest("div")).toHaveClass("text-lg", "font-semibold");
		});

		it("renders text with muted variant", () => {
			const s = schema({
				main: {
					type: "Text",
					props: { content: "Muted", variant: "muted" },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Muted").closest("div")).toHaveClass(
				"text-muted-foreground",
			);
		});

		it("applies custom className", () => {
			const s = schema({
				main: {
					type: "Text",
					props: { content: "Custom", className: "custom-class" },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Custom").closest("div")).toHaveClass(
				"custom-class",
			);
		});
	});

	describe("Text Component - Markdown Rendering", () => {
		it("renders markdown headings", () => {
			const s = schema({
				main: { type: "Text", props: { content: "### Section Title" } },
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			const h3 = screen.getByText("Section Title");
			expect(h3.tagName).toBe("H3");
			expect(h3).toHaveClass("text-base", "font-semibold");
		});

		it("renders bold text", () => {
			const s = schema({
				main: {
					type: "Text",
					props: { content: "This is **bold** text" },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			const strong = screen.getByText("bold");
			expect(strong.tagName).toBe("STRONG");
			expect(strong).toHaveClass("font-semibold");
		});

		it("renders markdown tables", () => {
			const s = schema({
				main: {
					type: "Text",
					props: {
						content:
							"| Name | Age |\n| --- | --- |\n| Alice | 30 |\n| Bob | 25 |",
					},
				},
			});
			const { container } = render(
				<SchemaRenderer schema={s} {...defaultProps} />,
			);
			const table = container.querySelector("table");
			expect(table).toBeInTheDocument();
			expect(screen.getByText("Name")).toBeInTheDocument();
			expect(screen.getByText("Alice")).toBeInTheDocument();
			const th = container.querySelector("th");
			expect(th).toHaveClass("border", "border-border");
		});

		it("renders markdown lists", () => {
			const s = schema({
				main: {
					type: "Text",
					props: { content: "- Item one\n- Item two\n- Item three" },
				},
			});
			const { container } = render(
				<SchemaRenderer schema={s} {...defaultProps} />,
			);
			const ul = container.querySelector("ul");
			expect(ul).toBeInTheDocument();
			expect(ul).toHaveClass("list-disc", "list-inside");
			expect(screen.getByText("Item one")).toBeInTheDocument();
		});
	});

	describe("Stat Component", () => {
		it("renders stat with label and value", () => {
			const s = schema({
				main: {
					type: "Stat",
					props: { label: "Total Users", value: 1234 },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Total Users")).toBeInTheDocument();
			expect(screen.getByText("1234")).toBeInTheDocument();
		});

		it("renders stat with change indicator", () => {
			const s = schema({
				main: {
					type: "Stat",
					props: {
						label: "Revenue",
						value: "$10k",
						change: "+15%",
						changeType: "positive",
					},
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("+15%")).toHaveClass("text-green-600");
		});
	});

	describe("Button Component", () => {
		it("renders button with label", () => {
			const s = schema({
				main: {
					type: "Button",
					props: { label: "Click Me", action: "submit" },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(
				screen.getByRole("button", { name: "Click Me" }),
			).toBeInTheDocument();
		});

		it("calls onAction when clicked", async () => {
			const user = userEvent.setup();
			const onAction = vi.fn();
			const s = schema({
				main: {
					type: "Button",
					props: { label: "Submit", action: "do_submit" },
				},
			});

			render(
				<SchemaRenderer
					schema={s}
					{...defaultProps}
					onAction={onAction}
				/>,
			);

			await user.click(screen.getByRole("button", { name: "Submit" }));

			expect(onAction).toHaveBeenCalledTimes(1);
			expect(onAction).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "do_submit",
					messageId: "msg-123",
					conversationId: "conv-456",
				}),
			);
		});

		it("renders disabled button", () => {
			const s = schema({
				main: {
					type: "Button",
					props: { label: "Disabled", action: "noop", disabled: true },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
		});

		it("renders button with variant", () => {
			const s = schema({
				main: {
					type: "Button",
					props: {
						label: "Delete",
						action: "delete",
						variant: "destructive",
					},
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(
				screen.getByRole("button", { name: "Delete" }),
			).toBeInTheDocument();
		});
	});

	describe("Input Component", () => {
		it("renders input with label", () => {
			const s = schema({
				main: {
					type: "Input",
					props: { name: "email", label: "Email Address" },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
		});

		it("renders input with placeholder", () => {
			const s = schema({
				main: {
					type: "Input",
					props: { name: "search", placeholder: "Search..." },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
		});

		it("updates form data on input change", async () => {
			const user = userEvent.setup();
			const s = schema({
				main: {
					type: "Input",
					props: { name: "username", label: "Username" },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			const input = screen.getByLabelText("Username");
			await user.type(input, "testuser");
			expect(input).toHaveValue("testuser");
		});

		it("renders textarea for textarea inputType", () => {
			const s = schema({
				main: {
					type: "Input",
					props: {
						name: "description",
						label: "Description",
						inputType: "textarea",
					},
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByLabelText("Description").tagName).toBe("TEXTAREA");
		});
	});

	describe("Select Component", () => {
		it("renders select with label and placeholder", () => {
			const s = schema({
				main: {
					type: "Select",
					props: {
						name: "country",
						label: "Country",
						placeholder: "Choose country",
						options: [
							{ label: "United States", value: "us" },
							{ label: "Canada", value: "ca" },
						],
					},
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Country")).toBeInTheDocument();
			expect(screen.getByRole("combobox")).toBeInTheDocument();
		});
	});

	describe("Card Component", () => {
		it("renders card with title and description", () => {
			const s = schema({
				main: {
					type: "Card",
					props: { title: "Card Title", description: "Card description" },
					children: ["content"],
				},
				content: { type: "Text", props: { content: "Card content" } },
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Card Title")).toBeInTheDocument();
			expect(screen.getByText("Card description")).toBeInTheDocument();
			expect(screen.getByText("Card content")).toBeInTheDocument();
		});

		it("renders card without header when no title/description", () => {
			const s = schema({
				main: { type: "Card", children: ["content"] },
				content: { type: "Text", props: { content: "Just content" } },
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Just content")).toBeInTheDocument();
		});
	});

	describe("Row Component", () => {
		it("renders children horizontally", () => {
			const s = schema({
				main: { type: "Row", children: ["left", "right"] },
				left: { type: "Text", props: { content: "Left" } },
				right: { type: "Text", props: { content: "Right" } },
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Left")).toBeInTheDocument();
			expect(screen.getByText("Right")).toBeInTheDocument();
		});
	});

	describe("Column Component", () => {
		it("renders children vertically", () => {
			const s = schema(
				{
					col: { type: "Column", children: ["top", "bottom"] },
					top: { type: "Text", props: { content: "Top" } },
					bottom: { type: "Text", props: { content: "Bottom" } },
				},
				"col",
			);
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Top")).toBeInTheDocument();
			expect(screen.getByText("Bottom")).toBeInTheDocument();
		});
	});

	describe("Form Component", () => {
		it("submits form data on submit", async () => {
			const user = userEvent.setup();
			const onAction = vi.fn();
			const s = schema({
				main: {
					type: "Form",
					props: { submitAction: "submit_form", submitLabel: "Send" },
					children: ["nameInput"],
				},
				nameInput: {
					type: "Input",
					props: { name: "name", label: "Name" },
				},
			});

			render(
				<SchemaRenderer
					schema={s}
					{...defaultProps}
					onAction={onAction}
				/>,
			);

			await user.type(screen.getByLabelText("Name"), "John Doe");
			await user.click(screen.getByRole("button", { name: "Send" }));

			expect(onAction).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "submit_form",
					data: { name: "John Doe" },
				}),
			);
		});

		it("uses default submit label when not specified", () => {
			const s = schema({
				main: {
					type: "Form",
					props: { submitAction: "submit" },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(
				screen.getByRole("button", { name: "Submit" }),
			).toBeInTheDocument();
		});
	});

	describe("Table Component", () => {
		it("renders table with columns and rows", () => {
			const s = schema({
				main: {
					type: "Table",
					props: {
						columns: [
							{ key: "name", label: "Name" },
							{ key: "age", label: "Age" },
						],
						rows: [
							{ name: "Alice", age: 30 },
							{ name: "Bob", age: 25 },
						],
					},
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Name")).toBeInTheDocument();
			expect(screen.getByText("Age")).toBeInTheDocument();
			expect(screen.getByText("Alice")).toBeInTheDocument();
			expect(screen.getByText("30")).toBeInTheDocument();
			expect(screen.getByText("Bob")).toBeInTheDocument();
			expect(screen.getByText("25")).toBeInTheDocument();
		});
	});

	describe("Diagram Component", () => {
		it("renders MermaidRenderer with code and title", () => {
			const s = schema({
				main: {
					type: "Diagram",
					props: { code: "graph TD; A-->B;", title: "Flow Chart" },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByTestId("mermaid-renderer")).toBeInTheDocument();
			expect(screen.getByText("Flow Chart")).toBeInTheDocument();
			expect(screen.getByText("graph TD; A-->B;")).toBeInTheDocument();
		});
	});

	describe("Conditional Rendering", () => {
		it("shows component when eq condition is met via input", async () => {
			const user = userEvent.setup();
			const s = schema(
				{
					col: { type: "Column", children: ["typeInput", "condText"] },
					typeInput: {
						type: "Input",
						props: { name: "type", label: "Type" },
					},
					condText: {
						type: "Text",
						props: {
							content: "You typed hello",
							if: { field: "type", operator: "eq", value: "hello" },
						},
					},
				},
				"col",
			);

			render(<SchemaRenderer schema={s} {...defaultProps} />);

			expect(screen.queryByText("You typed hello")).not.toBeInTheDocument();
			await user.type(screen.getByLabelText("Type"), "hello");
			expect(screen.getByText("You typed hello")).toBeInTheDocument();
		});

		it("hides component when exists condition is false", () => {
			const s = schema({
				main: {
					type: "Text",
					props: {
						content: "Has value",
						if: { field: "name", operator: "exists" },
					},
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.queryByText("Has value")).not.toBeInTheDocument();
		});

		it("shows component when notExists condition is true", () => {
			const s = schema({
				main: {
					type: "Text",
					props: {
						content: "No value yet",
						if: { field: "name", operator: "notExists" },
					},
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("No value yet")).toBeInTheDocument();
		});

		it("shows component when exists condition becomes true", async () => {
			const user = userEvent.setup();
			const s = schema(
				{
					col: { type: "Column", children: ["nameInput", "condText"] },
					nameInput: {
						type: "Input",
						props: { name: "name", label: "Name" },
					},
					condText: {
						type: "Text",
						props: {
							content: "Name entered!",
							if: { field: "name", operator: "exists" },
						},
					},
				},
				"col",
			);

			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.queryByText("Name entered!")).not.toBeInTheDocument();
			await user.type(screen.getByLabelText("Name"), "John");
			expect(screen.getByText("Name entered!")).toBeInTheDocument();
		});
	});

	describe("Action Payload", () => {
		it("includes correct metadata in action payload", async () => {
			const user = userEvent.setup();
			const onAction = vi.fn();
			const s = schema({
				main: {
					type: "Button",
					props: { label: "Test", action: "test_action" },
				},
			});

			render(
				<SchemaRenderer
					schema={s}
					messageId="test-msg"
					conversationId="test-conv"
					onAction={onAction}
				/>,
			);

			await user.click(screen.getByRole("button", { name: "Test" }));

			const payload: UIActionPayload = onAction.mock.calls[0][0];
			expect(payload.action).toBe("test_action");
			expect(payload.messageId).toBe("test-msg");
			expect(payload.conversationId).toBe("test-conv");
			expect(payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		});
	});

	describe("Unknown Component", () => {
		it("renders unknown type message for unknown component type", () => {
			const s = schema({
				main: { type: "unknown_type" },
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText(/Unknown component type/)).toBeInTheDocument();
		});
	});

	describe("Dialog Component", () => {
		it("opens dialog when button with opensDialog is clicked", async () => {
			const user = userEvent.setup();
			const s = {
				root: "btn",
				elements: {
					btn: {
						type: "Button",
						props: { label: "Open Form", opensDialog: "test-dialog" },
					},
					dialogForm: {
						type: "Form",
						props: {
							title: "Test Modal",
							description: "A test modal",
							submitAction: "save",
						},
						children: ["dialogText"],
					},
					dialogText: {
						type: "Text",
						props: { content: "Modal content" },
					},
				},
				dialogs: { "test-dialog": "dialogForm" },
			};

			render(<SchemaRenderer schema={s} {...defaultProps} />);

			expect(screen.queryByText("Test Modal")).not.toBeInTheDocument();
			await user.click(screen.getByRole("button", { name: "Open Form" }));
			expect(screen.getByText("Test Modal")).toBeInTheDocument();
			expect(screen.getByText("A test modal")).toBeInTheDocument();
			expect(screen.getByText("Modal content")).toBeInTheDocument();
		});

		it("closes dialog when cancel is clicked", async () => {
			const user = userEvent.setup();
			const s = {
				root: "btn",
				elements: {
					btn: {
						type: "Button",
						props: { label: "Open", opensDialog: "my-dialog" },
					},
					dlg: {
						type: "Form",
						props: { title: "My Modal", cancelLabel: "Close" },
					},
				},
				dialogs: { "my-dialog": "dlg" },
			};

			render(<SchemaRenderer schema={s} {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: "Open" }));
			expect(screen.getByText("My Modal")).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "Close" }));
			expect(screen.queryByText("My Modal")).not.toBeInTheDocument();
		});

		it("submits dialog form data on submit click", async () => {
			const user = userEvent.setup();
			const onAction = vi.fn();
			const s = {
				root: "btn",
				elements: {
					btn: {
						type: "Button",
						props: { label: "Edit", opensDialog: "edit-dialog" },
					},
					editForm: {
						type: "Form",
						props: {
							title: "Edit User",
							submitAction: "save-user",
							submitLabel: "Save",
						},
						children: ["usernameInput"],
					},
					usernameInput: {
						type: "Input",
						props: { name: "username", label: "Username" },
					},
				},
				dialogs: { "edit-dialog": "editForm" },
			};

			render(
				<SchemaRenderer
					schema={s}
					{...defaultProps}
					onAction={onAction}
				/>,
			);

			await user.click(screen.getByRole("button", { name: "Edit" }));
			await user.type(screen.getByLabelText("Username"), "johndoe");
			await user.click(screen.getByRole("button", { name: "Save" }));

			expect(onAction).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "save-user",
					data: { username: "johndoe" },
				}),
			);

			expect(screen.queryByText("Edit User")).not.toBeInTheDocument();
		});

		it("renders dialog with custom cancel label", async () => {
			const user = userEvent.setup();
			const s = {
				root: "btn",
				elements: {
					btn: {
						type: "Button",
						props: { label: "Open", opensDialog: "dlg" },
					},
					dlgEl: {
						type: "Form",
						props: { title: "Custom Modal", cancelLabel: "Dismiss" },
					},
				},
				dialogs: { dlg: "dlgEl" },
			};

			render(<SchemaRenderer schema={s} {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: "Open" }));
			expect(
				screen.getByRole("button", { name: "Dismiss" }),
			).toBeInTheDocument();
		});

		it("renders destructive submit button variant", async () => {
			const user = userEvent.setup();
			const s = {
				root: "btn",
				elements: {
					btn: {
						type: "Button",
						props: { label: "Delete", opensDialog: "confirm" },
					},
					confirmForm: {
						type: "Form",
						props: {
							title: "Confirm Delete",
							submitAction: "delete",
							submitLabel: "Delete",
							submitVariant: "destructive",
						},
						children: ["confirmText"],
					},
					confirmText: {
						type: "Text",
						props: { content: "Are you sure?" },
					},
				},
				dialogs: { confirm: "confirmForm" },
			};

			render(<SchemaRenderer schema={s} {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: "Delete" }));
			expect(screen.getByText("Are you sure?")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /delete/i }),
			).toBeInTheDocument();
		});

		it("resets dialog form data when reopened", async () => {
			const user = userEvent.setup();
			const onAction = vi.fn();
			const s = {
				root: "btn",
				elements: {
					btn: {
						type: "Button",
						props: { label: "Open", opensDialog: "form-dlg" },
					},
					formEl: {
						type: "Form",
						props: {
							title: "Form",
							submitAction: "submit",
							cancelLabel: "Cancel",
						},
						children: ["fieldInput"],
					},
					fieldInput: {
						type: "Input",
						props: { name: "field", label: "Field" },
					},
				},
				dialogs: { "form-dlg": "formEl" },
			};

			render(
				<SchemaRenderer
					schema={s}
					{...defaultProps}
					onAction={onAction}
				/>,
			);

			await user.click(screen.getByRole("button", { name: "Open" }));
			await user.type(screen.getByLabelText("Field"), "test value");

			await user.click(screen.getByRole("button", { name: "Cancel" }));

			await user.click(screen.getByRole("button", { name: "Open" }));
			expect(screen.getByLabelText("Field")).toHaveValue("");
		});
	});
});
