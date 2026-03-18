import { beforeEach, describe, expect, it } from "vitest";
import {
	getHostOrigin,
	resetHostOrigin,
	setHostOrigin,
} from "./hostOriginStore";

describe("hostOriginStore", () => {
	beforeEach(() => {
		resetHostOrigin();
	});

	describe("getHostOrigin", () => {
		it("returns '*' in dev mode when no origin stored", () => {
			expect(getHostOrigin()).toBe("*");
		});

		it("returns stored origin when set", () => {
			setHostOrigin("https://jarvis.example.com");
			expect(getHostOrigin()).toBe("https://jarvis.example.com");
		});
	});

	describe("setHostOrigin", () => {
		it("stores a valid origin", () => {
			setHostOrigin("https://trusted-host.com");
			expect(getHostOrigin()).toBe("https://trusted-host.com");
		});

		it("allows overwrite (latest Valkey config wins)", () => {
			setHostOrigin("https://first.com");
			setHostOrigin("https://second.com");
			expect(getHostOrigin()).toBe("https://second.com");
		});

		it("ignores empty string", () => {
			setHostOrigin("");
			expect(getHostOrigin()).toBe("*");
		});

		it("ignores 'null' string origin", () => {
			setHostOrigin("null");
			expect(getHostOrigin()).toBe("*");
		});
	});

	describe("resetHostOrigin", () => {
		it("clears stored origin", () => {
			setHostOrigin("https://jarvis.example.com");
			resetHostOrigin();
			expect(getHostOrigin()).toBe("*");
		});
	});
});
