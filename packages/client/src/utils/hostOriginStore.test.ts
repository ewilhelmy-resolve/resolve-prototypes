import { beforeEach, describe, expect, it, vi } from "vitest";
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

	describe("getHostOrigin (production)", () => {
		it("returns null when no origin stored in production", () => {
			const originalDev = import.meta.env.DEV;
			import.meta.env.DEV = false;
			try {
				expect(getHostOrigin()).toBeNull();
			} finally {
				import.meta.env.DEV = originalDev;
			}
		});
	});

	describe("setHostOrigin", () => {
		it("stores a valid origin", () => {
			setHostOrigin("https://trusted-host.com");
			expect(getHostOrigin()).toBe("https://trusted-host.com");
		});

		it("accepts http://localhost:5174", () => {
			setHostOrigin("http://localhost:5174");
			expect(getHostOrigin()).toBe("http://localhost:5174");
		});

		it("accepts https://jarvis.example.com", () => {
			setHostOrigin("https://jarvis.example.com");
			expect(getHostOrigin()).toBe("https://jarvis.example.com");
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

		it.each([
			["javascript:alert(1)", "javascript protocol"],
			["data:text/html,<script>", "data protocol"],
			["blob:null", "blob protocol"],
			["ftp://example.com", "ftp protocol"],
			["not-a-url", "non-URL string"],
		])("rejects %s (%s)", (origin) => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			setHostOrigin(origin);
			// Should not be stored — falls back to dev wildcard
			expect(getHostOrigin()).toBe("*");
			expect(warnSpy).toHaveBeenCalledWith(
				"[hostOriginStore] Rejected invalid origin format:",
				origin,
			);
			warnSpy.mockRestore();
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
