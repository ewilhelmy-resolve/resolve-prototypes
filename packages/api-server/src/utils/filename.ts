import path from "node:path";

export function sanitizeFilename(filename: string): string {
	let safe = filename.replace(/\0/g, "");
	safe = safe.replace(/\\/g, "/");
	safe = path.basename(safe);
	return safe || "unnamed";
}

export function safeContentDisposition(filename: string): string {
	const asciiName = filename.replace(/[^\x20-\x7E]/g, "_");
	const escaped = asciiName.replace(/["\\]/g, "\\$&");
	const encoded = encodeURIComponent(filename);
	return `attachment; filename="${escaped}"; filename*=UTF-8''${encoded}`;
}
