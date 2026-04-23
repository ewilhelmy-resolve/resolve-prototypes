import { HelpCircle } from "lucide-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export interface FieldHelpProps {
	/** Used in the trigger's aria-label, e.g. "More info about Skills". */
	label: string;
	/** Short prose, 1–2 sentences. */
	description: string;
	/** Optional bulleted examples shown below the description. */
	examples?: string[];
	/** Localized aria-label template, e.g. "More info about {{label}}". */
	triggerAriaLabel?: string;
}

/**
 * A small "?" icon next to a form field label that opens a popover with
 * a short description and optional bulleted examples.
 *
 * Click-triggered (not hover) so the content is keyboard- and
 * screen-reader-accessible.
 */
export function FieldHelp({
	label,
	description,
	examples,
	triggerAriaLabel,
}: FieldHelpProps) {
	const ariaLabel = triggerAriaLabel
		? triggerAriaLabel.replace("{{label}}", label)
		: `More info about ${label}`;

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-label={ariaLabel}
					className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
				</button>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-3 text-sm" align="start">
				<p>{description}</p>
				{Array.isArray(examples) && examples.length > 0 ? (
					<ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
						{examples.map((ex) => (
							<li key={ex}>{ex}</li>
						))}
					</ul>
				) : null}
			</PopoverContent>
		</Popover>
	);
}
