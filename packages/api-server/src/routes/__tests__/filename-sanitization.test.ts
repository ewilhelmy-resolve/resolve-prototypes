/**
 * filename-sanitization.test.ts
 *
 * Tests for filename sanitization (path traversal, null bytes)
 * and Content-Disposition header escaping in files.ts.
 */

import { describe, expect, it } from "vitest";
import {
	safeContentDisposition,
	sanitizeFilename,
} from "../../utils/filename.js";

describe("sanitizeFilename", () => {
	describe("path traversal prevention", () => {
		it("should strip relative path traversal", () => {
			expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
		});

		it("should strip Windows-style path traversal", () => {
			expect(sanitizeFilename("..\\..\\windows\\system32\\config")).toBe(
				"config",
			);
		});

		it("should strip absolute Unix paths", () => {
			expect(sanitizeFilename("/etc/shadow")).toBe("shadow");
		});

		it("should strip absolute Windows paths", () => {
			expect(sanitizeFilename("C:\\Users\\admin\\secrets.txt")).toBe(
				"secrets.txt",
			);
		});

		it("should handle nested traversal", () => {
			expect(sanitizeFilename("foo/../../../bar.txt")).toBe("bar.txt");
		});
	});

	describe("null byte removal", () => {
		it("should strip null bytes", () => {
			const result = sanitizeFilename("file\x00.txt");
			expect(result).toBe("file.txt");
			expect(result).not.toContain("\x00");
		});

		it("should strip multiple null bytes", () => {
			const result = sanitizeFilename("\x00my\x00file\x00.pdf");
			expect(result).toBe("myfile.pdf");
		});
	});

	describe("fallback for degenerate input", () => {
		it("should return 'unnamed' for empty string", () => {
			expect(sanitizeFilename("")).toBe("unnamed");
		});

		it("should return 'unnamed' for just slashes", () => {
			expect(sanitizeFilename("///")).toBe("unnamed");
		});
	});

	describe("preserves valid filenames", () => {
		it("should preserve simple filename", () => {
			expect(sanitizeFilename("report.pdf")).toBe("report.pdf");
		});

		it("should preserve filename with spaces", () => {
			expect(sanitizeFilename("my report.pdf")).toBe("my report.pdf");
		});

		it("should preserve unicode filename", () => {
			expect(sanitizeFilename("archivo-español.pdf")).toBe(
				"archivo-español.pdf",
			);
		});
	});
});

describe("safeContentDisposition", () => {
	it("should produce valid header for simple filename", () => {
		const header = safeContentDisposition("report.pdf");
		expect(header).toContain('filename="report.pdf"');
		expect(header).toContain("filename*=UTF-8''report.pdf");
	});

	it("should escape double quotes", () => {
		const header = safeContentDisposition('file"name.txt');
		expect(header).toContain('filename="file\\"name.txt"');
	});

	it("should escape backslashes", () => {
		const header = safeContentDisposition("file\\name.txt");
		expect(header).toContain('filename="file\\\\name.txt"');
	});

	it("should encode non-ASCII characters in filename*", () => {
		const header = safeContentDisposition("archivo-español.pdf");
		expect(header).toContain('filename="archivo-espa_ol.pdf"');
		expect(header).toContain("filename*=UTF-8''");
		expect(header).toContain("espa%C3%B1ol");
	});

	it("should handle filename with newlines (header injection)", () => {
		const header = safeContentDisposition("file\r\nname.txt");
		expect(header).not.toContain("\r");
		expect(header).not.toContain("\n");
	});
});
