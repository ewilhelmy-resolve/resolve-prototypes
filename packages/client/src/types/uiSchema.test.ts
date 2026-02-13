import { describe, expect, it } from "vitest";
import {
	type ConditionalProps,
	evaluateCondition,
	normalizeSchema,
	type UISchema,
	type UISchemaV2,
	UISchemaV2Validator,
	validateUISchema,
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

describe("validateUISchema", () => {
	it("validates a valid schema", () => {
		const schema: UISchema = {
			version: "1",
			components: [
				{ type: "text", content: "Hello" },
				{ type: "button", label: "Click", action: "submit" },
			],
		};
		const result = validateUISchema(schema);
		expect(result.valid).toBe(true);
		expect(result.data).toEqual(schema);
	});

	it("validates schema with conditional components", () => {
		const schema: UISchema = {
			version: "1",
			components: [
				{
					type: "text",
					content: "Conditional text",
					if: { field: "show", operator: "eq", value: true },
				},
			],
		};
		const result = validateUISchema(schema);
		expect(result.valid).toBe(true);
	});

	it("rejects schema with invalid component type", () => {
		const schema = {
			version: "1",
			components: [{ type: "invalid", content: "test" }],
		};
		const result = validateUISchema(schema);
		expect(result.valid).toBe(false);
		expect(result.errors).toBeDefined();
	});

	it("rejects schema with missing required props", () => {
		const schema = {
			version: "1",
			components: [{ type: "text" }], // missing content
		};
		const result = validateUISchema(schema);
		expect(result.valid).toBe(false);
	});

	it("validates nested components", () => {
		const schema: UISchema = {
			version: "1",
			components: [
				{
					type: "card",
					title: "Card Title",
					children: [
						{ type: "text", content: "Inside card" },
						{ type: "button", label: "Action", action: "do_something" },
					],
				},
			],
		};
		const result = validateUISchema(schema);
		expect(result.valid).toBe(true);
	});

	it("validates form with inputs", () => {
		const schema: UISchema = {
			version: "1",
			components: [
				{
					type: "form",
					submitAction: "submit_form",
					submitLabel: "Submit",
					children: [
						{
							type: "input",
							name: "email",
							label: "Email",
							inputType: "email",
						},
						{
							type: "select",
							name: "country",
							options: [
								{ label: "USA", value: "us" },
								{ label: "UK", value: "uk" },
							],
						},
					],
				},
			],
		};
		const result = validateUISchema(schema);
		expect(result.valid).toBe(true);
	});

	it("validates conditional operator values", () => {
		const validOperators = [
			"eq",
			"neq",
			"exists",
			"notExists",
			"gt",
			"lt",
			"contains",
		] as const;

		for (const operator of validOperators) {
			const schema: UISchema = {
				version: "1",
				components: [
					{
						type: "text",
						content: "test",
						if: { field: "test", operator, value: "value" },
					},
				],
			};
			const result = validateUISchema(schema);
			expect(result.valid).toBe(true);
		}
	});

	it("rejects invalid conditional operator", () => {
		const schema = {
			version: "1",
			components: [
				{
					type: "text",
					content: "test",
					if: { field: "test", operator: "invalid", value: "value" },
				},
			],
		};
		const result = validateUISchema(schema);
		expect(result.valid).toBe(false);
	});
});

describe("UISchemaV2Validator", () => {
	it("validates a V2 schema with root element", () => {
		const schema: UISchemaV2 = {
			root: {
				type: "Text",
				props: { content: "Hello" },
			},
		};
		const result = UISchemaV2Validator.safeParse(schema);
		expect(result.success).toBe(true);
	});

	it("validates V2 schema with nested children", () => {
		const schema: UISchemaV2 = {
			root: {
				type: "Column",
				children: [
					{ type: "Text", props: { content: "Hello" } },
					{ type: "Button", props: { label: "Click", action: "click" } },
				],
			},
		};
		const result = UISchemaV2Validator.safeParse(schema);
		expect(result.success).toBe(true);
	});

	it("validates V2 schema with dialogs", () => {
		const schema: UISchemaV2 = {
			root: {
				type: "Button",
				props: { label: "Open", opensDialog: "my-dialog" },
			},
			dialogs: {
				"my-dialog": {
					type: "Form",
					props: { title: "Edit", submitAction: "save" },
					children: [{ type: "Input", props: { name: "name", label: "Name" } }],
				},
			},
			autoOpenDialog: "my-dialog",
		};
		const result = UISchemaV2Validator.safeParse(schema);
		expect(result.success).toBe(true);
	});

	it("rejects schema without root", () => {
		const result = UISchemaV2Validator.safeParse({ dialogs: {} });
		expect(result.success).toBe(false);
	});
});

describe("normalizeSchema", () => {
	it("returns null for null/undefined input", () => {
		expect(normalizeSchema(null)).toBeNull();
		expect(normalizeSchema(undefined)).toBeNull();
	});

	it("passes through valid V2 schema", () => {
		const v2: UISchemaV2 = {
			root: { type: "Text", props: { content: "Hi" } },
		};
		const result = normalizeSchema(v2);
		expect(result).not.toBeNull();
		expect(result!.root.type).toBe("Text");
		expect(result!.root.props?.content).toBe("Hi");
	});

	it("converts V1 components format to V2", () => {
		const v1 = {
			version: "1",
			components: [
				{ type: "text", content: "Hello", variant: "heading" },
				{ type: "button", label: "Click", action: "click" },
			],
		};
		const result = normalizeSchema(v1);
		expect(result).not.toBeNull();
		expect(result!.root.type).toBe("Column");
		expect(result!.root.children).toHaveLength(2);
		expect(result!.root.children![0].type).toBe("Text");
		expect(result!.root.children![0].props?.content).toBe("Hello");
		expect(result!.root.children![1].type).toBe("Button");
		expect(result!.root.children![1].props?.label).toBe("Click");
	});

	it("converts V1 modals format to V2 Form root", () => {
		const v1 = {
			version: "1",
			modals: {
				"my-form": {
					title: "My Form",
					description: "Fill it out",
					submitAction: "save",
					submitLabel: "Save",
					children: [
						{ type: "input", name: "name", label: "Name" },
						{
							type: "select",
							name: "opt",
							label: "Option",
							options: [{ label: "A", value: "a" }],
						},
					],
				},
			},
		};
		const result = normalizeSchema(v1);
		expect(result).not.toBeNull();
		expect(result!.root.type).toBe("Form");
		expect(result!.root.props?.title).toBe("My Form");
		expect(result!.root.props?.description).toBe("Fill it out");
		expect(result!.root.props?.submitAction).toBe("save");
		expect(result!.root.children).toHaveLength(2);
		expect(result!.root.children![0].type).toBe("Input");
		expect(result!.root.children![1].type).toBe("Select");
	});

	it("maps divider to Separator", () => {
		const v1 = {
			version: "1",
			components: [{ type: "divider" }],
		};
		const result = normalizeSchema(v1);
		// Single component → becomes root directly (no Column wrapper)
		expect(result!.root.type).toBe("Separator");
	});

	it("maps textarea type to Input with inputType", () => {
		const v1 = {
			version: "1",
			components: [{ type: "textarea", name: "notes", label: "Notes" }],
		};
		const result = normalizeSchema(v1);
		// Single component → becomes root directly
		expect(result!.root.type).toBe("Input");
		expect(result!.root.props?.inputType).toBe("textarea");
	});

	it("converts modals to dialogs and opensModal to opensDialog", () => {
		const v1 = {
			version: "1",
			components: [{ type: "button", label: "Edit", opensModal: "edit-form" }],
			modals: {
				"edit-form": {
					title: "Edit",
					children: [{ type: "text", content: "Form" }],
				},
			},
		};
		const result = normalizeSchema(v1);
		// Single component → becomes root directly
		expect(result!.root.props?.opensDialog).toBe("edit-form");
		expect(result!.dialogs).toBeDefined();
		expect(result!.dialogs!["edit-form"]).toBeDefined();
	});

	it("handles text with name field as Input", () => {
		const v1 = {
			version: "1",
			modals: {
				form: {
					title: "Form",
					submitAction: "save",
					children: [
						{
							type: "text",
							name: "username",
							label: "Username",
							placeholder: "Enter name",
						},
					],
				},
			},
		};
		const result = normalizeSchema(v1);
		expect(result!.root.children![0].type).toBe("Input");
		expect(result!.root.children![0].props?.name).toBe("username");
	});
});
