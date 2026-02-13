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
				main: { type: "Text", props: { text: "Hello World" } },
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Hello World")).toBeInTheDocument();
		});

		it("renders text with heading variant", () => {
			const s = schema({
				main: {
					type: "Text",
					props: { text: "Title", variant: "heading" },
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
					props: { text: "Muted", variant: "muted" },
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
					props: { text: "Custom", className: "custom-class" },
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
				main: { type: "Text", props: { text: "### Section Title" } },
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
					props: { text: "This is **bold** text" },
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
						text:
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
					props: { text: "- Item one\n- Item two\n- Item three" },
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
				content: { type: "Text", props: { text: "Card content" } },
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Card Title")).toBeInTheDocument();
			expect(screen.getByText("Card description")).toBeInTheDocument();
			expect(screen.getByText("Card content")).toBeInTheDocument();
		});

		it("renders card without header when no title/description", () => {
			const s = schema({
				main: { type: "Card", children: ["content"] },
				content: { type: "Text", props: { text: "Just content" } },
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Just content")).toBeInTheDocument();
		});
	});

	describe("Row Component", () => {
		it("renders children horizontally", () => {
			const s = schema({
				main: { type: "Row", children: ["left", "right"] },
				left: { type: "Text", props: { text: "Left" } },
				right: { type: "Text", props: { text: "Right" } },
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
					top: { type: "Text", props: { text: "Top" } },
					bottom: { type: "Text", props: { text: "Bottom" } },
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
							text: "You typed hello",
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
						text: "Has value",
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
						text: "No value yet",
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
							text: "Name entered!",
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
		it("renders nothing for unknown type with no children", () => {
			const s = schema({
				main: { type: "Column", children: ["child"] },
				child: { type: "unknown_type" },
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			// Should not show error text, just render nothing
			expect(
				screen.queryByText(/Unknown component type/),
			).not.toBeInTheDocument();
		});

		it("renders children for unknown type with children", () => {
			const s = schema({
				main: { type: "CustomWidget", children: ["inner"] },
				inner: { type: "Text", props: { text: "Inner content" } },
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Inner content")).toBeInTheDocument();
		});
	});

	describe("Type Aliases", () => {
		it("renders Heading as Text with heading variant", () => {
			const s = schema({
				main: {
					type: "Heading",
					props: { text: "My Heading", variant: "heading" },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("My Heading")).toBeInTheDocument();
		});

		it("renders Paragraph as Text", () => {
			const s = schema({
				main: { type: "Paragraph", props: { text: "Para text" } },
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Para text")).toBeInTheDocument();
		});

		it("renders TextInput as Input", () => {
			const s = schema({
				main: {
					type: "TextInput",
					props: { name: "field", label: "Field" },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByLabelText("Field")).toBeInTheDocument();
		});

		it("renders Dropdown as Select", () => {
			const s = schema({
				main: {
					type: "Dropdown",
					props: {
						name: "color",
						label: "Color",
						options: [{ label: "Red", value: "red" }],
					},
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Color")).toBeInTheDocument();
		});

		it("renders Container/Box/Section/Group as Column", () => {
			for (const type of ["Container", "Box", "Section", "Group"]) {
				const s = schema({
					main: { type, children: ["child"] },
					child: { type: "Text", props: { text: `${type} child` } },
				});
				const { unmount } = render(
					<SchemaRenderer schema={s} {...defaultProps} />,
				);
				expect(screen.getByText(`${type} child`)).toBeInTheDocument();
				unmount();
			}
		});

		it("renders HStack as Row", () => {
			const s = schema({
				main: { type: "HStack", children: ["a", "b"] },
				a: { type: "Text", props: { text: "Left" } },
				b: { type: "Text", props: { text: "Right" } },
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Left")).toBeInTheDocument();
			expect(screen.getByText("Right")).toBeInTheDocument();
		});

		it("renders VStack as Column", () => {
			const s = schema({
				main: { type: "VStack", children: ["a", "b"] },
				a: { type: "Text", props: { text: "Top" } },
				b: { type: "Text", props: { text: "Bottom" } },
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Top")).toBeInTheDocument();
			expect(screen.getByText("Bottom")).toBeInTheDocument();
		});

		it("renders Divider as Separator", () => {
			const s = schema({
				main: { type: "Column", children: ["a", "div", "b"] },
				a: { type: "Text", props: { text: "Above" } },
				div: { type: "Divider" },
				b: { type: "Text", props: { text: "Below" } },
			});
			const { container } = render(
				<SchemaRenderer schema={s} {...defaultProps} />,
			);
			expect(container.querySelector("hr")).toBeInTheDocument();
		});
	});

	describe("Stack Direction", () => {
		it("renders Stack with direction=horizontal as Row", () => {
			const s = schema({
				main: {
					type: "Stack",
					props: { direction: "horizontal" },
					children: ["a", "b"],
				},
				a: { type: "Text", props: { text: "A" } },
				b: { type: "Text", props: { text: "B" } },
			});
			const { container } = render(
				<SchemaRenderer schema={s} {...defaultProps} />,
			);
			// Row renders flex-wrap, Column renders flex-col
			expect(container.querySelector(".flex-wrap")).toBeInTheDocument();
		});

		it("renders Stack with direction=vertical as Column", () => {
			const s = schema({
				main: {
					type: "Stack",
					props: { direction: "vertical" },
					children: ["a"],
				},
				a: { type: "Text", props: { text: "A" } },
			});
			const { container } = render(
				<SchemaRenderer schema={s} {...defaultProps} />,
			);
			expect(container.querySelector(".flex-col")).toBeInTheDocument();
		});
	});

	describe("String Gap Values", () => {
		it("applies numeric gap from string label", () => {
			const s = schema({
				main: {
					type: "Row",
					props: { gap: "lg" },
					children: ["a"],
				},
				a: { type: "Text", props: { text: "Gap test" } },
			});
			const { container } = render(
				<SchemaRenderer schema={s} {...defaultProps} />,
			);
			const row = container.querySelector(".flex-wrap");
			expect(row).toHaveStyle({ gap: "16px" });
		});

		it("defaults unknown string gap to 12", () => {
			const s = schema(
				{
					root: { type: "Row", children: ["col"] },
					col: {
						type: "Column",
						props: { gap: "unknown" },
						children: ["a"],
					},
					a: { type: "Text", props: { text: "Gap test" } },
				},
				"root",
			);
			const { container } = render(
				<SchemaRenderer schema={s} {...defaultProps} />,
			);
			const col = container.querySelector(".flex-col");
			expect(col).toHaveStyle({ gap: "12px" });
		});
	});

	describe("Button Variant Aliases", () => {
		it("maps primary variant to default", () => {
			const s = schema({
				main: {
					type: "Button",
					props: { label: "Primary", variant: "primary", action: "x" },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(
				screen.getByRole("button", { name: "Primary" }),
			).toBeInTheDocument();
		});

		it("maps danger variant to destructive", () => {
			const s = schema({
				main: {
					type: "Button",
					props: { label: "Danger", variant: "danger", action: "x" },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(
				screen.getByRole("button", { name: "Danger" }),
			).toBeInTheDocument();
		});
	});

	describe("Input type prop fallback", () => {
		it("uses type prop as fallback for inputType", () => {
			const s = schema({
				main: {
					type: "Input",
					props: { name: "pw", label: "Password", type: "password" },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByLabelText("Password")).toHaveAttribute(
				"type",
				"password",
			);
		});
	});

	describe("on Event Props", () => {
		it("reads action from on.press.action", async () => {
			const user = userEvent.setup();
			const onAction = vi.fn();
			const s = {
				root: "main",
				elements: {
					main: {
						type: "Button",
						props: { label: "Press" },
						on: { press: { action: "pressed_action" } },
					},
				},
			};
			render(
				<SchemaRenderer
					schema={s}
					{...defaultProps}
					onAction={onAction}
				/>,
			);
			await user.click(screen.getByRole("button", { name: "Press" }));
			expect(onAction).toHaveBeenCalledWith(
				expect.objectContaining({ action: "pressed_action" }),
			);
		});

		it("reads action from on.click.action", async () => {
			const user = userEvent.setup();
			const onAction = vi.fn();
			const s = {
				root: "main",
				elements: {
					main: {
						type: "Button",
						props: { label: "Click" },
						on: { click: { action: "clicked_action" } },
					},
				},
			};
			render(
				<SchemaRenderer
					schema={s}
					{...defaultProps}
					onAction={onAction}
				/>,
			);
			await user.click(screen.getByRole("button", { name: "Click" }));
			expect(onAction).toHaveBeenCalledWith(
				expect.objectContaining({ action: "clicked_action" }),
			);
		});
	});

	describe("Visible Conditional", () => {
		it("hides element when visible condition fails", () => {
			const s = {
				root: "main",
				elements: {
					main: {
						type: "Text",
						props: { text: "Hidden" },
						visible: {
							path: "$data.form.isDirty",
							operator: "eq",
							value: "true",
						},
					},
				},
			};
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
		});
	});

	describe("Image Component", () => {
		it("renders image with src and alt", () => {
			const s = schema({
				main: {
					type: "Image",
					props: { src: "https://example.com/img.png", alt: "Test image" },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			const img = screen.getByAltText("Test image");
			expect(img).toHaveAttribute("src", "https://example.com/img.png");
		});

		it("renders nothing when src is empty", () => {
			const s = schema({
				main: { type: "Image", props: { src: "" } },
			});
			const { container } = render(
				<SchemaRenderer schema={s} {...defaultProps} />,
			);
			expect(container.querySelector("img")).not.toBeInTheDocument();
		});
	});

	describe("Badge Component", () => {
		it("renders badge with text", () => {
			const s = schema({
				main: { type: "Badge", props: { text: "New" } },
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("New")).toBeInTheDocument();
		});

		it("renders badge with label prop", () => {
			const s = schema({
				main: { type: "Badge", props: { label: "Beta" } },
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Beta")).toBeInTheDocument();
		});
	});

	describe("Alert Component", () => {
		it("renders alert with title and message", () => {
			const s = schema({
				main: {
					type: "Alert",
					props: { title: "Warning", message: "Something went wrong" },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Warning")).toBeInTheDocument();
			expect(screen.getByText("Something went wrong")).toBeInTheDocument();
		});
	});

	describe("Link Component", () => {
		it("renders link with href and text", () => {
			const s = schema({
				main: {
					type: "Link",
					props: {
						href: "https://example.com",
						text: "Example",
						target: "_blank",
					},
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			const link = screen.getByText("Example");
			expect(link.closest("a")).toHaveAttribute(
				"href",
				"https://example.com",
			);
			expect(link.closest("a")).toHaveAttribute("target", "_blank");
			expect(link.closest("a")).toHaveAttribute(
				"rel",
				"noopener noreferrer",
			);
		});
	});

	describe("Progress Component", () => {
		it("renders progress with label and value", () => {
			const s = schema({
				main: {
					type: "Progress",
					props: { value: 75, max: 100, label: "Upload" },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Upload")).toBeInTheDocument();
			expect(screen.getByText("75%")).toBeInTheDocument();
		});
	});

	describe("List Component", () => {
		it("renders unordered list", () => {
			const s = schema({
				main: {
					type: "List",
					props: { items: ["Apple", "Banana", "Cherry"] },
				},
			});
			render(<SchemaRenderer schema={s} {...defaultProps} />);
			expect(screen.getByText("Apple")).toBeInTheDocument();
			expect(screen.getByText("Banana")).toBeInTheDocument();
			expect(screen.getByText("Cherry")).toBeInTheDocument();
		});

		it("renders ordered list", () => {
			const s = schema({
				main: {
					type: "List",
					props: { items: ["First", "Second"], ordered: true },
				},
			});
			const { container } = render(
				<SchemaRenderer schema={s} {...defaultProps} />,
			);
			expect(container.querySelector("ol")).toBeInTheDocument();
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
						props: { text: "Modal content" },
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
						props: { text: "Are you sure?" },
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
