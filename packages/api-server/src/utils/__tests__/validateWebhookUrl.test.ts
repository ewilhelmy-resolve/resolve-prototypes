/**
 * validateWebhookUrl.test.ts
 *
 * SSRF prevention tests for the URL validator used before any outbound HTTP request
 * to an actionsApiBaseUrl sourced from Valkey (untrusted external config).
 */

import { describe, expect, it } from "vitest";
import { SsrfBlockedError, validateWebhookUrl } from "../validateWebhookUrl.js";

describe("validateWebhookUrl", () => {
	// ── ACCEPT valid URLs ──────────────────────────────────────────────────────
	describe("accepts valid public URLs", () => {
		it("accepts https with public domain", () => {
			expect(() =>
				validateWebhookUrl("https://actions.example.com"),
			).not.toThrow();
		});

		it("accepts http with public domain (http allowed)", () => {
			expect(() =>
				validateWebhookUrl("http://actions.example.com"),
			).not.toThrow();
		});

		it("accepts URL with path and trailing slash stripped", () => {
			expect(() =>
				validateWebhookUrl("https://actions-api-staging.resolve.io"),
			).not.toThrow();
		});

		it("returns the original URL string on success", () => {
			const url = "https://actions.example.com";
			expect(validateWebhookUrl(url)).toBe(url);
		});
	});

	// ── REJECT invalid / non-URL strings ──────────────────────────────────────
	describe("rejects invalid URLs", () => {
		it("rejects empty string", () => {
			expect(() => validateWebhookUrl("")).toThrow(SsrfBlockedError);
		});

		it("rejects plain string (no protocol)", () => {
			expect(() => validateWebhookUrl("not-a-url")).toThrow(SsrfBlockedError);
		});

		it("rejects double-slash URL", () => {
			expect(() => validateWebhookUrl("//example.com")).toThrow(
				SsrfBlockedError,
			);
		});
	});

	// ── REJECT non-http/https protocols ───────────────────────────────────────
	describe("rejects non-http/https protocols", () => {
		it("rejects file:// protocol", () => {
			expect(() => validateWebhookUrl("file:///etc/passwd")).toThrow(
				SsrfBlockedError,
			);
		});

		it("rejects ftp:// protocol", () => {
			expect(() => validateWebhookUrl("ftp://actions.example.com")).toThrow(
				SsrfBlockedError,
			);
		});

		it("rejects javascript: protocol", () => {
			expect(() => validateWebhookUrl("javascript:alert(1)")).toThrow(
				SsrfBlockedError,
			);
		});

		it("rejects data: protocol", () => {
			expect(() => validateWebhookUrl("data:text/html,<h1>test</h1>")).toThrow(
				SsrfBlockedError,
			);
		});
	});

	// ── REJECT loopback / localhost ────────────────────────────────────────────
	describe("rejects loopback addresses", () => {
		it("rejects http://localhost", () => {
			expect(() => validateWebhookUrl("http://localhost")).toThrow(
				SsrfBlockedError,
			);
		});

		it("rejects http://localhost:5432 (postgres port)", () => {
			expect(() => validateWebhookUrl("http://localhost:5432")).toThrow(
				SsrfBlockedError,
			);
		});

		it("rejects http://127.0.0.1", () => {
			expect(() => validateWebhookUrl("http://127.0.0.1")).toThrow(
				SsrfBlockedError,
			);
		});

		it("rejects http://127.255.255.255", () => {
			expect(() => validateWebhookUrl("http://127.255.255.255")).toThrow(
				SsrfBlockedError,
			);
		});

		it("rejects http://[::1] (IPv6 loopback)", () => {
			expect(() => validateWebhookUrl("http://[::1]")).toThrow(
				SsrfBlockedError,
			);
		});

		it("rejects http://0.0.0.0", () => {
			expect(() => validateWebhookUrl("http://0.0.0.0")).toThrow(
				SsrfBlockedError,
			);
		});
	});

	// ── REJECT AWS metadata endpoint ──────────────────────────────────────────
	describe("rejects link-local / metadata IPs", () => {
		it("rejects http://169.254.169.254 (AWS metadata)", () => {
			expect(() => validateWebhookUrl("http://169.254.169.254")).toThrow(
				SsrfBlockedError,
			);
		});

		it("rejects http://169.254.0.1", () => {
			expect(() => validateWebhookUrl("http://169.254.0.1")).toThrow(
				SsrfBlockedError,
			);
		});
	});

	// ── REJECT RFC1918 private ranges ─────────────────────────────────────────
	describe("rejects RFC1918 private IP ranges", () => {
		it("rejects http://10.0.0.1", () => {
			expect(() => validateWebhookUrl("http://10.0.0.1")).toThrow(
				SsrfBlockedError,
			);
		});

		it("rejects http://10.255.255.255", () => {
			expect(() => validateWebhookUrl("http://10.255.255.255")).toThrow(
				SsrfBlockedError,
			);
		});

		it("rejects http://172.16.0.1", () => {
			expect(() => validateWebhookUrl("http://172.16.0.1")).toThrow(
				SsrfBlockedError,
			);
		});

		it("rejects http://172.31.255.255", () => {
			expect(() => validateWebhookUrl("http://172.31.255.255")).toThrow(
				SsrfBlockedError,
			);
		});

		it("rejects http://192.168.1.1", () => {
			expect(() => validateWebhookUrl("http://192.168.1.1")).toThrow(
				SsrfBlockedError,
			);
		});

		it("rejects http://192.168.0.1", () => {
			expect(() => validateWebhookUrl("http://192.168.0.1")).toThrow(
				SsrfBlockedError,
			);
		});
	});

	// ── Dev mode bypass ───────────────────────────────────────────────────────
	describe("dev mode bypass", () => {
		it("bypasses validation in development when skipInDev=true", () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "development";
			try {
				expect(() =>
					validateWebhookUrl("http://localhost:3001", { skipInDev: true }),
				).not.toThrow();
			} finally {
				process.env.NODE_ENV = originalEnv;
			}
		});

		it("still blocks in production even with skipInDev=true", () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "production";
			try {
				expect(() =>
					validateWebhookUrl("http://localhost:3001", { skipInDev: true }),
				).toThrow(SsrfBlockedError);
			} finally {
				process.env.NODE_ENV = originalEnv;
			}
		});

		it("blocks without skipInDev option even in development", () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "development";
			try {
				expect(() => validateWebhookUrl("http://localhost:3001")).toThrow(
					SsrfBlockedError,
				);
			} finally {
				process.env.NODE_ENV = originalEnv;
			}
		});
	});

	// ── SsrfBlockedError is an Error ──────────────────────────────────────────
	describe("SsrfBlockedError", () => {
		it("is an instance of Error", () => {
			try {
				validateWebhookUrl("http://localhost");
			} catch (err) {
				expect(err).toBeInstanceOf(Error);
				expect(err).toBeInstanceOf(SsrfBlockedError);
			}
		});

		it("error message includes the blocked reason", () => {
			try {
				validateWebhookUrl("http://127.0.0.1");
			} catch (err) {
				expect((err as Error).message).toMatch(/127\.0\.0\.1/);
			}
		});
	});
});
