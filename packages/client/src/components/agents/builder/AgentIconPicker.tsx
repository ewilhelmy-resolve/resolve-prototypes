import { Bot, ChevronDown, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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

const GRID_COLS = 7;

function gridKeyMove(
	key: string,
	current: number,
	total: number,
): number | null {
	switch (key) {
		case "ArrowRight":
			return Math.min(current + 1, total - 1);
		case "ArrowLeft":
			return Math.max(current - 1, 0);
		case "ArrowDown":
			return Math.min(current + GRID_COLS, total - 1);
		case "ArrowUp":
			return Math.max(current - GRID_COLS, 0);
		case "Home":
			return 0;
		case "End":
			return total - 1;
		default:
			return null;
	}
}

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
	const [openTooltipId, setOpenTooltipId] = useState<string | null>(null);
	const iconPickerRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const colorButtonsRef = useRef<Array<HTMLButtonElement | null>>([]);
	const iconButtonsRef = useRef<Array<HTMLButtonElement | null>>([]);

	const handleIconPickerClose = useCallback(() => {
		if (showIconPicker) {
			setShowIconPicker(false);
			setIconSearchQuery("");
		}
	}, [showIconPicker]);

	useClickOutside(iconPickerRef, handleIconPickerClose);

	useEffect(() => {
		if (!showIconPicker) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				setShowIconPicker(false);
				setIconSearchQuery("");
				triggerRef.current?.focus();
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [showIconPicker]);

	const makeGridKeyHandler =
		(
			refs: React.MutableRefObject<Array<HTMLButtonElement | null>>,
			total: number,
		) =>
		(currentIndex: number) =>
		(e: React.KeyboardEvent<HTMLButtonElement>) => {
			const next = gridKeyMove(e.key, currentIndex, total);
			if (next === null || next === currentIndex) return;
			e.preventDefault();
			refs.current[next]?.focus();
		};

	const filteredIcons = AVAILABLE_ICONS.filter((icon) => {
		if (!iconSearchQuery) return true;
		const query = iconSearchQuery.toLowerCase();
		return (
			icon.id.includes(query) || icon.keywords.some((k) => k.includes(query))
		);
	});

	const colorKeyHandler = makeGridKeyHandler(
		colorButtonsRef,
		ICON_COLORS.length,
	);
	const iconKeyHandler = makeGridKeyHandler(
		iconButtonsRef,
		filteredIcons.length,
	);

	return (
		<div ref={iconPickerRef} className="relative flex items-center">
			<button
				ref={triggerRef}
				onClick={() => setShowIconPicker(!showIconPicker)}
				aria-haspopup="dialog"
				aria-expanded={showIconPicker}
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
				<div
					role="dialog"
					aria-label={t("builder.iconPicker.changeIcon")}
					className="absolute top-full right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border z-50 p-4"
				>
					{/* Color selection */}
					<div className="mb-4">
						<p
							id="icon-picker-color-label"
							className="text-sm font-medium text-muted-foreground mb-2"
						>
							{t("builder.iconPicker.colorLabel")}
						</p>
						<div
							role="radiogroup"
							aria-labelledby="icon-picker-color-label"
							className="grid grid-cols-7 gap-1 justify-items-center"
						>
							{ICON_COLORS.map((color, index) => {
								const isSelected = iconColorId === color.id;
								const isFirst = index === 0;
								const isFocusable =
									isSelected ||
									(!ICON_COLORS.some((c) => c.id === iconColorId) && isFirst);
								return (
									// biome-ignore lint/a11y/useSemanticElements: custom radio-group pattern (colored circle buttons)
									<button
										key={color.id}
										ref={(el) => {
											colorButtonsRef.current[index] = el;
										}}
										type="button"
										role="radio"
										aria-checked={isSelected}
										tabIndex={isFocusable ? 0 : -1}
										onClick={() => onColorChange(color.id)}
										onKeyDown={colorKeyHandler(index)}
										className={cn(
											"size-10 rounded-full transition-all",
											color.bg,
											isSelected
												? "ring-2 ring-offset-2 ring-primary"
												: "hover:scale-110",
										)}
										aria-label={t("builder.iconPicker.selectColor", {
											color: color.id,
										})}
									/>
								);
							})}
						</div>
					</div>

					{/* Icon selection */}
					<div>
						<p
							id="icon-picker-icon-label"
							className="text-sm font-medium text-muted-foreground mb-2"
						>
							{t("builder.iconPicker.iconLabel")}
						</p>
						<div className="relative mb-3">
							<Search
								className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
								aria-hidden="true"
							/>
							<Input
								placeholder={t("builder.iconPicker.searchPlaceholder")}
								aria-label={t("builder.iconPicker.searchPlaceholder")}
								value={iconSearchQuery}
								onChange={(e) => setIconSearchQuery(e.target.value)}
								className="pl-9"
							/>
						</div>
						<TooltipProvider delayDuration={200}>
							<div
								role="radiogroup"
								aria-labelledby="icon-picker-icon-label"
								className="grid grid-cols-7 gap-1 max-h-[320px] overflow-y-auto"
								onScroll={() => setOpenTooltipId(null)}
							>
								{filteredIcons.map((iconData, index) => {
									const IconComponent = iconData.icon as React.ElementType;
									const iconName = formatIconName(iconData.id);
									const isSelected = iconId === iconData.id;
									const isFocusable =
										isSelected ||
										(!filteredIcons.some((i) => i.id === iconId) &&
											index === 0);
									return (
										<Tooltip
											key={iconData.id}
											open={openTooltipId === iconData.id}
											onOpenChange={(open) =>
												setOpenTooltipId(open ? iconData.id : null)
											}
										>
											<TooltipTrigger asChild>
												{/* biome-ignore lint/a11y/useSemanticElements: custom radio-group pattern (icon buttons) */}
												<button
													ref={(el) => {
														iconButtonsRef.current[index] = el;
													}}
													type="button"
													role="radio"
													aria-checked={isSelected}
													tabIndex={isFocusable ? 0 : -1}
													onClick={() => {
														onIconChange(iconData.id);
														setShowIconPicker(false);
														setIconSearchQuery("");
														triggerRef.current?.focus();
													}}
													onKeyDown={iconKeyHandler(index)}
													aria-label={iconName}
													className={cn(
														"size-10 rounded-lg flex items-center justify-center transition-colors",
														isSelected
															? "bg-primary/10 text-primary"
															: "hover:bg-muted text-muted-foreground hover:text-foreground",
													)}
												>
													<IconComponent
														className="size-5"
														aria-hidden="true"
													/>
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
