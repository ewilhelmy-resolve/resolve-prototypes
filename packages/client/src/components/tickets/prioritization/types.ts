export type ViewMode =
	| "scatter"
	| "bubbleStrip"
	| "divergingBars"
	| "rankedList";

export interface ChartPoint {
	id: string;
	name: string;
	hasKnowledge: boolean;
	ticketCount: number;
	/** Normalized volume 0-100 */
	y: number;
	fill: string;
}

export interface PrioritizationViewProps {
	points: ChartPoint[];
	highlightId?: string;
	onPointClick: (point: ChartPoint) => void;
}
