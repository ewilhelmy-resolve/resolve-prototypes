import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { UIActionPayload, UISchema } from "../../types/uiSchema";
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

describe("SchemaRenderer", () => {
	const defaultProps = {
		messageId: "msg-123",
		conversationId: "conv-456",
	};

	describe("Schema Validation", () => {
		it("renders error for invalid schema", () => {
			const invalidSchema = {
				version: "1",
				components: [{ type: "invalid", content: "test" }],
			} as unknown as UISchema;

			render(<SchemaRenderer schema={invalidSchema} {...defaultProps} />);

			expect(screen.getByText("Invalid Schema")).toBeInTheDocument();
			expect(
				screen.getByText("The UI schema failed validation"),
			).toBeInTheDocument();
		});

		it("renders nothing for empty components array", () => {
			const emptySchema: UISchema = { version: "1", components: [] };
			const { container } = render(
				<SchemaRenderer schema={emptySchema} {...defaultProps} />,
			);

			expect(container.querySelector(".schema-renderer")).toBeNull();
		});
	});

	describe("Text Component", () => {
		it("renders text with default variant", () => {
			const schema: UISchema = {
				version: "1",
				components: [{ type: "text", content: "Hello World" }],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);
			expect(screen.getByText("Hello World")).toBeInTheDocument();
		});

		it("renders text with heading variant", () => {
			const schema: UISchema = {
				version: "1",
				components: [{ type: "text", content: "Title", variant: "heading" }],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);
			const heading = screen.getByText("Title");
			expect(heading).toHaveClass("text-lg", "font-semibold");
		});

		it("renders text with muted variant", () => {
			const schema: UISchema = {
				version: "1",
				components: [{ type: "text", content: "Muted", variant: "muted" }],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);
			expect(screen.getByText("Muted")).toHaveClass("text-muted-foreground");
		});

		it("applies custom className", () => {
			const schema: UISchema = {
				version: "1",
				components: [
					{ type: "text", content: "Custom", className: "custom-class" },
				],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);
			expect(screen.getByText("Custom")).toHaveClass("custom-class");
		});
	});

	describe("Stat Component", () => {
		it("renders stat with label and value", () => {
			const schema: UISchema = {
				version: "1",
				components: [{ type: "stat", label: "Total Users", value: 1234 }],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);
			expect(screen.getByText("Total Users")).toBeInTheDocument();
			expect(screen.getByText("1234")).toBeInTheDocument();
		});

		it("renders stat with change indicator", () => {
			const schema: UISchema = {
				version: "1",
				components: [
					{
						type: "stat",
						label: "Revenue",
						value: "$10k",
						change: "+15%",
						changeType: "positive",
					},
				],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);
			expect(screen.getByText("+15%")).toHaveClass("text-green-600");
		});
	});

	describe("Button Component", () => {
		it("renders button with label", () => {
			const schema: UISchema = {
				version: "1",
				components: [{ type: "button", label: "Click Me", action: "submit" }],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);
			expect(
				screen.getByRole("button", { name: "Click Me" }),
			).toBeInTheDocument();
		});

		it("calls onAction when clicked", async () => {
			const user = userEvent.setup();
			const onAction = vi.fn();
			const schema: UISchema = {
				version: "1",
				components: [{ type: "button", label: "Submit", action: "do_submit" }],
			};

			render(
				<SchemaRenderer
					schema={schema}
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
			const schema: UISchema = {
				version: "1",
				components: [
					{ type: "button", label: "Disabled", action: "noop", disabled: true },
				],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);
			expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
		});

		it("renders button with variant", () => {
			const schema: UISchema = {
				version: "1",
				components: [
					{
						type: "button",
						label: "Delete",
						action: "delete",
						variant: "destructive",
					},
				],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);
			// Just verify it renders - variant classes are applied by shadcn
			expect(
				screen.getByRole("button", { name: "Delete" }),
			).toBeInTheDocument();
		});
	});

	describe("Input Component", () => {
		it("renders input with label", () => {
			const schema: UISchema = {
				version: "1",
				components: [{ type: "input", name: "email", label: "Email Address" }],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);
			expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
		});

		it("renders input with placeholder", () => {
			const schema: UISchema = {
				version: "1",
				components: [
					{
						type: "input",
						name: "search",
						placeholder: "Search...",
					},
				],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);
			expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
		});

		it("updates form data on input change", async () => {
			const user = userEvent.setup();
			const schema: UISchema = {
				version: "1",
				components: [{ type: "input", name: "username", label: "Username" }],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);
			const input = screen.getByLabelText("Username");
			await user.type(input, "testuser");

			expect(input).toHaveValue("testuser");
		});

		it("renders textarea for textarea inputType", () => {
			const schema: UISchema = {
				version: "1",
				components: [
					{
						type: "input",
						name: "description",
						label: "Description",
						inputType: "textarea",
					},
				],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);
			expect(screen.getByLabelText("Description").tagName).toBe("TEXTAREA");
		});
	});

	describe("Select Component", () => {
		it("renders select with label and placeholder", () => {
			const schema: UISchema = {
				version: "1",
				components: [
					{
						type: "select",
						name: "country",
						label: "Country",
						placeholder: "Choose country",
						options: [
							{ label: "United States", value: "us" },
							{ label: "Canada", value: "ca" },
						],
					},
				],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);

			expect(screen.getByText("Country")).toBeInTheDocument();
			expect(screen.getByRole("combobox")).toBeInTheDocument();
		});
	});

	describe("Card Component", () => {
		it("renders card with title and description", () => {
			const schema: UISchema = {
				version: "1",
				components: [
					{
						type: "card",
						title: "Card Title",
						description: "Card description",
						children: [{ type: "text", content: "Card content" }],
					},
				],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);
			expect(screen.getByText("Card Title")).toBeInTheDocument();
			expect(screen.getByText("Card description")).toBeInTheDocument();
			expect(screen.getByText("Card content")).toBeInTheDocument();
		});

		it("renders card without header when no title/description", () => {
			const schema: UISchema = {
				version: "1",
				components: [
					{
						type: "card",
						children: [{ type: "text", content: "Just content" }],
					},
				],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);
			expect(screen.getByText("Just content")).toBeInTheDocument();
		});
	});

	describe("Row Component", () => {
		it("renders children horizontally", () => {
			const schema: UISchema = {
				version: "1",
				components: [
					{
						type: "row",
						children: [
							{ type: "text", content: "Left" },
							{ type: "text", content: "Right" },
						],
					},
				],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);
			expect(screen.getByText("Left")).toBeInTheDocument();
			expect(screen.getByText("Right")).toBeInTheDocument();
		});
	});

	describe("Column Component", () => {
		it("renders children vertically", () => {
			const schema: UISchema = {
				version: "1",
				components: [
					{
						type: "column",
						children: [
							{ type: "text", content: "Top" },
							{ type: "text", content: "Bottom" },
						],
					},
				],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);
			expect(screen.getByText("Top")).toBeInTheDocument();
			expect(screen.getByText("Bottom")).toBeInTheDocument();
		});
	});

	describe("Form Component", () => {
		it("submits form data on submit", async () => {
			const user = userEvent.setup();
			const onAction = vi.fn();
			const schema: UISchema = {
				version: "1",
				components: [
					{
						type: "form",
						submitAction: "submit_form",
						submitLabel: "Send",
						children: [{ type: "input", name: "name", label: "Name" }],
					},
				],
			};

			render(
				<SchemaRenderer
					schema={schema}
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
			const schema: UISchema = {
				version: "1",
				components: [
					{
						type: "form",
						submitAction: "submit",
						children: [],
					},
				],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);
			expect(
				screen.getByRole("button", { name: "Submit" }),
			).toBeInTheDocument();
		});
	});

	describe("Table Component", () => {
		it("renders table with columns and rows", () => {
			const schema: UISchema = {
				version: "1",
				components: [
					{
						type: "table",
						columns: [
							{ key: "name", label: "Name" },
							{ key: "age", label: "Age" },
						],
						rows: [
							{ name: "Alice", age: 30 },
							{ name: "Bob", age: 25 },
						],
					},
				],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);

			// Check headers
			expect(screen.getByText("Name")).toBeInTheDocument();
			expect(screen.getByText("Age")).toBeInTheDocument();

			// Check rows
			expect(screen.getByText("Alice")).toBeInTheDocument();
			expect(screen.getByText("30")).toBeInTheDocument();
			expect(screen.getByText("Bob")).toBeInTheDocument();
			expect(screen.getByText("25")).toBeInTheDocument();
		});
	});

	describe("Diagram Component", () => {
		it("renders MermaidRenderer with code and title", () => {
			const schema: UISchema = {
				version: "1",
				components: [
					{
						type: "diagram",
						code: "graph TD; A-->B;",
						title: "Flow Chart",
					},
				],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);

			expect(screen.getByTestId("mermaid-renderer")).toBeInTheDocument();
			expect(screen.getByText("Flow Chart")).toBeInTheDocument();
			expect(screen.getByText("graph TD; A-->B;")).toBeInTheDocument();
		});
	});

	describe("Conditional Rendering", () => {
		it("shows component when eq condition is met via input", async () => {
			const user = userEvent.setup();
			const schema: UISchema = {
				version: "1",
				components: [
					{
						type: "input",
						name: "type",
						label: "Type",
					},
					{
						type: "text",
						content: "You typed hello",
						if: { field: "type", operator: "eq", value: "hello" },
					},
				],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);

			// Initially hidden
			expect(screen.queryByText("You typed hello")).not.toBeInTheDocument();

			// Type "hello"
			await user.type(screen.getByLabelText("Type"), "hello");

			// Now visible
			expect(screen.getByText("You typed hello")).toBeInTheDocument();
		});

		it("hides component when exists condition is false", () => {
			const schema: UISchema = {
				version: "1",
				components: [
					{
						type: "text",
						content: "Has value",
						if: { field: "name", operator: "exists" },
					},
				],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);

			// No input has been filled, so field doesn't exist
			expect(screen.queryByText("Has value")).not.toBeInTheDocument();
		});

		it("shows component when notExists condition is true", () => {
			const schema: UISchema = {
				version: "1",
				components: [
					{
						type: "text",
						content: "No value yet",
						if: { field: "name", operator: "notExists" },
					},
				],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);
			expect(screen.getByText("No value yet")).toBeInTheDocument();
		});

		it("shows component when exists condition becomes true", async () => {
			const user = userEvent.setup();
			const schema: UISchema = {
				version: "1",
				components: [
					{
						type: "input",
						name: "name",
						label: "Name",
					},
					{
						type: "text",
						content: "Name entered!",
						if: { field: "name", operator: "exists" },
					},
				],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);

			// Initially hidden
			expect(screen.queryByText("Name entered!")).not.toBeInTheDocument();

			// Type something
			await user.type(screen.getByLabelText("Name"), "John");

			// Now visible
			expect(screen.getByText("Name entered!")).toBeInTheDocument();
		});
	});

	describe("Action Payload", () => {
		it("includes correct metadata in action payload", async () => {
			const user = userEvent.setup();
			const onAction = vi.fn();
			const schema: UISchema = {
				version: "1",
				components: [{ type: "button", label: "Test", action: "test_action" }],
			};

			render(
				<SchemaRenderer
					schema={schema}
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
		it("renders validation error for unknown component type", () => {
			// Intentionally testing invalid schema - cast to bypass TS checks
			const schema = {
				version: "1",
				components: [{ type: "unknown_type" }],
			} as unknown as UISchema;

			render(<SchemaRenderer schema={schema} {...defaultProps} />);
			expect(screen.getByText("Invalid Schema")).toBeInTheDocument();
		});
	});

	describe("Component IDs", () => {
		it("uses provided id for key", () => {
			const schema: UISchema = {
				version: "1",
				components: [{ type: "text", content: "Test", id: "custom-id" }],
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);

			// Component renders successfully (key is used internally)
			expect(screen.getByText("Test")).toBeInTheDocument();
		});
	});

	describe("Modal Component", () => {
		it("opens modal when button with opensModal is clicked", async () => {
			const user = userEvent.setup();
			const schema: UISchema = {
				version: "1",
				components: [
					{ type: "button", label: "Open Form", opensModal: "test-modal" },
				],
				modals: {
					"test-modal": {
						title: "Test Modal",
						description: "A test modal",
						children: [{ type: "text", content: "Modal content" }],
					},
				},
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);

			// Modal not visible initially
			expect(screen.queryByText("Test Modal")).not.toBeInTheDocument();

			// Click button to open modal
			await user.click(screen.getByRole("button", { name: "Open Form" }));

			// Modal should be visible
			expect(screen.getByText("Test Modal")).toBeInTheDocument();
			expect(screen.getByText("A test modal")).toBeInTheDocument();
			expect(screen.getByText("Modal content")).toBeInTheDocument();
		});

		it("closes modal when cancel is clicked", async () => {
			const user = userEvent.setup();
			const schema: UISchema = {
				version: "1",
				components: [{ type: "button", label: "Open", opensModal: "my-modal" }],
				modals: {
					"my-modal": {
						title: "My Modal",
						cancelLabel: "Close",
						children: [],
					},
				},
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: "Open" }));
			expect(screen.getByText("My Modal")).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "Close" }));
			expect(screen.queryByText("My Modal")).not.toBeInTheDocument();
		});

		it("submits modal form data on submit click", async () => {
			const user = userEvent.setup();
			const onAction = vi.fn();
			const schema: UISchema = {
				version: "1",
				components: [
					{ type: "button", label: "Edit", opensModal: "edit-modal" },
				],
				modals: {
					"edit-modal": {
						title: "Edit User",
						submitAction: "save-user",
						submitLabel: "Save",
						children: [{ type: "input", name: "username", label: "Username" }],
					},
				},
			};

			render(
				<SchemaRenderer
					schema={schema}
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

			// Modal should close after submit
			expect(screen.queryByText("Edit User")).not.toBeInTheDocument();
		});

		it("renders modal with custom cancel label", async () => {
			const user = userEvent.setup();
			const schema: UISchema = {
				version: "1",
				components: [{ type: "button", label: "Open", opensModal: "modal" }],
				modals: {
					modal: {
						title: "Custom Modal",
						cancelLabel: "Dismiss",
						children: [],
					},
				},
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: "Open" }));
			expect(
				screen.getByRole("button", { name: "Dismiss" }),
			).toBeInTheDocument();
		});

		it("renders destructive submit button variant", async () => {
			const user = userEvent.setup();
			const schema: UISchema = {
				version: "1",
				components: [
					{ type: "button", label: "Delete", opensModal: "confirm" },
				],
				modals: {
					confirm: {
						title: "Confirm Delete",
						submitAction: "delete",
						submitLabel: "Delete",
						submitVariant: "destructive",
						children: [{ type: "text", content: "Are you sure?" }],
					},
				},
			};

			render(<SchemaRenderer schema={schema} {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: "Delete" }));
			expect(screen.getByText("Are you sure?")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /delete/i }),
			).toBeInTheDocument();
		});

		it("resets modal form data when reopened", async () => {
			const user = userEvent.setup();
			const onAction = vi.fn();
			const schema: UISchema = {
				version: "1",
				components: [
					{ type: "button", label: "Open", opensModal: "form-modal" },
				],
				modals: {
					"form-modal": {
						title: "Form",
						submitAction: "submit",
						cancelLabel: "Cancel",
						children: [{ type: "input", name: "field", label: "Field" }],
					},
				},
			};

			render(
				<SchemaRenderer
					schema={schema}
					{...defaultProps}
					onAction={onAction}
				/>,
			);

			// Open modal and type something
			await user.click(screen.getByRole("button", { name: "Open" }));
			await user.type(screen.getByLabelText("Field"), "test value");

			// Close modal
			await user.click(screen.getByRole("button", { name: "Cancel" }));

			// Reopen modal - should be empty
			await user.click(screen.getByRole("button", { name: "Open" }));
			expect(screen.getByLabelText("Field")).toHaveValue("");
		});
	});
});
