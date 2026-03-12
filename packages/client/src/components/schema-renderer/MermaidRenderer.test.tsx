import { render, screen } from "@testing-library/react";
import DOMPurify from "dompurify";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

// Mock mermaid
vi.mock("mermaid", () => ({
	default: {
		initialize: vi.fn(),
		render: vi.fn(),
	},
}));

import mermaid from "mermaid";
import { MermaidRenderer } from "./MermaidRenderer";

describe("MermaidRenderer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("sanitizes mermaid SVG output with DOMPurify", async () => {
		const maliciousSvg =
			'<svg><text>Hello</text><script>alert("xss")</script></svg>';
		(mermaid.render as Mock).mockResolvedValue({ svg: maliciousSvg });

		const sanitizeSpy = vi.spyOn(DOMPurify, "sanitize");

		render(<MermaidRenderer code="graph TD; A-->B" />);

		await screen.findByText("Diagram");

		expect(sanitizeSpy).toHaveBeenCalledWith(maliciousSvg, {
			USE_PROFILES: { svg: true },
		});
	});

	it("strips script tags from SVG content", async () => {
		const maliciousSvg =
			'<svg><text>Safe</text><script>alert("xss")</script></svg>';
		(mermaid.render as Mock).mockResolvedValue({ svg: maliciousSvg });

		const { container } = render(<MermaidRenderer code="graph TD; A-->B" />);

		await screen.findByText("Diagram");

		const diagramDiv = container.querySelector(".p-4");
		expect(diagramDiv?.innerHTML).not.toContain("<script>");
		expect(diagramDiv?.innerHTML).toContain("Safe");
	});

	it("strips event handlers from SVG content", async () => {
		const maliciousSvg =
			'<svg><rect onerror="alert(1)" onload="alert(2)"></rect><text>OK</text></svg>';
		(mermaid.render as Mock).mockResolvedValue({ svg: maliciousSvg });

		const { container } = render(<MermaidRenderer code="graph TD; A-->B" />);

		await screen.findByText("Diagram");

		const diagramDiv = container.querySelector(".p-4");
		expect(diagramDiv?.innerHTML).not.toContain("onerror");
		expect(diagramDiv?.innerHTML).not.toContain("onload");
	});
});
