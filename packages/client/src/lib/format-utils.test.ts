import { describe, expect, it } from "vitest";
import {
	calculateEstMoneySaved,
	calculateEstTimeSavedMinutes,
	formatMoneySaved,
	formatTimeSaved,
} from "./format-utils";

describe("formatTimeSaved", () => {
	it("returns 0min for zero", () => {
		expect(formatTimeSaved(0)).toBe("0min");
	});

	it("returns minutes for values under 60", () => {
		expect(formatTimeSaved(30)).toBe("30min");
		expect(formatTimeSaved(59)).toBe("59min");
	});

	it("returns whole hours without decimal", () => {
		expect(formatTimeSaved(60)).toBe("1hr");
		expect(formatTimeSaved(120)).toBe("2hr");
	});

	it("returns fractional hours with one decimal", () => {
		expect(formatTimeSaved(90)).toBe("1.5hr");
		expect(formatTimeSaved(150)).toBe("2.5hr");
	});

	it("rounds minutes to nearest integer", () => {
		expect(formatTimeSaved(29.6)).toBe("30min");
	});
});

describe("formatMoneySaved", () => {
	it("returns $0 for zero", () => {
		expect(formatMoneySaved(0)).toBe("$0");
	});

	it("returns whole dollars under $1000", () => {
		expect(formatMoneySaved(500)).toBe("$500");
		expect(formatMoneySaved(999)).toBe("$999");
	});

	it("returns k suffix at $1000+", () => {
		expect(formatMoneySaved(1000)).toBe("$1.0k");
		expect(formatMoneySaved(1500)).toBe("$1.5k");
		expect(formatMoneySaved(25000)).toBe("$25.0k");
	});

	it("rounds small amounts to nearest integer", () => {
		expect(formatMoneySaved(123.7)).toBe("$124");
	});
});

describe("calculateEstMoneySaved", () => {
	it("computes rate × (avgMin / 60) × tickets", () => {
		// $25/hr × (15min / 60) × 200 tickets = $1,250
		expect(calculateEstMoneySaved(25, 15, 200)).toBe(1250);
	});

	it("returns 0 when ticket count is 0", () => {
		expect(calculateEstMoneySaved(30, 12, 0)).toBe(0);
	});
});

describe("calculateEstTimeSavedMinutes", () => {
	it("computes avgMin × tickets", () => {
		expect(calculateEstTimeSavedMinutes(15, 200)).toBe(3000);
	});

	it("returns 0 when ticket count is 0", () => {
		expect(calculateEstTimeSavedMinutes(12, 0)).toBe(0);
	});
});
