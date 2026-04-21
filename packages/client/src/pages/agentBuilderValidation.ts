export const MIN_INSTRUCTIONS_LENGTH = 20;

export interface BuilderValidationState {
	nameTouched: boolean;
	name: string;
	instructionsTouched: boolean;
	instructions: string;
	description: string;
}

export type NameErrorCode = "required" | null;
export type InstructionsErrorCode = "required" | "tooShort" | null;

export interface BuilderValidationErrors {
	name: NameErrorCode;
	instructions: InstructionsErrorCode;
}

/**
 * Whether instructions currently block Create/Publish/Save, ignoring touch
 * state. Description can stand in when instructions are empty, but any
 * non-empty instructions must meet the minimum length.
 */
export function isInstructionsSubmitBlocked(
	instructions: string,
	description: string,
): boolean {
	const trimmed = instructions.trim();
	if (trimmed.length === 0) return description.trim().length === 0;
	return trimmed.length < MIN_INSTRUCTIONS_LENGTH;
}

export function validateBuilder(
	state: BuilderValidationState,
): BuilderValidationErrors {
	const nameEmpty = state.name.trim().length === 0;
	const instructionsTrimmed = state.instructions.trim();
	const descriptionEmpty = state.description.trim().length === 0;

	const name: NameErrorCode =
		state.nameTouched && nameEmpty ? "required" : null;

	let instructions: InstructionsErrorCode = null;
	if (state.instructionsTouched) {
		if (instructionsTrimmed.length === 0) {
			instructions = descriptionEmpty ? "required" : null;
		} else if (instructionsTrimmed.length < MIN_INSTRUCTIONS_LENGTH) {
			instructions = "tooShort";
		}
	}

	return { name, instructions };
}
