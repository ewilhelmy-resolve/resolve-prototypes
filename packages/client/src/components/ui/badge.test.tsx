import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
	describe("Rendering", () => {
		it("renders children", () => {
			render(<Badge>Test Badge</Badge>);
			expect(screen.getByText("Test Badge")).toBeInTheDocument();
		});

		it("renders as span by default", () => {
			render(<Badge>Badge</Badge>);
			const badge = screen.getByText("Badge");
			expect(badge.tagName).toBe("SPAN");
		});

		it("has data-slot attribute", () => {
			render(<Badge>Badge</Badge>);
			expect(screen.getByText("Badge")).toHaveAttribute("data-slot", "badge");
		});
	});

	describe("Variants", () => {
		it("applies default variant styles", () => {
			render(<Badge>Default</Badge>);
			const badge = screen.getByText("Default");
			expect(badge).toHaveClass("bg-primary", "text-primary-foreground");
		});

		it("applies secondary variant styles", () => {
			render(<Badge variant="secondary">Secondary</Badge>);
			const badge = screen.getByText("Secondary");
			expect(badge).toHaveClass("bg-secondary", "text-secondary-foreground");
		});

		it("applies destructive variant styles", () => {
			render(<Badge variant="destructive">Destructive</Badge>);
			const badge = screen.getByText("Destructive");
			expect(badge).toHaveClass("bg-destructive");
		});

		it("applies outline variant styles", () => {
			render(<Badge variant="outline">Outline</Badge>);
			const badge = screen.getByText("Outline");
			expect(badge).toHaveClass("text-foreground");
		});
	});

	describe("Props", () => {
		it("applies custom className", () => {
			render(<Badge className="custom-class">Badge</Badge>);
			expect(screen.getByText("Badge")).toHaveClass("custom-class");
		});

		it("renders as child element when asChild is true", () => {
			render(
				<Badge asChild>
					<a href="/test">Link Badge</a>
				</Badge>
			);
			const badge = screen.getByRole("link");
			expect(badge).toHaveAttribute("href", "/test");
			expect(badge).toHaveAttribute("data-slot", "badge");
		});

		it("forwards ref", () => {
			const ref = { current: null };
			render(<Badge ref={ref}>Badge</Badge>);
			expect(ref.current).toBeInstanceOf(HTMLSpanElement);
		});
	});
});
