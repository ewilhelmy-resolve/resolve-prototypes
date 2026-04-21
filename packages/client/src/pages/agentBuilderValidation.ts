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
