import { describe, expect, it } from "vitest";

/**
 * Validation rules for AgentBuilderPage fields.
 * Tests drive the validation logic extracted from the page.
 */

interface BuilderValidation {
	nameTouched: boolean;
	name: string;
	instructionsTouched: boolean;
	instructions: string;
	description: string;
}

function validateBuilder(state: BuilderValidation) {
	const errors: Record<string, string | null> = {};

	// Name: required after interaction
	errors.name =
		state.nameTouched && state.name.trim().length === 0
			? "Agent name is required"
			: null;

	// Instructions: required when description is also empty, after interaction
	errors.instructions =
		state.instructionsTouched &&
		state.instructions.trim().length === 0 &&
		state.description.trim().length === 0
			? "Instructions or description is required to publish"
			: null;

	return errors;
}

describe("AgentBuilder validation", () => {
	describe("name field", () => {
		it("shows no error before interaction", () => {
			const errors = validateBuilder({
				nameTouched: false,
				name: "",
				instructionsTouched: false,
				instructions: "",
				description: "",
			});
			expect(errors.name).toBeNull();
		});

		it("shows required error when touched and empty", () => {
			const errors = validateBuilder({
				nameTouched: true,
				name: "",
				instructionsTouched: false,
				instructions: "",
				description: "",
			});
			expect(errors.name).toBe("Agent name is required");
		});

		it("shows no error when touched and filled", () => {
			const errors = validateBuilder({
				nameTouched: true,
				name: "My Agent",
				instructionsTouched: false,
				instructions: "",
				description: "",
			});
			expect(errors.name).toBeNull();
		});
	});

	describe("instructions field", () => {
		it("shows no error before interaction", () => {
			const errors = validateBuilder({
				nameTouched: false,
				name: "",
				instructionsTouched: false,
				instructions: "",
				description: "",
			});
			expect(errors.instructions).toBeNull();
		});

		it("shows error when touched, empty, and description is also empty", () => {
			const errors = validateBuilder({
				nameTouched: false,
				name: "",
				instructionsTouched: true,
				instructions: "",
				description: "",
			});
			expect(errors.instructions).toBe(
				"Instructions or description is required to publish",
			);
		});

		it("shows no error when touched and empty but description has content", () => {
			const errors = validateBuilder({
				nameTouched: false,
				name: "",
				instructionsTouched: true,
				instructions: "",
				description: "Some description",
			});
			expect(errors.instructions).toBeNull();
		});

		it("shows no error when touched and has content", () => {
			const errors = validateBuilder({
				nameTouched: false,
				name: "",
				instructionsTouched: true,
				instructions: "## Role\nYou are a helpful agent",
				description: "",
			});
			expect(errors.instructions).toBeNull();
		});
	});
});
