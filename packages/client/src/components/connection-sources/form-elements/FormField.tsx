import {
	type FieldErrors,
	type FieldValues,
	get,
	type Path,
} from "react-hook-form";
import { Label } from "../../ui/label";

type FormFieldProps<TFieldValues extends FieldValues> = {
	label: string;
	name: Path<TFieldValues>;
	errors: FieldErrors<TFieldValues>;
	children: React.ReactNode;
};

const FormField = <TFieldValues extends FieldValues>({
	label,
	name,
	errors,
	children,
}: FormFieldProps<TFieldValues>) => {
	const err = get(errors, name) as { message?: string } | undefined;

	return (
		<div className="self-stretch flex flex-col items-start gap-2">
			<Label htmlFor={name}>{label}</Label>
			{children}
			{err && <p className="text-sm text-destructive">{err.message}</p>}
		</div>
	);
};

export default FormField;
