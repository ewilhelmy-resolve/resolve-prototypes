import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Bold,
	Highlighter,
	Image,
	Italic,
	Link,
	List,
	ListOrdered,
	Paintbrush,
	Underline,
} from "lucide-react";
import { useCallback, useRef } from "react";

interface RichTextEditorProps {
	value: string;
	onChange: (html: string) => void;
	placeholder?: string;
	ariaLabel?: string;
}

interface ToolbarButton {
	icon: typeof Bold;
	label: string;
	command: string;
	arg?: string;
	stub?: boolean;
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
	{ icon: Bold, label: "Bold", command: "bold" },
	{ icon: Italic, label: "Italic", command: "italic" },
	{ icon: Underline, label: "Underline", command: "underline" },
	{ icon: Paintbrush, label: "Text color", command: "foreColor", stub: true },
	{ icon: Highlighter, label: "Highlight", command: "hiliteColor", stub: true },
	{ icon: ListOrdered, label: "Numbered list", command: "insertOrderedList" },
	{ icon: List, label: "Bullet list", command: "insertUnorderedList" },
	{ icon: AlignLeft, label: "Align left", command: "justifyLeft" },
	{ icon: AlignCenter, label: "Align center", command: "justifyCenter" },
	{ icon: AlignRight, label: "Align right", command: "justifyRight" },
	{ icon: Link, label: "Insert link", command: "createLink", stub: true },
	{ icon: Image, label: "Insert image", command: "insertImage", stub: true },
];

export function RichTextEditor({
	value,
	onChange,
	placeholder = "Enter information...",
	ariaLabel = "Rich text editor",
}: RichTextEditorProps) {
	const editorRef = useRef<HTMLDivElement>(null);

	const handleCommand = useCallback((command: string, stub?: boolean) => {
		if (stub) {
			// Stubs: link prompts for URL, others are no-ops
			if (command === "createLink") {
				const url = window.prompt("Enter URL:");
				if (url) {
					document.execCommand("createLink", false, url);
				}
			}
			// foreColor, hiliteColor, insertImage are no-ops in prototype
			return;
		}
		document.execCommand(command, false);
	}, []);

	const handleInput = useCallback(() => {
		if (editorRef.current) {
			onChange(editorRef.current.innerHTML);
		}
	}, [onChange]);

	const isEmpty = !value || value === "<br>" || value === "<div><br></div>";

	return (
		<div className="border border-slate-200 rounded-md overflow-hidden">
			{/* Toolbar */}
			<div
				className="flex items-center gap-0.5 px-1.5 py-1 border-b border-slate-200 bg-slate-50 flex-wrap"
				role="toolbar"
				aria-label="Text formatting"
			>
				{TOOLBAR_BUTTONS.map((btn) => (
					<button
						key={btn.command + (btn.arg ?? "")}
						type="button"
						onMouseDown={(e) => {
							e.preventDefault();
							handleCommand(btn.command, btn.stub);
						}}
						className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
						aria-label={btn.label}
						title={btn.label}
					>
						<btn.icon className="w-3.5 h-3.5" />
					</button>
				))}
			</div>

			{/* Editor area */}
			<div className="relative">
				{isEmpty && (
					<div
						className="absolute top-0 left-0 px-3 py-2 text-sm text-slate-400 pointer-events-none"
						aria-hidden="true"
					>
						{placeholder}
					</div>
				)}
				{/* biome-ignore lint/a11y/useSemanticElements: contenteditable required for rich text */}
				<div
					ref={editorRef}
					contentEditable
					suppressContentEditableWarning
					onInput={handleInput}
					dangerouslySetInnerHTML={{ __html: value }}
					className="min-h-[120px] px-3 py-2 text-sm text-slate-700 outline-none focus:ring-1 focus:ring-blue-400 focus:ring-inset"
					role="textbox"
					tabIndex={0}
					aria-label={ariaLabel}
					aria-multiline="true"
				/>
			</div>
		</div>
	);
}
