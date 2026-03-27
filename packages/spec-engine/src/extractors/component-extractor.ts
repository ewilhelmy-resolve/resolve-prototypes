import path from "node:path";
import { Project, type SourceFile } from "ts-morph";
import type { Prop, View } from "../types/avcj.js";

export interface ComponentData {
	views: Partial<View>[];
}

export async function extractComponents(
	rootDir: string,
): Promise<ComponentData> {
	const views: Partial<View>[] = [];

	const tsconfigPath = path.join(rootDir, "packages/client/tsconfig.json");
	let project: Project;

	try {
		project = new Project({
			tsConfigFilePath: tsconfigPath,
			skipAddingFilesFromTsConfig: true,
		});
	} catch {
		return { views };
	}

	// Only scan component and page files
	const patterns = [
		path.join(rootDir, "packages/client/src/components/**/*.tsx"),
		path.join(rootDir, "packages/client/src/pages/**/*.tsx"),
	];

	for (const pattern of patterns) {
		project.addSourceFilesAtPaths(pattern);
	}

	for (const sourceFile of project.getSourceFiles()) {
		const filePath = sourceFile.getFilePath();
		const relativePath = path.relative(rootDir, filePath);

		if (/__tests__|\.test\.|\.stories\./.test(relativePath)) continue;

		const props = extractPropsFromFile(sourceFile);
		if (props.length === 0) continue;

		const componentName = path.basename(filePath, ".tsx");
		const id = toKebabCase(componentName);

		views.push({
			id,
			name: componentName,
			props,
		});
	}

	return { views };
}

function extractPropsFromFile(sourceFile: SourceFile): Prop[] {
	const props: Prop[] = [];

	// Find interfaces/types ending in Props
	for (const iface of sourceFile.getInterfaces()) {
		const name = iface.getName();
		if (!name.endsWith("Props")) continue;

		for (const prop of iface.getProperties()) {
			const jsDocs = prop.getJsDocs();
			const description = jsDocs[0]?.getDescription()?.trim() || "";

			props.push({
				name: prop.getName(),
				type: prop.getType().getText(prop),
				required: !prop.hasQuestionToken(),
				description: description || undefined,
			});
		}
		break; // Use first Props interface found
	}

	// Also check type aliases
	if (props.length === 0) {
		for (const typeAlias of sourceFile.getTypeAliases()) {
			const name = typeAlias.getName();
			if (!name.endsWith("Props")) continue;

			const typeNode = typeAlias.getType();
			for (const prop of typeNode.getProperties()) {
				const decl = prop.getDeclarations()[0];
				props.push({
					name: prop.getName(),
					type: prop.getTypeAtLocation(decl || typeAlias).getText(),
					required: !prop.isOptional(),
				});
			}
			break;
		}
	}

	return props;
}

function toKebabCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.replace(/[_\s]+/g, "-")
		.toLowerCase();
}
