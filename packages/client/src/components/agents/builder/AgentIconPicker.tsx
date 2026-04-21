import { Bot, ChevronDown, Search } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { AVAILABLE_ICONS } from "@/constants/agentIcons";
import { ICON_COLORS } from "@/constants/agents";
import { useClickOutside } from "@/hooks/useClickOutside";
import { cn } from "@/lib/utils";

function formatIconName(id: string): string {
	return id
		.split("-")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

export interface AgentIconPickerProps {
	iconId: string;
	iconColorId: string;
	onIconChange: (iconId: string) => void;
	onColorChange: (colorId: string) => void;
}

export function AgentIconPicker({
	iconId,
	iconColorId,
	onIconChange,
	onColorChange,
}: AgentIconPickerProps) {
	const { t } = useTranslation("agents");
	const [showIconPicker, setShowIconPicker] = useState(false);
	const [iconSearchQuery, setIconSearchQuery] = useState("");
	const iconPickerRef = useRef<HTMLDivElement>(null);

	const handleIconPickerClose = useCallback(() => {
		if (showIconPicker) {
			setShowIconPicker(false);
			setIconSearchQuery("");
		}
	}, [showIconPicker]);

	useClickOutside(iconPickerRef, handleIconPickerClose);

	return (
		<div ref={iconPickerRef} className="relative flex items-center">
			<button
				onClick={() => setShowIconPicker(!showIconPicker)}
				className={cn(
					"size-[38px] rounded-lg flex items-center justify-center transition-colors",
					ICON_COLORS.find((c) => c.id === iconColorId)?.bg || "bg-violet-200",
				)}
				aria-label={t("builder.iconPicker.changeIcon")}
			>
				{(() => {
					const iconData = AVAILABLE_ICONS.find((i) => i.id === iconId);
					const colorData = ICON_COLORS.find((c) => c.id === iconColorId);
					const IconComponent = (iconData?.icon || Bot) as React.ElementType;
					return (
						<IconComponent
							className={cn("size-6", colorData?.text || "text-white")}
						/>
					);
				})()}
			</button>
			<Button
				variant="ghost"
				size="icon"
				className="size-9"
				onClick={() => setShowIconPicker(!showIconPicker)}
			>
				<ChevronDown className="size-4" />
			</Button>

			{/* Icon Picker Dropdown */}
			{showIconPicker && (
				<div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border z-50 p-4">
					{/* Color selection */}
					<div className="mb-4">
						<p className="text-sm font-medium text-muted-foreground mb-2">
							{t("builder.iconPicker.colorLabel")}
						</p>
						<div className="grid grid-cols-7 gap-1 justify-items-center">
							{ICON_COLORS.map((color) => (
								<button
									key={color.id}
									onClick={() => onColorChange(color.id)}
									className={cn(
										"size-10 rounded-full transition-all",
										color.bg,
										iconColorId === color.id
											? "ring-2 ring-offset-2 ring-primary"
											: "hover:scale-110",
									)}
									aria-label={t("builder.iconPicker.selectColor", {
										color: color.id,
									})}
								/>
							))}
						</div>
					</div>

					{/* Icon selection */}
					<div>
						<p className="text-sm font-medium text-muted-foreground mb-2">
							{t("builder.iconPicker.iconLabel")}
						</p>
						<div className="relative mb-3">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
							<Input
								placeholder={t("builder.iconPicker.searchPlaceholder")}
								value={iconSearchQuery}
								onChange={(e) => setIconSearchQuery(e.target.value)}
								className="pl-9"
							/>
						</div>
						<TooltipProvider delayDuration={200}>
							<div className="grid grid-cols-7 gap-1 max-h-[320px] overflow-y-auto">
								{AVAILABLE_ICONS.filter((icon) => {
									if (!iconSearchQuery) return true;
									const query = iconSearchQuery.toLowerCase();
									return (
										icon.id.includes(query) ||
										icon.keywords.some((k) => k.includes(query))
									);
								}).map((iconData) => {
									const IconComponent = iconData.icon as React.ElementType;
									const iconName = formatIconName(iconData.id);
									return (
										<Tooltip key={iconData.id}>
											<TooltipTrigger asChild>
												<button
													type="button"
													onClick={() => {
														onIconChange(iconData.id);
														setShowIconPicker(false);
														setIconSearchQuery("");
													}}
													aria-label={iconName}
													className={cn(
														"size-10 rounded-lg flex items-center justify-center transition-colors",
														iconId === iconData.id
															? "bg-primary/10 text-primary"
															: "hover:bg-muted text-muted-foreground hover:text-foreground",
													)}
												>
													<IconComponent className="size-5" />
												</button>
											</TooltipTrigger>
											<TooltipContent
												side="top"
												sideOffset={6}
												arrowClassName="hidden"
											>
												{iconName}
											</TooltipContent>
										</Tooltip>
									);
								})}
							</div>
						</TooltipProvider>
					</div>
				</div>
			)}
		</div>
	);
}
