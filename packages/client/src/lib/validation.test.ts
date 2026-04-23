import { describe, expect, it } from "vitest";
import {
	MIN_PASSWORD_LENGTH,
	PASSWORD_REGEX,
	validateEmail,
	validatePassword,
	validateRequired,
} from "./validation";

describe("validatePassword", () => {
	describe("length validation", () => {
		it("returns error for empty string", () => {
			expect(validatePassword("")).toBe(
				`Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
			);
		});

		it("returns error for password shorter than 8 chars", () => {
			expect(validatePassword("Ab1!")).toBe(
				`Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
			);
		});

		it("returns error for password of exactly 7 chars", () => {
			expect(validatePassword("Ab1!xyz")).toBe(
				`Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
			);
		});

		it("returns null for password of exactly 8 chars meeting complexity", () => {
			expect(validatePassword("Ab1!xyzw")).toBeNull();
		});

		it("trims whitespace before checking length", () => {
			expect(validatePassword("  Ab1!  ")).toBe(
				`Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
			);
		});
	});

	describe("complexity validation", () => {
		it("returns error when missing uppercase letter", () => {
			expect(validatePassword("abcd1234!")).toBe(
				"Password must contain uppercase, lowercase, number, and special character",
			);
		});

		it("returns error when missing lowercase letter", () => {
			expect(validatePassword("ABCD1234!")).toBe(
				"Password must contain uppercase, lowercase, number, and special character",
			);
		});

		it("returns error when missing digit", () => {
			expect(validatePassword("Abcdefgh!")).toBe(
				"Password must contain uppercase, lowercase, number, and special character",
			);
		});

		it("returns error when missing special character", () => {
			expect(validatePassword("Abcd1234")).toBe(
				"Password must contain uppercase, lowercase, number, and special character",
			);
		});

		it("returns null for valid password with all requirements", () => {
			expect(validatePassword("StrongP@ss1")).toBeNull();
		});
	});

	describe("special character acceptance", () => {
		it("accepts underscore as special character", () => {
			expect(validatePassword("Test1_abc")).toBeNull();
		});

		it("accepts hyphen as special character", () => {
			expect(validatePassword("Test1-abc")).toBeNull();
		});

		it("accepts tilde as special character", () => {
			expect(validatePassword("Test1~abc")).toBeNull();
		});

		it("accepts caret as special character", () => {
			expect(validatePassword("Test1^abc")).toBeNull();
		});

		it("accepts parentheses as special character", () => {
			expect(validatePassword("Test1(abc)")).toBeNull();
		});

		it("accepts brackets as special character", () => {
			expect(validatePassword("Test1[abc]")).toBeNull();
		});

		it("accepts curly braces as special character", () => {
			expect(validatePassword("Test1{abc}")).toBeNull();
		});

		it("accepts pipe as special character", () => {
			expect(validatePassword("Test1|abcd")).toBeNull();
		});

		it("accepts backslash as special character", () => {
			expect(validatePassword("Test1\\abc")).toBeNull();
		});

		it("accepts forward slash as special character", () => {
			expect(validatePassword("Test1/abcd")).toBeNull();
		});

		it("accepts colon as special character", () => {
			expect(validatePassword("Test1:abcd")).toBeNull();
		});

		it("accepts semicolon as special character", () => {
			expect(validatePassword("Test1;abcd")).toBeNull();
		});

		it("accepts plus as special character", () => {
			expect(validatePassword("Test1+abc")).toBeNull();
		});

		it("accepts equals as special character", () => {
			expect(validatePassword("Test1=abc")).toBeNull();
		});

		it("accepts comma as special character", () => {
			expect(validatePassword("Test1,abcd")).toBeNull();
		});

		it("still accepts original special chars (@$!%*?&#.)", () => {
			expect(validatePassword("Test1@abc")).toBeNull();
			expect(validatePassword("Test1$abc")).toBeNull();
			expect(validatePassword("Test1!abc")).toBeNull();
			expect(validatePassword("Test1%abc")).toBeNull();
			expect(validatePassword("Test1*abc")).toBeNull();
			expect(validatePassword("Test1?abc")).toBeNull();
			expect(validatePassword("Test1&abc")).toBeNull();
			expect(validatePassword("Test1#abc")).toBeNull();
			expect(validatePassword("Test1.abc")).toBeNull();
		});
	});

	describe("whitespace handling", () => {
		it("returns error for password that is only spaces", () => {
			expect(validatePassword("          ")).toBe(
				`Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
			);
		});
	});
});

describe("PASSWORD_REGEX", () => {
	it("matches password with underscore", () => {
		expect(PASSWORD_REGEX.test("Test1_abc")).toBe(true);
	});

	it("does not match password without special character", () => {
		expect(PASSWORD_REGEX.test("Test1abcd")).toBe(false);
	});

	it("does not match password with only whitespace", () => {
		expect(PASSWORD_REGEX.test("        ")).toBe(false);
	});
});

describe("validateEmail", () => {
	it("returns null for valid email", () => {
		expect(validateEmail("user@example.com")).toBeNull();
	});

	it("returns error for empty email", () => {
		expect(validateEmail("")).toBe("Email is required");
	});

	it("returns error for invalid email format", () => {
		expect(validateEmail("notanemail")).toBe(
			"Please enter a valid email address",
		);
	});
});

describe("validateRequired", () => {
	it("returns null for non-empty value", () => {
		expect(validateRequired("John", "First name")).toBeNull();
	});

	it("returns error for empty value", () => {
		expect(validateRequired("", "First name")).toBe("First name is required");
	});

	it("returns error for whitespace-only value", () => {
		expect(validateRequired("   ", "First name")).toBe(
			"First name is required",
		);
	});
});
