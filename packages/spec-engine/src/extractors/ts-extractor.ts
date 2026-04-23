import path from "node:path";
import { type JSDoc, Node, Project, type SourceFile } from "ts-morph";
import type {
	Actor,
	Constraint,
	Journey,
	Method,
	SourceLocation,
	View,
} from "../types/avcj.js";

export interface ExtractedData {
	actors: Actor[];
	views: View[];
	constraints: Constraint[];
	journeys: Journey[];
	totalFiles: number;
	totalExports: number;
	annotatedExports: number;
}

interface ClassificationRule {
	pattern: RegExp;
	type: "actor" | "view" | "constraint" | "journey";
	kind: string;
	pkg: string;
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
	// API server actors
	{
		pattern: /packages\/api-server\/src\/services\//,
		type: "actor",
		kind: "service",
		pkg: "api-server",
	},
	{
		pattern: /packages\/api-server\/src\/consumers\//,
		type: "actor",
		kind: "consumer",
		pkg: "api-server",
	},
	{
		pattern: /packages\/api-server\/src\/repositories\//,
		type: "actor",
		kind: "repository",
		pkg: "api-server",
	},
	// Client actors
	{
		pattern: /packages\/client\/src\/stores\//,
		type: "actor",
		kind: "store",
		pkg: "client",
	},
	{
		pattern: /packages\/client\/src\/hooks\//,
		type: "actor",
		kind: "hook",
		pkg: "client",
	},
	// Constraints
	{
		pattern: /packages\/api-server\/src\/middleware\//,
		type: "constraint",
		kind: "middleware",
		pkg: "api-server",
	},
	{
		pattern: /packages\/api-server\/src\/schemas\//,
		type: "constraint",
		kind: "schema",
		pkg: "api-server",
	},
	// Views
	{
		pattern: /packages\/client\/src\/pages\//,
		type: "view",
		kind: "page",
		pkg: "client",
	},
	{
		pattern: /packages\/client\/src\/components\//,
		type: "view",
		kind: "component",
		pkg: "client",
	},
	{
		pattern: /packages\/iframe-app\/src\//,
		type: "view",
		kind: "component",
		pkg: "iframe-app",
	},
	// Journeys (routes)
	{
		pattern: /packages\/api-server\/src\/routes\//,
		type: "journey",
		kind: "endpoint",
		pkg: "api-server",
	},
];

const SKIP_PATTERNS = [
	/__tests__\//,
	/\.test\./,
	/\.spec\./,
	/\.stories\./,
	/\.d\.ts$/,
	/index\.ts$/,
	/node_modules/,
];

export async function extractAll(rootDir: string): Promise<ExtractedData> {
	const actors: Actor[] = [];
	const views: View[] = [];
	const constraints: Constraint[] = [];
	const journeys: Journey[] = [];
	let totalFiles = 0;
	let totalExports = 0;
	let annotatedExports = 0;

	const packages = ["api-server", "client", "iframe-app"];

	for (const pkg of packages) {
		const tsconfigPath = path.join(rootDir, "packages", pkg, "tsconfig.json");
		let project: Project;

		try {
			project = new Project({
				tsConfigFilePath: tsconfigPath,
				skipAddingFilesFromTsConfig: true,
			});
		} catch (e) {
			console.error(`  Skipping ${pkg}: ${e instanceof Error ? e.message : e}`);
			continue;
		}

		const srcGlob = path.join(
			rootDir,
			"packages",
			pkg,
			"src",
			"**",
			"*.{ts,tsx}",
		);
		project.addSourceFilesAtPaths(srcGlob);

		const fileCount = project.getSourceFiles().length;
		console.log(`  ${pkg}: ${fileCount} source files found`);

		for (const sourceFile of project.getSourceFiles()) {
			const filePath = sourceFile.getFilePath();
			const relativePath = path.relative(rootDir, filePath);

			if (SKIP_PATTERNS.some((p) => p.test(relativePath))) continue;

			totalFiles++;

			const rule = CLASSIFICATION_RULES.find((r) =>
				r.pattern.test(relativePath),
			);
			if (!rule) continue;

			const exported = getExportedSymbols(sourceFile);
			totalExports += exported.length;

			for (const sym of exported) {
				const jsdoc = getJsDoc(sym.node);
				const description = jsdoc?.description || "";
				const customTags = jsdoc?.tags || {};
				if (description || Object.keys(customTags).length > 0) {
					annotatedExports++;
				}

				const source: SourceLocation = {
					file: relativePath,
					line: sym.node.getStartLineNumber(),
					package: rule.pkg,
				};

				const id = toKebabCase(sym.name);

				switch (rule.type) {
					case "actor": {
						const methods = extractMethods(sym.node, relativePath, rule.pkg);
						actors.push({
							id,
							name: sym.name,
							kind: rule.kind as Actor["kind"],
							description,
							sources: [source],
							methods,
							tags: tagsToArray(customTags),
						});
						break;
					}
					case "view": {
						views.push({
							id,
							name: sym.name,
							kind: rule.kind as View["kind"],
							description,
							sources: [source],
							props: [],
							tags: tagsToArray(customTags),
						});
						break;
					}
					case "constraint": {
						constraints.push({
							id,
							name: sym.name,
							kind: rule.kind as Constraint["kind"],
							description,
							enforcement: "runtime",
							sources: [source],
							tags: tagsToArray(customTags),
						});
						break;
					}
					case "journey": {
						journeys.push({
							id,
							name: humanize(sym.name),
							description,
							steps: [],
							actors: [],
							views: [],
							constraints: [],
							tags: tagsToArray(customTags),
						});
						break;
					}
				}
			}
		}
	}

	return {
		actors,
		views,
		constraints,
		journeys,
		totalFiles,
		totalExports,
		annotatedExports,
	};
}

interface ExportedSymbol {
	name: string;
	node: Node;
}

function getExportedSymbols(sourceFile: SourceFile): ExportedSymbol[] {
	const symbols: ExportedSymbol[] = [];

	// Exported classes
	for (const cls of sourceFile.getClasses()) {
		if (cls.isExported()) {
			const name = cls.getName();
			if (name) symbols.push({ name, node: cls });
		}
	}

	// Exported functions
	for (const fn of sourceFile.getFunctions()) {
		if (fn.isExported()) {
			const name = fn.getName();
			if (name) symbols.push({ name, node: fn });
		}
	}

	// Exported variable declarations (const/let)
	for (const varStmt of sourceFile.getVariableStatements()) {
		if (varStmt.isExported()) {
			for (const decl of varStmt.getDeclarations()) {
				symbols.push({ name: decl.getName(), node: varStmt });
			}
		}
	}

	// If nothing was explicitly exported, try the default export or the file-level function/class
	if (symbols.length === 0) {
		const defaultExport = sourceFile.getDefaultExportSymbol();
		if (defaultExport) {
			const name =
				defaultExport.getName() === "default"
					? path.basename(
							sourceFile.getFilePath(),
							path.extname(sourceFile.getFilePath()),
						)
					: defaultExport.getName();
			const decl = defaultExport.getDeclarations()[0];
			if (decl) symbols.push({ name, node: decl });
		}
	}

	return symbols;
}

interface JsDocInfo {
	description: string;
	tags: Record<string, string>;
}

function getJsDoc(node: Node): JsDocInfo | null {
	const jsDocs = getJsDocNodes(node);
	if (jsDocs.length === 0) return null;

	const doc = jsDocs[0];
	const description = doc.getDescription()?.trim() || "";

	const tags: Record<string, string> = {};
	for (const tag of doc.getTags()) {
		const tagName = tag.getTagName();
		const comment = tag.getCommentText()?.trim() || "";
		tags[tagName] = comment;
	}

	return { description, tags };
}

function getJsDocNodes(node: Node): JSDoc[] {
	// Classes, functions, and variable statements can have JSDoc
	if (Node.isJSDocable(node)) {
		return node.getJsDocs();
	}
	return [];
}

function extractMethods(node: Node, filePath: string, pkg: string): Method[] {
	const methods: Method[] = [];

	if (Node.isClassDeclaration(node)) {
		for (const method of node.getMethods()) {
			if (method.getScope() !== undefined && method.getScope() !== "public")
				continue;

			const jsdoc = getJsDoc(method);
			const params = method.getParameters().map((p) => ({
				name: p.getName(),
				type: p.getType().getText(p),
			}));

			methods.push({
				name: method.getName(),
				description: jsdoc?.description || "",
				params,
				returns: method.getReturnType().getText(method),
				source: {
					file: filePath,
					line: method.getStartLineNumber(),
					package: pkg,
				},
			});
		}
	}

	return methods;
}

function toKebabCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.replace(/[_\s]+/g, "-")
		.toLowerCase();
}

function humanize(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/[_-]+/g, " ")
		.replace(/^\w/, (c) => c.toUpperCase());
}

function tagsToArray(tags: Record<string, string>): string[] {
	const avcjTags = ["actor", "view", "journey", "constraint"];
	const result: string[] = [];
	for (const [key, value] of Object.entries(tags)) {
		if (avcjTags.includes(key) && value) {
			result.push(`${key}:${value}`);
		}
	}
	return result;
}
