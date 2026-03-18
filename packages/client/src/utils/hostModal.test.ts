import { describe, expect, it } from "vitest";
import { escapeHtml, renderFormField } from "./hostModal";

describe("hostModal - XSS prevention", () => {
	describe("escapeHtml", () => {
		it("escapes < and > to prevent tag injection", () => {
			expect(escapeHtml('<script>alert("xss")</script>')).toBe(
				"&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
			);
		});

		it("escapes & to prevent entity injection", () => {
			expect(escapeHtml("foo & bar")).toBe("foo &amp; bar");
		});

		it("escapes double quotes for attribute context", () => {
			expect(escapeHtml('"value"')).toBe("&quot;value&quot;");
		});

		it("escapes single quotes for attribute context", () => {
			expect(escapeHtml("it's")).toBe("it&#039;s");
		});

		it("returns safe strings unchanged", () => {
			expect(escapeHtml("Hello World")).toBe("Hello World");
		});
	});

	describe("renderFormField - XSS prevention", () => {
		it("escapes script payload in field label", () => {
			const html = renderFormField({
				type: "text",
				name: "email",
				label: '<script>alert("xss")</script>',
			});
			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;script&gt;");
		});

		it("escapes script payload in field placeholder attribute", () => {
			const html = renderFormField({
				type: "text",
				name: "email",
				placeholder: '"><script>alert(1)</script>',
			});
			expect(html).not.toContain("<script>");
		});

		it("escapes script payload in field defaultValue attribute", () => {
			const html = renderFormField({
				type: "text",
				name: "email",
				defaultValue: '"><script>alert(1)</script>',
			});
			expect(html).not.toContain("<script>");
		});

		it("escapes script payload in select option label", () => {
			const html = renderFormField({
				type: "select",
				name: "priority",
				options: [{ label: '<script>alert("xss")</script>', value: "high" }],
			});
			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;script&gt;");
		});

		it("escapes script payload in select option value attribute", () => {
			const html = renderFormField({
				type: "select",
				name: "priority",
				options: [{ label: "High", value: '"><script>alert(1)</script>' }],
			});
			expect(html).not.toContain("<script>");
		});

		it("escapes script payload in textarea defaultValue", () => {
			const html = renderFormField({
				type: "textarea",
				name: "notes",
				defaultValue: "</textarea><script>alert(1)</script>",
			});
			expect(html).not.toContain("<script>");
		});

		it("escapes script payload in field name used as id/name attribute", () => {
			const html = renderFormField({
				type: "text",
				name: '"><script>alert(1)</script>',
				label: "Email",
			});
			expect(html).not.toContain("<script>");
		});
	});
});
