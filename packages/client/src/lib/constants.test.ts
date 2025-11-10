/**
 * constants.test.ts - Unit tests for file validation utilities
 */

import { describe, expect, it } from "vitest";
import {
	getFileTypeErrorMessage,
	isValidFileType,
	validateFileForUpload,
} from "./constants";

describe("File Validation Utilities", () => {
	describe("isValidFileType", () => {
		it("returns true for valid PDF files", () => {
			expect(isValidFileType("document.pdf")).toBe(true);
			expect(isValidFileType("Document.PDF")).toBe(true);
		});

		it("returns true for valid DOC files", () => {
			expect(isValidFileType("document.doc")).toBe(true);
			expect(isValidFileType("document.docx")).toBe(true);
		});

		it("returns true for valid Markdown files", () => {
			expect(isValidFileType("readme.md")).toBe(true);
			expect(isValidFileType("README.MD")).toBe(true);
		});

		it("returns true for valid text files", () => {
			expect(isValidFileType("notes.txt")).toBe(true);
			expect(isValidFileType("NOTES.TXT")).toBe(true);
		});

		it("returns false for image files", () => {
			expect(isValidFileType("photo.jpg")).toBe(false);
			expect(isValidFileType("image.png")).toBe(false);
			expect(isValidFileType("graphic.gif")).toBe(false);
		});

		it("returns false for unsupported document types", () => {
			expect(isValidFileType("spreadsheet.xlsx")).toBe(false);
			expect(isValidFileType("presentation.pptx")).toBe(false);
		});

		it("returns false for files with no extension", () => {
			expect(isValidFileType("noextension")).toBe(false);
		});

		it("handles filenames with multiple dots", () => {
			expect(isValidFileType("my.document.name.pdf")).toBe(true);
			expect(isValidFileType("my.image.file.jpg")).toBe(false);
		});
	});

	describe("getFileTypeErrorMessage", () => {
		it("returns error message with file extension", () => {
			const message = getFileTypeErrorMessage("photo.jpg");
			expect(message).toContain(".jpg");
			expect(message).toContain("not supported");
		});

		it("lists supported file types", () => {
			const message = getFileTypeErrorMessage("photo.jpg");
			expect(message).toContain("PDF");
			expect(message).toContain("DOC");
			expect(message).toContain("DOCX");
			expect(message).toContain("MD");
			expect(message).toContain("TXT");
		});
	});

	describe("validateFileForUpload", () => {
		it("returns valid for supported file types", () => {
			const file = new File(["content"], "document.pdf", {
				type: "application/pdf",
			});
			const result = validateFileForUpload(file);

			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("returns invalid with error for unsupported file types", () => {
			const file = new File(["content"], "image.jpg", { type: "image/jpeg" });
			const result = validateFileForUpload(file);

			expect(result.isValid).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error?.title).toBe("Unsupported File Type");
			expect(result.error?.description).toContain(".jpg");
		});

		it("validates all supported extensions", () => {
			const supportedFiles = [
				new File([""], "doc.pdf", { type: "application/pdf" }),
				new File([""], "doc.doc", { type: "application/msword" }),
				new File([""], "doc.docx", {
					type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				}),
				new File([""], "doc.md", { type: "text/markdown" }),
				new File([""], "doc.txt", { type: "text/plain" }),
			];

			supportedFiles.forEach((file) => {
				const result = validateFileForUpload(file);
				expect(result.isValid).toBe(true);
			});
		});

		it("rejects all unsupported extensions", () => {
			const unsupportedFiles = [
				new File([""], "file.jpg", { type: "image/jpeg" }),
				new File([""], "file.png", { type: "image/png" }),
				new File([""], "file.xlsx", {
					type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				}),
			];

			unsupportedFiles.forEach((file) => {
				const result = validateFileForUpload(file);
				expect(result.isValid).toBe(false);
				expect(result.error).toBeDefined();
			});
		});
	});
});
