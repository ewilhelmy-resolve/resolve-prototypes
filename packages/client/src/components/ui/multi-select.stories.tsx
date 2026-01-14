import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { MultiSelect } from "./multi-select";
import { Apple, Banana, Cherry, Grape, Citrus } from "lucide-react";

const meta: Meta<typeof MultiSelect> = {
	component: MultiSelect,
	title: "Components/Forms/Multi Select",
	tags: ["autodocs"],
	args: {
		onValueChange: fn(),
	},
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "secondary", "destructive", "inverted"],
		},
		maxCount: {
			control: { type: "number", min: 1, max: 10 },
		},
		searchable: {
			control: "boolean",
		},
		disabled: {
			control: "boolean",
		},
	},
	decorators: [
		(Story) => (
			<div className="w-[400px]">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof MultiSelect>;

const fruitOptions = [
	{ label: "Apple", value: "apple", icon: Apple },
	{ label: "Banana", value: "banana", icon: Banana },
	{ label: "Cherry", value: "cherry", icon: Cherry },
	{ label: "Grape", value: "grape", icon: Grape },
	{ label: "Lemon", value: "lemon", icon: Citrus },
];

const simpleOptions = [
	{ label: "Option 1", value: "option1" },
	{ label: "Option 2", value: "option2" },
	{ label: "Option 3", value: "option3" },
	{ label: "Option 4", value: "option4" },
	{ label: "Option 5", value: "option5" },
];

export const Default: Story = {
	args: {
		options: simpleOptions,
		placeholder: "Select options...",
	},
};

export const WithIcons: Story = {
	args: {
		options: fruitOptions,
		placeholder: "Select fruits...",
	},
};

export const WithDefaultValues: Story = {
	args: {
		options: fruitOptions,
		defaultValue: ["apple", "cherry"],
		placeholder: "Select fruits...",
	},
};

export const MaxCount: Story = {
	args: {
		options: fruitOptions,
		defaultValue: ["apple", "cherry", "grape", "banana"],
		maxCount: 2,
		placeholder: "Select fruits...",
	},
};

export const NotSearchable: Story = {
	args: {
		options: simpleOptions,
		searchable: false,
		placeholder: "Select (no search)...",
	},
};

export const Disabled: Story = {
	args: {
		options: simpleOptions,
		disabled: true,
		defaultValue: ["option1"],
		placeholder: "Disabled select...",
	},
};

export const WithDisabledOptions: Story = {
	args: {
		options: [
			{ label: "Available 1", value: "available1" },
			{ label: "Disabled Option", value: "disabled1", disabled: true },
			{ label: "Available 2", value: "available2" },
			{ label: "Disabled Too", value: "disabled2", disabled: true },
			{ label: "Available 3", value: "available3" },
		],
		placeholder: "Some options disabled...",
	},
};

export const GroupedOptions: Story = {
	args: {
		options: [
			{
				heading: "Fruits",
				options: [
					{ label: "Apple", value: "apple" },
					{ label: "Banana", value: "banana" },
					{ label: "Cherry", value: "cherry" },
				],
			},
			{
				heading: "Vegetables",
				options: [
					{ label: "Carrot", value: "carrot" },
					{ label: "Broccoli", value: "broccoli" },
					{ label: "Spinach", value: "spinach" },
				],
			},
		],
		placeholder: "Select produce...",
	},
};

export const HideSelectAll: Story = {
	args: {
		options: simpleOptions,
		hideSelectAll: true,
		placeholder: "No select all...",
	},
};

export const SingleLine: Story = {
	args: {
		options: fruitOptions,
		defaultValue: ["apple", "cherry", "grape", "banana"],
		singleLine: true,
		maxCount: 10,
		placeholder: "Single line badges...",
	},
};

export const CustomEmptyState: Story = {
	args: {
		options: simpleOptions,
		emptyIndicator: (
			<div className="text-center py-4 text-muted-foreground">
				No matching options found
			</div>
		),
		placeholder: "Search to see custom empty...",
	},
};

export const Variants: Story = {
	render: (args) => (
		<div className="flex flex-col gap-4">
			<div>
				<p className="text-sm text-muted-foreground mb-2">Default</p>
				<MultiSelect
					{...args}
					options={simpleOptions}
					defaultValue={["option1", "option2"]}
					variant="default"
				/>
			</div>
			<div>
				<p className="text-sm text-muted-foreground mb-2">Secondary</p>
				<MultiSelect
					{...args}
					options={simpleOptions}
					defaultValue={["option1", "option2"]}
					variant="secondary"
				/>
			</div>
			<div>
				<p className="text-sm text-muted-foreground mb-2">Destructive</p>
				<MultiSelect
					{...args}
					options={simpleOptions}
					defaultValue={["option1", "option2"]}
					variant="destructive"
				/>
			</div>
		</div>
	),
};
