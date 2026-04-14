import { HelpCircle } from "lucide-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export interface FieldHelpPopoverProps {
	description: string;
	examples?: string[];
	ariaLabel?: string;
}

export function FieldHelpPopover({
	description,
	examples,
	ariaLabel = "Field help",
}: FieldHelpPopoverProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
					aria-label={ariaLabel}
				>
					<HelpCircle className="size-3.5" />
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" side="top" className="w-72 text-sm">
				<p className="text-foreground">{description}</p>
				{examples && examples.length > 0 && (
					<ul className="mt-2 space-y-1 list-disc pl-4 text-muted-foreground">
						{examples.map((example) => (
							<li key={example}>{example}</li>
						))}
					</ul>
				)}
			</PopoverContent>
		</Popover>
	);
}
