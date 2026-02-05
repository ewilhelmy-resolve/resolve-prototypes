import type { Meta, StoryObj } from "@storybook/react";
import {
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
	TableCaption,
	TableFooter,
} from "./table";

const meta: Meta<typeof Table> = {
	component: Table,
	title: "Components/Data Display/Table",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof Table>;

const invoices = [
	{ invoice: "INV001", status: "Paid", method: "Credit Card", amount: "$250.00" },
	{ invoice: "INV002", status: "Pending", method: "PayPal", amount: "$150.00" },
	{ invoice: "INV003", status: "Unpaid", method: "Bank Transfer", amount: "$350.00" },
	{ invoice: "INV004", status: "Paid", method: "Credit Card", amount: "$450.00" },
	{ invoice: "INV005", status: "Paid", method: "PayPal", amount: "$550.00" },
];

export const Default: Story = {
	render: () => (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[100px]">Invoice</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Method</TableHead>
					<TableHead className="text-right">Amount</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{invoices.map((invoice) => (
					<TableRow key={invoice.invoice}>
						<TableCell className="font-medium">{invoice.invoice}</TableCell>
						<TableCell>{invoice.status}</TableCell>
						<TableCell>{invoice.method}</TableCell>
						<TableCell className="text-right">{invoice.amount}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	),
};

export const WithCaption: Story = {
	render: () => (
		<Table>
			<TableCaption>A list of your recent invoices.</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[100px]">Invoice</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Method</TableHead>
					<TableHead className="text-right">Amount</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{invoices.map((invoice) => (
					<TableRow key={invoice.invoice}>
						<TableCell className="font-medium">{invoice.invoice}</TableCell>
						<TableCell>{invoice.status}</TableCell>
						<TableCell>{invoice.method}</TableCell>
						<TableCell className="text-right">{invoice.amount}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	),
};

export const WithFooter: Story = {
	render: () => (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[100px]">Invoice</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Method</TableHead>
					<TableHead className="text-right">Amount</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{invoices.map((invoice) => (
					<TableRow key={invoice.invoice}>
						<TableCell className="font-medium">{invoice.invoice}</TableCell>
						<TableCell>{invoice.status}</TableCell>
						<TableCell>{invoice.method}</TableCell>
						<TableCell className="text-right">{invoice.amount}</TableCell>
					</TableRow>
				))}
			</TableBody>
			<TableFooter>
				<TableRow>
					<TableCell colSpan={3}>Total</TableCell>
					<TableCell className="text-right">$1,750.00</TableCell>
				</TableRow>
			</TableFooter>
		</Table>
	),
};

export const Empty: Story = {
	render: () => (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[100px]">Invoice</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Method</TableHead>
					<TableHead className="text-right">Amount</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<TableRow>
					<TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
						No invoices found.
					</TableCell>
				</TableRow>
			</TableBody>
		</Table>
	),
};
