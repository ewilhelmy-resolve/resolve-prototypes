import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import type { UISchema } from "@/types/uiSchema";
import { SchemaStoryWrapper } from "./SchemaStoryWrapper";

const meta = {
	component: SchemaStoryWrapper,
	title: "Features/Schema Renderer/Primitives/Text",
	tags: ["autodocs"],
	parameters: { layout: "padded" },
} satisfies Meta<typeof SchemaStoryWrapper>;

export default meta;
type Story = StoryObj<typeof SchemaStoryWrapper>;

const textSchema = (content: string, variant?: string): UISchema => ({
	version: "1",
	components: [{ type: "text", content, variant }],
});

export const Default: Story = {
	args: {
		schema: textSchema(
			"This is plain default text rendered by SchemaRenderer.",
		),
	},
};

export const Heading: Story = {
	args: {
		schema: textSchema("Heading Text", "heading"),
	},
};

export const Subheading: Story = {
	args: {
		schema: textSchema("Subheading Text", "subheading"),
	},
};

export const Muted: Story = {
	args: {
		schema: textSchema("This text appears muted and secondary.", "muted"),
	},
};

export const Code: Story = {
	args: {
		schema: textSchema("const x = 42;", "code"),
	},
};

export const DiffAdd: Story = {
	args: {
		schema: textSchema("+ Added line", "diff-add"),
	},
};

export const DiffRemove: Story = {
	args: {
		schema: textSchema("- Removed line", "diff-remove"),
	},
};

export const DiffContext: Story = {
	args: {
		schema: textSchema("  Unchanged context line", "diff-context"),
	},
};

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-col gap-3">
			<SchemaStoryWrapper schema={textSchema("Default text")} onAction={fn()} />
			<SchemaStoryWrapper
				schema={textSchema("Heading text", "heading")}
				onAction={fn()}
			/>
			<SchemaStoryWrapper
				schema={textSchema("Subheading text", "subheading")}
				onAction={fn()}
			/>
			<SchemaStoryWrapper
				schema={textSchema("Muted text", "muted")}
				onAction={fn()}
			/>
			<SchemaStoryWrapper
				schema={textSchema("const code = true;", "code")}
				onAction={fn()}
			/>
			<SchemaStoryWrapper
				schema={textSchema("+ Added line", "diff-add")}
				onAction={fn()}
			/>
			<SchemaStoryWrapper
				schema={textSchema("- Removed line", "diff-remove")}
				onAction={fn()}
			/>
			<SchemaStoryWrapper
				schema={textSchema("  Context line", "diff-context")}
				onAction={fn()}
			/>
		</div>
	),
};

export const Markdown: Story = {
	args: {
		schema: textSchema(
			[
				"## Markdown Support",
				"",
				"Text components render **bold**, *italic*, and `inline code`.",
				"",
				"| Feature | Status |",
				"|---------|--------|",
				"| Tables  | Yes    |",
				"| Lists   | Yes    |",
				"| Code    | Yes    |",
				"",
				"- First item",
				"- Second item",
				"- Third item",
			].join("\n"),
		),
	},
};
