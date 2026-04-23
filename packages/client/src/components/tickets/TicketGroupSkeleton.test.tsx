import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	TicketGroupSkeleton,
	TicketGroupSkeletonGrid,
} from "./TicketGroupSkeleton";

describe("TicketGroupSkeleton", () => {
	it("renders skeleton elements", () => {
		render(<TicketGroupSkeleton />);

		// Should have multiple skeleton elements with animate-pulse
		const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("has card styling matching TicketGroupStat", () => {
		const { container } = render(<TicketGroupSkeleton />);
		const card = container.firstChild as HTMLElement;

		expect(card).toHaveClass("rounded-lg", "border", "bg-card", "p-4");
	});

	it("renders skeleton for title area", () => {
		const { container } = render(<TicketGroupSkeleton />);

		// Title skeleton should be about 3/4 width
		const titleSkeleton = container.querySelector(".h-7.w-3\\/4");
		expect(titleSkeleton).toBeInTheDocument();
	});

	it("renders skeleton for count", () => {
		const { container } = render(<TicketGroupSkeleton />);

		// Count skeleton
		const countSkeleton = container.querySelector(".h-9.w-16");
		expect(countSkeleton).toBeInTheDocument();
	});

	it("renders skeleton for metrics area", () => {
		const { container } = render(<TicketGroupSkeleton />);

		// Metrics skeleton (gap icon placeholder)
		const metricsSkeleton = container.querySelector(".h-6.w-6.rounded-full");
		expect(metricsSkeleton).toBeInTheDocument();
	});

	it("renders skeleton for footer", () => {
		const { container } = render(<TicketGroupSkeleton />);

		// Footer skeleton
		const footerSkeleton = container.querySelector(".h-4.w-32");
		expect(footerSkeleton).toBeInTheDocument();
	});
});

describe("TicketGroupSkeletonGrid", () => {
	it("renders default 6 skeleton cards", () => {
		render(<TicketGroupSkeletonGrid />);

		const cards = document.querySelectorAll(".bg-card");
		expect(cards.length).toBe(6);
	});

	it("renders custom number of skeleton cards", () => {
		render(<TicketGroupSkeletonGrid count={3} />);

		const cards = document.querySelectorAll(".bg-card");
		expect(cards.length).toBe(3);
	});
});
