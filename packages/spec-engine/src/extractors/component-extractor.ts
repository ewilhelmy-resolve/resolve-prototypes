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

			// Extract only explicitly declared props, not inherited DOM/library props.
			// For intersection types (ComponentProps<X> & { myProp: T }),
			// only extract props from the local declaration, not the base type.
			const declaredProps = extractDeclaredProps(typeAlias);
			if (declaredProps.length > 0) {
				props.push(...declaredProps);
			} else {
				// Fallback: use all properties but filter out common DOM props
				const typeNode = typeAlias.getType();
				for (const prop of typeNode.getProperties()) {
					const propName = prop.getName();
					if (DOM_PROP_BLOCKLIST.has(propName)) continue;
					const decl = prop.getDeclarations()[0];
					props.push({
						name: propName,
						type: prop.getTypeAtLocation(decl || typeAlias).getText(),
						required: !prop.isOptional(),
					});
				}
			}
			break;
		}
	}

	return props;
}

/**
 * Extract only the props explicitly written in a type alias declaration,
 * ignoring inherited props from intersection base types.
 *
 * For: `type FooProps = ComponentProps<typeof Bar> & { myProp: string }`
 * Returns only `myProp`, not the hundreds of DOM props from ComponentProps.
 */
function extractDeclaredProps(
	typeAlias: import("ts-morph").TypeAliasDeclaration,
): Prop[] {
	const props: Prop[] = [];
	const text = typeAlias.getText();

	// Match properties in the last object literal of an intersection:
	// `& { prop1?: type1; prop2: type2 }`
	const objectMatch = text.match(/&\s*\{([^}]+)\}\s*;?\s*$/);
	if (!objectMatch) return props;

	const body = objectMatch[1];
	// Match each property: `name?: type` or `name: type`
	const propRegex = /(\w+)(\?)?:\s*([^;]+)/g;
	for (const match of body.matchAll(propRegex)) {
		const name = match[1];
		const optional = !!match[2];
		const type = match[3].trim();

		// Skip internal React props
		if (DOM_PROP_BLOCKLIST.has(name)) continue;

		props.push({
			name,
			type,
			required: !optional,
		});
	}

	return props;
}

// Common DOM/React props to filter out when we can't isolate declared props
const DOM_PROP_BLOCKLIST = new Set([
	"slot",
	"style",
	"title",
	"children",
	"className",
	"id",
	"key",
	"ref",
	"suppressContentEditableWarning",
	"suppressHydrationWarning",
	"accessKey",
	"autoCapitalize",
	"autoFocus",
	"contentEditable",
	"contextMenu",
	"dir",
	"draggable",
	"enterKeyHint",
	"hidden",
	"lang",
	"nonce",
	"spellCheck",
	"tabIndex",
	"translate",
	"radioGroup",
	"role",
	"about",
	"content",
	"datatype",
	"inlist",
	"prefix",
	"property",
	"rel",
	"resource",
	"rev",
	"typeof",
	"vocab",
	"autoCorrect",
	"autoSave",
	"color",
	"itemProp",
	"itemScope",
	"itemType",
	"itemID",
	"itemRef",
	"results",
	"security",
	"unselectable",
	"is",
	"inputMode",
	"dangerouslySetInnerHTML",
	"onCopy",
	"onCut",
	"onPaste",
	"onCompositionEnd",
	"onCompositionStart",
	"onCompositionUpdate",
	"onFocus",
	"onBlur",
	"onChange",
	"onInput",
	"onSubmit",
	"onReset",
	"onInvalid",
	"onLoad",
	"onError",
	"onKeyDown",
	"onKeyUp",
	"onKeyPress",
	"onClick",
	"onContextMenu",
	"onDoubleClick",
	"onDrag",
	"onDragEnd",
	"onDragEnter",
	"onDragExit",
	"onDragLeave",
	"onDragOver",
	"onDragStart",
	"onDrop",
	"onMouseDown",
	"onMouseEnter",
	"onMouseLeave",
	"onMouseMove",
	"onMouseOut",
	"onMouseOver",
	"onMouseUp",
	"onSelect",
	"onTouchCancel",
	"onTouchEnd",
	"onTouchMove",
	"onTouchStart",
	"onPointerDown",
	"onPointerMove",
	"onPointerUp",
	"onPointerCancel",
	"onPointerEnter",
	"onPointerLeave",
	"onPointerOver",
	"onPointerOut",
	"onScroll",
	"onWheel",
	"onAnimationStart",
	"onAnimationEnd",
	"onAnimationIteration",
	"onTransitionEnd",
]);

function toKebabCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.replace(/[_\s]+/g, "-")
		.toLowerCase();
}
