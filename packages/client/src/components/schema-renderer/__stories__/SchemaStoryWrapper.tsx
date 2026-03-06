import { fn } from "@storybook/test";
import type { UISchema } from "@/types/uiSchema";
import { SchemaRenderer } from "../SchemaRenderer";

interface SchemaStoryWrapperProps {
	schema: UISchema | Record<string, unknown>;
	onAction?: (payload: unknown) => void;
}

export function SchemaStoryWrapper({
	schema,
	onAction = fn(),
}: SchemaStoryWrapperProps) {
	return (
		<SchemaRenderer
			schema={schema}
			messageId="storybook-msg"
			conversationId="storybook-conv"
			onAction={onAction}
			forceInlineModals
		/>
	);
}
