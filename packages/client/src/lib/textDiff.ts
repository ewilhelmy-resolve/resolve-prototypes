export interface DiffLine {
	type: "added" | "removed" | "unchanged";
	text: string;
}

/** A row in the side-by-side view */
export interface DiffRow {
	left: { text: string; type: "removed" | "unchanged" | "empty" };
	right: { text: string; type: "added" | "unchanged" | "empty" };
}

/**
 * Compute a unified line-by-line diff between two strings using LCS.
 * O(n*m) DP — fine for short texts like agent instructions (<50 lines).
 */
export function computeLineDiff(
	original: string,
	improved: string,
): DiffLine[] {
	const origLines = original.split("\n");
	const impLines = improved.split("\n");
	const n = origLines.length;
	const m = impLines.length;

	// Build LCS table
	const dp: number[][] = Array.from({ length: n + 1 }, () =>
		Array(m + 1).fill(0),
	);
	for (let i = 1; i <= n; i++) {
		for (let j = 1; j <= m; j++) {
			if (origLines[i - 1] === impLines[j - 1]) {
				dp[i][j] = dp[i - 1][j - 1] + 1;
			} else {
				dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
			}
		}
	}

	// Back-trace to build diff
	const result: DiffLine[] = [];
	let i = n;
	let j = m;
	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && origLines[i - 1] === impLines[j - 1]) {
			result.push({ type: "unchanged", text: origLines[i - 1] });
			i--;
			j--;
		} else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
			result.push({ type: "added", text: impLines[j - 1] });
			j--;
		} else {
			result.push({ type: "removed", text: origLines[i - 1] });
			i--;
		}
	}

	return result.reverse();
}

/**
 * Convert unified diff lines into paired rows for side-by-side display.
 * Pairs consecutive removed+added lines together (like GitHub split view).
 */
export function computeSideBySideRows(
	original: string,
	improved: string,
): DiffRow[] {
	const lines = computeLineDiff(original, improved);
	const rows: DiffRow[] = [];

	let i = 0;
	while (i < lines.length) {
		const line = lines[i];

		if (line.type === "unchanged") {
			rows.push({
				left: { text: line.text, type: "unchanged" },
				right: { text: line.text, type: "unchanged" },
			});
			i++;
		} else if (line.type === "removed") {
			// Collect consecutive removed lines
			const removed: string[] = [];
			while (i < lines.length && lines[i].type === "removed") {
				removed.push(lines[i].text);
				i++;
			}
			// Collect consecutive added lines that follow
			const added: string[] = [];
			while (i < lines.length && lines[i].type === "added") {
				added.push(lines[i].text);
				i++;
			}
			// Pair them up
			const maxLen = Math.max(removed.length, added.length);
			for (let k = 0; k < maxLen; k++) {
				rows.push({
					left:
						k < removed.length
							? { text: removed[k], type: "removed" }
							: { text: "", type: "empty" },
					right:
						k < added.length
							? { text: added[k], type: "added" }
							: { text: "", type: "empty" },
				});
			}
		} else if (line.type === "added") {
			rows.push({
				left: { text: "", type: "empty" },
				right: { text: line.text, type: "added" },
			});
			i++;
		}
	}

	return rows;
}
