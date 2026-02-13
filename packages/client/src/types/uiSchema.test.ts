import { describe, expect, it } from "vitest";
import {
	type ConditionalProps,
	evaluateCondition,
	parseSchema,
	UISchemaValidator,
} from "./uiSchema";

describe("evaluateCondition", () => {
	describe("eq operator", () => {
		it("returns true when field equals value", () => {
			const condition: ConditionalProps = {
				field: "status",
				operator: "eq",
				value: "approved",
			};
			const context = { status: "approved" };
			expect(evaluateCondition(condition, context)).toBe(true);
		});

		it("returns false when field does not equal value", () => {
			const condition: ConditionalProps = {
				field: "status",
				operator: "eq",
				value: "approved",
			};
			const context = { status: "pending" };
			expect(evaluateCondition(condition, context)).toBe(false);
		});

		it("handles numeric values", () => {
			const condition: ConditionalProps = {
				field: "count",
				operator: "eq",
				value: 5,
			};
			expect(evaluateCondition(condition, { count: 5 })).toBe(true);
			expect(evaluateCondition(condition, { count: 3 })).toBe(false);
		});
	});

	describe("neq operator", () => {
		it("returns true when field does not equal value", () => {
			const condition: ConditionalProps = {
				field: "status",
				operator: "neq",
				value: "rejected",
			};
			const context = { status: "approved" };
			expect(evaluateCondition(condition, context)).toBe(true);
		});

		it("returns false when field equals value", () => {
			const condition: ConditionalProps = {
				field: "status",
				operator: "neq",
				value: "approved",
			};
			const context = { status: "approved" };
			expect(evaluateCondition(condition, context)).toBe(false);
		});
	});

	describe("exists operator", () => {
		it("returns true when field has a value", () => {
			const condition: ConditionalProps = {
				field: "name",
				operator: "exists",
			};
			expect(evaluateCondition(condition, { name: "John" })).toBe(true);
		});

		it("returns false when field is empty string", () => {
			const condition: ConditionalProps = {
				field: "name",
				operator: "exists",
			};
			expect(evaluateCondition(condition, { name: "" })).toBe(false);
		});

		it("returns false when field is undefined", () => {
			const condition: ConditionalProps = {
				field: "name",
				operator: "exists",
			};
			expect(evaluateCondition(condition, {})).toBe(false);
		});

		it("returns false when field is null", () => {
			const condition: ConditionalProps = {
				field: "name",
				operator: "exists",
			};
			expect(evaluateCondition(condition, { name: null })).toBe(false);
		});
	});

	describe("notExists operator", () => {
		it("returns true when field is undefined", () => {
			const condition: ConditionalProps = {
				field: "name",
				operator: "notExists",
			};
			expect(evaluateCondition(condition, {})).toBe(true);
		});

		it("returns true when field is empty string", () => {
			const condition: ConditionalProps = {
				field: "name",
				operator: "notExists",
			};
			expect(evaluateCondition(condition, { name: "" })).toBe(true);
		});

		it("returns true when field is null", () => {
			const condition: ConditionalProps = {
				field: "name",
				operator: "notExists",
			};
			expect(evaluateCondition(condition, { name: null })).toBe(true);
		});

		it("returns false when field has a value", () => {
			const condition: ConditionalProps = {
				field: "name",
				operator: "notExists",
			};
			expect(evaluateCondition(condition, { name: "John" })).toBe(false);
		});
	});

	describe("gt operator", () => {
		it("returns true when field is greater than value", () => {
			const condition: ConditionalProps = {
				field: "age",
				operator: "gt",
				value: 18,
			};
			expect(evaluateCondition(condition, { age: 21 })).toBe(true);
		});

		it("returns false when field equals value", () => {
			const condition: ConditionalProps = {
				field: "age",
				operator: "gt",
				value: 18,
			};
			expect(evaluateCondition(condition, { age: 18 })).toBe(false);
		});

		it("returns false when field is less than value", () => {
			const condition: ConditionalProps = {
				field: "age",
				operator: "gt",
				value: 18,
			};
			expect(evaluateCondition(condition, { age: 16 })).toBe(false);
		});

		it("handles string numbers", () => {
			const condition: ConditionalProps = {
				field: "count",
				operator: "gt",
				value: 10,
			};
			expect(evaluateCondition(condition, { count: "15" })).toBe(true);
		});
	});

	describe("lt operator", () => {
		it("returns true when field is less than value", () => {
			const condition: ConditionalProps = {
				field: "age",
				operator: "lt",
				value: 18,
			};
			expect(evaluateCondition(condition, { age: 16 })).toBe(true);
		});

		it("returns false when field equals value", () => {
			const condition: ConditionalProps = {
				field: "age",
				operator: "lt",
				value: 18,
			};
			expect(evaluateCondition(condition, { age: 18 })).toBe(false);
		});

		it("returns false when field is greater than value", () => {
			const condition: ConditionalProps = {
				field: "age",
				operator: "lt",
				value: 18,
			};
			expect(evaluateCondition(condition, { age: 21 })).toBe(false);
		});
	});

	describe("contains operator", () => {
		it("returns true when field contains value", () => {
			const condition: ConditionalProps = {
				field: "email",
				operator: "contains",
				value: "@example.com",
			};
			expect(evaluateCondition(condition, { email: "user@example.com" })).toBe(
				true,
			);
		});

		it("returns false when field does not contain value", () => {
			const condition: ConditionalProps = {
				field: "email",
				operator: "contains",
				value: "@example.com",
			};
			expect(evaluateCondition(condition, { email: "user@other.com" })).toBe(
				false,
			);
		});

		it("handles undefined field gracefully", () => {
			const condition: ConditionalProps = {
				field: "text",
				operator: "contains",
				value: "search",
			};
			expect(evaluateCondition(condition, {})).toBe(false);
		});

		it("handles null value gracefully", () => {
			const condition: ConditionalProps = {
				field: "text",
				operator: "contains",
				value: null,
			};
			expect(evaluateCondition(condition, { text: "hello null" })).toBe(true);
		});
	});

	describe("undefined condition", () => {
		it("returns true when condition is undefined", () => {
			expect(evaluateCondition(undefined, { any: "value" })).toBe(true);
		});
	});
});

describe("UISchemaValidator", () => {
	it("validates minimal schema", () => {
		const schema = {
			root: "main",
			elements: {
				main: { type: "Text", props: { text: "Hello" } },
			},
		};
		const result = UISchemaValidator.safeParse(schema);
		expect(result.success).toBe(true);
	});

	it("validates schema with children references", () => {
		const schema = {
			root: "column",
			elements: {
				column: { type: "Column", children: ["heading", "btn"] },
				heading: { type: "Text", props: { text: "Hello" } },
				btn: { type: "Button", props: { label: "Click", action: "click" } },
			},
		};
		const result = UISchemaValidator.safeParse(schema);
		expect(result.success).toBe(true);
	});

	it("validates schema with dialogs", () => {
		const schema = {
			root: "btn",
			elements: {
				btn: {
					type: "Button",
					props: { label: "Open", opensDialog: "my-dialog" },
				},
				dialogForm: {
					type: "Form",
					props: { title: "Edit", submitAction: "save" },
					children: ["nameInput"],
				},
				nameInput: {
					type: "Input",
					props: { name: "name", label: "Name" },
				},
			},
			dialogs: { "my-dialog": "dialogForm" },
			autoOpenDialog: "my-dialog",
		};
		const result = UISchemaValidator.safeParse(schema);
		expect(result.success).toBe(true);
	});

	it("rejects schema without root", () => {
		const result = UISchemaValidator.safeParse({
			elements: { main: { type: "Text" } },
		});
		expect(result.success).toBe(false);
	});

	it("rejects schema without elements", () => {
		const result = UISchemaValidator.safeParse({ root: "main" });
		expect(result.success).toBe(false);
	});

	it("rejects schema with non-string root", () => {
		const result = UISchemaValidator.safeParse({
			root: { type: "Text" },
			elements: {},
		});
		expect(result.success).toBe(false);
	});

	it("rejects schema with non-string children", () => {
		const result = UISchemaValidator.safeParse({
			root: "main",
			elements: {
				main: {
					type: "Column",
					children: [{ type: "Text", props: { text: "inline" } }],
				},
			},
		});
		expect(result.success).toBe(false);
	});
});

describe("parseSchema", () => {
	it("returns null for null/undefined input", () => {
		expect(parseSchema(null)).toBeNull();
		expect(parseSchema(undefined)).toBeNull();
	});

	it("returns null for non-object input", () => {
		expect(parseSchema("string")).toBeNull();
		expect(parseSchema(42)).toBeNull();
	});

	it("parses valid schema", () => {
		const schema = {
			root: "main",
			elements: {
				main: { type: "Text", props: { text: "Hi" } },
			},
		};
		const result = parseSchema(schema);
		expect(result).not.toBeNull();
		expect(result!.root).toBe("main");
		expect(result!.elements.main.type).toBe("Text");
		expect(result!.elements.main.props?.text).toBe("Hi");
	});

	it("parses schema with dialogs", () => {
		const schema = {
			root: "btn",
			elements: {
				btn: {
					type: "Button",
					props: { label: "Open", opensDialog: "dlg" },
				},
				form: {
					type: "Form",
					props: { title: "My Form", submitAction: "save" },
					children: ["input"],
				},
				input: {
					type: "Input",
					props: { name: "name", label: "Name" },
				},
			},
			dialogs: { dlg: "form" },
		};
		const result = parseSchema(schema);
		expect(result).not.toBeNull();
		expect(result!.dialogs?.dlg).toBe("form");
	});

	it("returns null for invalid schema (missing elements)", () => {
		expect(parseSchema({ root: "main" })).toBeNull();
	});

	it("returns null for schema with inline children (not string refs)", () => {
		const schema = {
			root: "main",
			elements: {
				main: {
					type: "Column",
					children: [{ type: "Text", props: { text: "inline" } }],
				},
			},
		};
		expect(parseSchema(schema)).toBeNull();
	});
});
