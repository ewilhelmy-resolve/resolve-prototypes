import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { MCPVariable, MCPVariableType } from "@/types/pro";

const VARIABLE_TYPES: MCPVariableType[] = [
	"string",
	"number",
	"boolean",
	"object",
	"array",
];

interface MCPVariableEditorProps {
	variables: MCPVariable[];
	onChange: (variables: MCPVariable[]) => void;
}

export function MCPVariableEditor({
	variables,
	onChange,
}: MCPVariableEditorProps) {
	const handleAdd = () => {
		onChange([...variables, { name: "", type: "string", required: false }]);
	};

	const handleRemove = (index: number) => {
		onChange(variables.filter((_, i) => i !== index));
	};

	const handleUpdate = (
		index: number,
		field: keyof MCPVariable,
		value: string | boolean,
	) => {
		const updated = variables.map((v, i) =>
			i === index ? { ...v, [field]: value } : v,
		);
		onChange(updated);
	};

	return (
		<div className="space-y-2">
			<Label>Variables</Label>

			{variables.length > 0 && (
				<ul className="list-none space-y-2" aria-label="Skill variables">
					{variables.map((variable, index) => (
						<li
							key={`var-${index}`}
							className="flex items-start gap-2 rounded-md border p-2"
						>
							<div className="flex flex-1 flex-col gap-2">
								<div className="flex items-center gap-2">
									<Input
										placeholder="Name"
										value={variable.name}
										onChange={(e) =>
											handleUpdate(index, "name", e.target.value)
										}
										className="h-8 flex-1 text-sm"
										aria-label={`Variable ${index + 1} name`}
									/>
									<Select
										value={variable.type}
										onValueChange={(val) =>
											handleUpdate(index, "type", val as MCPVariableType)
										}
									>
										<SelectTrigger
											className="h-8 w-28"
											aria-label={`Variable ${index + 1} type`}
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{VARIABLE_TYPES.map((t) => (
												<SelectItem key={t} value={t}>
													{t}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<div className="flex items-center gap-1.5">
										<Checkbox
											id={`var-required-${index}`}
											checked={variable.required}
											onCheckedChange={(checked) =>
												handleUpdate(index, "required", checked === true)
											}
											aria-label={`Variable ${index + 1} required`}
										/>
										<Label
											htmlFor={`var-required-${index}`}
											className="text-xs text-muted-foreground"
										>
											Req
										</Label>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="size-8 shrink-0"
										onClick={() => handleRemove(index)}
										aria-label={`Remove variable ${variable.name || index + 1}`}
									>
										<X className="size-3.5" />
									</Button>
								</div>
								<Input
									placeholder="Description (optional)"
									value={variable.description ?? ""}
									onChange={(e) =>
										handleUpdate(index, "description", e.target.value)
									}
									className="h-7 text-xs"
									aria-label={`Variable ${index + 1} description`}
								/>
							</div>
						</li>
					))}
				</ul>
			)}

			<Button
				type="button"
				variant="outline"
				size="sm"
				className="w-full"
				onClick={handleAdd}
			>
				<Plus className="size-3.5" />
				Add Variable
			</Button>
		</div>
	);
}
