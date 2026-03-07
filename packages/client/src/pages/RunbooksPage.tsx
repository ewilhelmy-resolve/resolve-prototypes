import { Play, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProLayout } from "@/components/layouts/ProLayout";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { MOCK_PRO_RUNBOOKS } from "@/data/mock-pro";

export default function RunbooksPage() {
	const navigate = useNavigate();
	const [search, setSearch] = useState("");

	const filtered = MOCK_PRO_RUNBOOKS.filter(
		(rb) =>
			search === "" ||
			rb.name.toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<ProLayout>
			<div className="p-6 space-y-4">
				<h1 className="text-2xl font-bold">Runbooks</h1>

				<div className="relative max-w-sm">
					<Search
						className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
						aria-hidden="true"
					/>
					<Input
						placeholder="Search runbooks..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
						aria-label="Search runbooks"
					/>
				</div>

				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Description</TableHead>
							<TableHead className="w-16" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{filtered.map((rb) => (
							<TableRow
								key={rb.id}
								className="cursor-pointer"
								onClick={() => navigate(`/pro/runbooks/${rb.id}`)}
							>
								<TableCell className="font-medium">{rb.name}</TableCell>
								<TableCell className="text-muted-foreground">
									{rb.description}
								</TableCell>
								<TableCell>
									<Play className="size-4 text-muted-foreground" />
								</TableCell>
							</TableRow>
						))}
						{filtered.length === 0 && (
							<TableRow>
								<TableCell colSpan={3} className="text-center text-muted-foreground py-8">
									No runbooks found
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</ProLayout>
	);
}
