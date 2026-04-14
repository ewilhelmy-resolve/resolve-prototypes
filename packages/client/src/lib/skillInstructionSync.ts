/**
 * Two-way sync helpers: when skills are added/removed from config.workflows,
 * inject or remove corresponding bullets in the instructions markdown.
 */

/**
 * Find the end-of-section index for a given `## Heading`.
 * Returns the index of the next `## ` heading, or end-of-string.
 */
function sectionEndIndex(text: string, headingStart: number): number {
	const afterHeading = text.indexOf("\n", headingStart);
	if (afterHeading === -1) return text.length;

	const nextHeading = text.indexOf("\n## ", afterHeading);
	return nextHeading === -1 ? text.length : nextHeading;
}

export function addSkillToInstructions(
	instructions: string,
	skillName: string,
): string {
	let result = instructions;

	// --- ## Role ---
	const roleBullet = `- Can ${skillName}`;
	const roleIdx = result.indexOf("## Role");
	if (roleIdx !== -1) {
		const roleEnd = sectionEndIndex(result, roleIdx);
		const section = result.slice(roleIdx, roleEnd);
		if (!section.includes(roleBullet)) {
			result =
				result.slice(0, roleEnd) + `\n${roleBullet}` + result.slice(roleEnd);
		}
	} else {
		result += `\n\n## Role\n${roleBullet}`;
	}

	// --- ## Goal ---
	const goalBullet = `- The user has successfully used the ${skillName} skill`;
	const goalIdx = result.indexOf("## Goal");
	if (goalIdx !== -1) {
		const goalEnd = sectionEndIndex(result, goalIdx);
		const section = result.slice(goalIdx, goalEnd);
		if (!section.includes(goalBullet)) {
			result =
				result.slice(0, goalEnd) + `\n${goalBullet}` + result.slice(goalEnd);
		}
	} else {
		result += `\n\n## Goal\n${goalBullet}`;
	}

	return result;
}

export function removeSkillFromInstructions(
	instructions: string,
	skillName: string,
): string {
	let result = instructions;

	const roleLine = `\n- Can ${skillName}`;
	if (result.includes(roleLine)) {
		result = result.replace(roleLine, "");
	}

	const goalLine = `\n- The user has successfully used the ${skillName} skill`;
	if (result.includes(goalLine)) {
		result = result.replace(goalLine, "");
	}

	return result;
}
