interface WorkflowToggleProps {
	checked: boolean;
	onChange?: (checked: boolean) => void;
	"aria-label"?: string;
}

export function WorkflowToggle({
	checked,
	onChange,
	...props
}: WorkflowToggleProps) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={props["aria-label"]}
			onClick={(e) => {
				e.stopPropagation();
				onChange?.(!checked);
			}}
			className={`relative shrink-0 w-[30px] h-[18px] rounded-full border transition-colors cursor-pointer ${
				checked ? "border-[#0075ff] bg-white" : "border-[#d1d5db] bg-white"
			}`}
		>
			<span
				className={`absolute top-[2px] block w-[12px] h-[12px] rounded-full transition-transform ${
					checked
						? "translate-x-[14px] bg-[#0075ff]"
						: "translate-x-[2px] bg-[#d1d5db]"
				}`}
			/>
		</button>
	);
}
