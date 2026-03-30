import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export function writeMarkdown(filePath: string, content: string) {
	mkdirSync(path.dirname(filePath), { recursive: true });
	writeFileSync(filePath, content, "utf-8");
}
