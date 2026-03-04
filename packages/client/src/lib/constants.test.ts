/**
 * constants.test.ts - Unit tests for file validation utilities
 */

import { describe, expect, it } from "vitest";
import {
	isValidFileType,
	MAX_FILE_SIZE_MB,
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

	describe("validateFileForUpload", () => {
		it("returns valid for supported file types", () => {
			const file = new File(["content"], "document.pdf", {
				type: "application/pdf",
			});
			const result = validateFileForUpload(file);

			expect(result.isValid).toBe(true);
			expect(result.errorCode).toBeUndefined();
		});

		it("returns errorCode 'unsupportedFileType' for unsupported files", () => {
			const file = new File(["content"], "image.jpg", { type: "image/jpeg" });
			const result = validateFileForUpload(file);

			expect(result.isValid).toBe(false);
			expect(result.errorCode).toBe("unsupportedFileType");
			expect(result.errorParams?.extension).toBe(".jpg");
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
				expect(result.errorCode).toBeDefined();
			});
		});

		it("returns errorCode 'fileTooLarge' when file exceeds MAX_FILE_SIZE_MB", () => {
			const oversizedContent = new ArrayBuffer(
				MAX_FILE_SIZE_MB * 1024 * 1024 + 1,
			);
			const file = new File([oversizedContent], "large.pdf", {
				type: "application/pdf",
			});
			const result = validateFileForUpload(file);

			expect(result.isValid).toBe(false);
			expect(result.errorCode).toBe("fileTooLarge");
			expect(result.errorParams?.maxSize).toBe(`${MAX_FILE_SIZE_MB}MB`);
		});

		it("accepts file exactly at MAX_FILE_SIZE_MB", () => {
			const exactContent = new ArrayBuffer(MAX_FILE_SIZE_MB * 1024 * 1024);
			const file = new File([exactContent], "exact.pdf", {
				type: "application/pdf",
			});
			const result = validateFileForUpload(file);

			expect(result.isValid).toBe(true);
		});

		it("checks file type before file size", () => {
			const oversizedContent = new ArrayBuffer(
				MAX_FILE_SIZE_MB * 1024 * 1024 + 1,
			);
			const file = new File([oversizedContent], "large.jpg", {
				type: "image/jpeg",
			});
			const result = validateFileForUpload(file);

			expect(result.errorCode).toBe("unsupportedFileType");
		});
	});
});
