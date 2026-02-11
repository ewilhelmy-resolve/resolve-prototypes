import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InlineFormRequest } from "./InlineFormRequest";

describe("InlineFormRequest - Markdown Rendering", () => {
	const defaultProps = {
		requestId: "req-1",
		status: "pending" as const,
		onSubmit: vi.fn().mockResolvedValue(undefined),
	};

	function renderWithText(content: string) {
		return render(
			<InlineFormRequest
				{...defaultProps}
				uiSchema={{
					modals: {
						"test-modal": {
							title: "Test",
							submitAction: "submit",
							children: [{ type: "text", content }],
						},
					},
				}}
			/>,
		);
	}

	it("renders markdown headings", () => {
		renderWithText("### Section Title");
		const h3 = screen.getByText("Section Title");
		expect(h3.tagName).toBe("H3");
		expect(h3).toHaveClass("text-base", "font-semibold");
	});

	it("renders bold text", () => {
		renderWithText("This is **bold** text");
		const strong = screen.getByText("bold");
		expect(strong.tagName).toBe("STRONG");
		expect(strong).toHaveClass("font-semibold");
	});

	it("renders markdown tables", () => {
		const { container } = renderWithText(
			"| Name | Age |\n| --- | --- |\n| Alice | 30 |",
		);
		const table = container.querySelector("table");
		expect(table).toBeInTheDocument();
		expect(screen.getByText("Name")).toBeInTheDocument();
		expect(screen.getByText("Alice")).toBeInTheDocument();
		const th = container.querySelector("th");
		expect(th).toHaveClass("border", "border-border");
	});

	it("renders markdown lists", () => {
		const { container } = renderWithText("- Item one\n- Item two");
		const ul = container.querySelector("ul");
		expect(ul).toBeInTheDocument();
		expect(ul).toHaveClass("list-disc", "list-inside");
		expect(screen.getByText("Item one")).toBeInTheDocument();
	});
});
