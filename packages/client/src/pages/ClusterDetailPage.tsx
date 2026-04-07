import { ArrowLeft, Info, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import RitaLayout from "@/components/layouts/RitaLayout";
import { StatCard } from "@/components/StatCard";
import { StatGroup } from "@/components/StatGroup";
import { ClusterDetailTable } from "@/components/tickets/ClusterDetailTable";
import { Button } from "@/components/ui/button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useClusterDetails } from "@/hooks/useClusters";
import { getClusterDisplayTitle } from "@/lib/cluster-utils";
import { useTicketSettingsStore } from "@/stores/ticketSettingsStore";

export default function ClusterDetailPage() {
	const { t } = useTranslation("tickets");
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data: cluster, isLoading, error } = useClusterDetails(id);
	const { blendedRatePerHour, timeToTake } = useTicketSettingsStore();
	const bannerRef = useRef<HTMLDivElement>(null);

	// Banner state for review completion
	const [bannerData, setBannerData] = useState<{
		visible: boolean;
		variant: "success" | "destructive" | "enriched";
		title: string;
		description?: string;
		key: number;
	}>({ visible: false, variant: "success", title: "", key: 0 });

	const handleBack = () => {
		navigate("/tickets");
	};

	const handleDismissBanner = () => {
		setBannerData((prev) => ({
			visible: false,
			variant: "success",
			title: "",
			key: prev.key,
		}));
	};

	// Scroll banner into view when it becomes visible or changes
	const bannerKey = bannerData.key;
	useEffect(() => {
		void bannerKey;
		if (bannerData.visible && bannerRef.current) {
			bannerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}, [bannerKey, bannerData.visible]);

	if (isLoading) {
		return (
			<RitaLayout activePage="tickets">
				<div className="flex min-h-screen items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			</RitaLayout>
		);
	}

	if (error || !cluster) {
		return (
			<RitaLayout activePage="tickets">
				<div className="flex min-h-screen flex-col items-center justify-center gap-4">
					<p className="text-destructive">{t("clusterDetail.failedToLoad")}</p>
					<Button variant="outline" onClick={handleBack}>
						{t("clusterDetail.backToTickets")}
					</Button>
				</div>
			</RitaLayout>
		);
	}

	const title = getClusterDisplayTitle(cluster.name, cluster.subcluster_name);

	return (
		<RitaLayout activePage="tickets">
			{/* Feedback Banner */}
			{bannerData.visible && (
				<div ref={bannerRef}>
					<FeedbackBanner
						variant={bannerData.variant}
						title={bannerData.title}
						description={bannerData.description}
						onDismiss={handleDismissBanner}
					/>
				</div>
			)}

			<div className="flex min-h-screen flex-col lg:flex-row">
				{/* Main Content */}
				<div className="min-w-0 flex-1 p-4">
					<div className="flex flex-col gap-4">
						{/* Page Header */}
						<div className="flex items-center gap-2">
							<Button
								variant="ghost"
								size="icon"
								onClick={handleBack}
								aria-label={t("clusterDetail.backToTickets")}
							>
								<ArrowLeft className="h-4 w-4" />
							</Button>
							<h1 className="text-xl font-medium">{title}</h1>
						</div>

						{/* Stats */}
						<StatGroup columns={4}>
							<StatCard
								value={cluster.ticket_count.toLocaleString()}
								label={t("clusterDetail.stats.totalTickets")}
								loading={false}
							/>
							<StatCard
								value={cluster.open_count.toLocaleString()}
								label={t("clusterDetail.stats.openTickets")}
								loading={false}
							/>
							<StatCard
								value={`$${(blendedRatePerHour * (timeToTake / 60) * cluster.ticket_count).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
								label={t("clusterDetail.stats.estMoneySaved")}
								loading={false}
							/>
							<StatCard
								value={`${Math.floor((timeToTake * cluster.ticket_count) / 60)}hr`}
								label={
									<span className="flex items-center gap-1">
										{t("clusterDetail.stats.estTimeSaved")}
										<Tooltip>
											<TooltipTrigger asChild>
												<Info className="size-3 text-muted-foreground" />
											</TooltipTrigger>
											<TooltipContent
												side="bottom"
												className="max-w-[220px] text-xs"
											>
												{timeToTake} min ×{" "}
												{cluster.ticket_count.toLocaleString()} tickets
											</TooltipContent>
										</Tooltip>
									</span>
								}
								loading={false}
							/>
						</StatGroup>

						{/* Table Section */}
						<ClusterDetailTable
							key={id}
							clusterId={id}
							totalCount={cluster.ticket_count}
							openCount={cluster.open_count}
						/>
					</div>
				</div>
			</div>
		</RitaLayout>
	);
}
