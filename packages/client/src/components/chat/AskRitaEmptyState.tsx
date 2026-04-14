import { Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { SOURCE_METADATA, SOURCES } from "@/constants/connectionSources";
import { useProfilePermissions } from "@/hooks/api/useProfile";
import {
	MAX_FILE_SIZE_MB,
	SUPPORTED_DOCUMENT_EXTENSIONS,
} from "@/lib/constants";

// Custom empty state component for Ask RITA
export function AskRitaEmptyState({
	hasKnowledge,
	onUpload,
	onConnections,
}: {
	hasKnowledge: boolean;
	onUpload: () => void;
	onConnections: () => void;
}) {
	const { t } = useTranslation("chat");
	const { isOwnerOrAdmin } = useProfilePermissions();
	// Connection source icons to display
	const connectionSources = [
		{
			type: SOURCES.CONFLUENCE,
			icon: `/connections/icon_${SOURCES.CONFLUENCE}.svg`,
		},
		{
			type: SOURCES.SHAREPOINT,
			icon: `/connections/icon_${SOURCES.SHAREPOINT}.svg`,
		},
		{
			type: SOURCES.SERVICENOW,
			icon: `/connections/icon_${SOURCES.SERVICENOW}.svg`,
		},
	];

	return (
		<div className="flex flex-col items-center justify-center gap-8 py-12">
			<div className="text-center space-y-2">
				<h2 className="text-3xl font-semibold text-foreground">
					{t("emptyState.title")}
				</h2>
				<p className="text-base text-muted-foreground">
					{hasKnowledge
						? t("emptyState.descriptionWithKnowledge")
						: t("emptyState.descriptionNoKnowledge")}
				</p>
			</div>

			{!hasKnowledge && isOwnerOrAdmin() && (
				<>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
						{/* Upload a file card */}
						<Card className="cursor-pointer" onClick={onUpload}>
							<CardHeader>
								<div className="flex items-start justify-between">
									<CardTitle className="text-lg font-medium">
										{t("emptyState.uploadTitle")}
									</CardTitle>
									<Upload className="h-5 w-5 text-muted-foreground" />
								</div>
								<CardDescription className="text-base">
									{t("emptyState.uploadDescription")}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">
									{t("emptyState.fileConstraints", {
										extensions: SUPPORTED_DOCUMENT_EXTENSIONS.join(", "),
										size: MAX_FILE_SIZE_MB,
									})}
								</p>
							</CardContent>
						</Card>

						{/* Add a connection card */}
						<Card className="cursor-pointer" onClick={onConnections}>
							<CardHeader>
								<CardTitle className="text-lg font-medium">
									{t("emptyState.connectionTitle")}
								</CardTitle>
								<CardDescription className="text-base">
									{t("emptyState.connectionDescription")}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex gap-3">
									{connectionSources.map((source) => (
										<div
											key={source.type}
											className="w-8 h-8 flex items-center justify-center"
										>
											<img
												src={source.icon}
												alt={SOURCE_METADATA[source.type]?.title || source.type}
												className="w-6 h-6"
											/>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</div>

					<p className="text-xs text-muted-foreground text-center max-w-md">
						{t("emptyState.privacyInfo")}
					</p>
				</>
			)}
		</div>
	);
}
