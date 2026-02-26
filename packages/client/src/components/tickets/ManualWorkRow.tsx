import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import type { RankedCluster } from "@/lib/tickets/prioritization";
import { cn } from "@/lib/utils";

interface ManualWorkRowProps {
	item: RankedCluster;
}

function KBStatusBadge({ status }: { status: string }) {
	const { t } = useTranslation("tickets");

	switch (status) {
		case "PENDING":
			return (
				<Badge variant="outline" className="shrink-0 text-muted-foreground">
					<Loader2 className="mr-1 size-3 animate-spin" />
					{t("manualWork.kb.pending")}
				</Badge>
			);
		case "GAP":
			return (
				<Badge
					variant="outline"
					className="shrink-0 border-yellow-400 bg-yellow-50 text-yellow-700"
				>
					{t("manualWork.kb.gap")}
				</Badge>
			);
		default:
			return null;
	}
}

export function ManualWorkRow({ item }: ManualWorkRowProps) {
	const { t } = useTranslation("tickets");
	const navigate = useNavigate();

	return (
		<button
			type="button"
			onClick={() => navigate(`/tickets/${item.cluster.id}`)}
			className={cn(
				"flex w-full items-center justify-between gap-2 rounded-lg border bg-background px-4 py-3 text-left transition-colors",
				"hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
			)}
			aria-label={t("manualWork.rowLabel", {
				name: item.displayName,
			})}
		>
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="truncate text-sm font-medium">{item.displayName}</span>
				<span className="text-xs text-muted-foreground">
					{item.cluster.ticket_count.toLocaleString()} {t("manualWork.tickets")}
				</span>
			</div>
			<KBStatusBadge status={item.cluster.kb_status} />
		</button>
	);
}
