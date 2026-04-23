import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEMO_STEPS } from "@/lib/tickets/demo-script";
import { usePresenterStore } from "@/stores/presenterStore";

export function PresenterPanel() {
	const active = usePresenterStore((s) => s.active);
	const step = usePresenterStore((s) => s.step);
	const enter = usePresenterStore((s) => s.enter);
	const exit = usePresenterStore((s) => s.exit);
	const setStep = usePresenterStore((s) => s.setStep);
	const navigate = useNavigate();
	const location = useLocation();

	// Auto-activate from ?demo=v4
	const activatedRef = useRef(false);
	useEffect(() => {
		if (activatedRef.current) return;
		const params = new URLSearchParams(location.search);
		if (params.get("demo") === "v4" && !active) {
			activatedRef.current = true;
			enter();
			DEMO_STEPS[0].onEnter?.({ navigate });
		}
	}, [location.search, active, enter, navigate]);

	// Run onEnter side effects when the step changes while active
	const stepRef = useRef(-1);
	useEffect(() => {
		if (!active) {
			stepRef.current = -1;
			return;
		}
		if (stepRef.current === step) return;
		stepRef.current = step;
		DEMO_STEPS[step]?.onEnter?.({ navigate });
	}, [active, step, navigate]);

	// Keyboard navigation
	useEffect(() => {
		if (!active) return;
		const onKey = (e: KeyboardEvent) => {
			// Skip if focus is in an input/textarea
			const tag = (e.target as HTMLElement | null)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA") return;
			if (e.key === "ArrowRight") {
				e.preventDefault();
				setStep(Math.min(step + 1, DEMO_STEPS.length - 1));
			} else if (e.key === "ArrowLeft") {
				e.preventDefault();
				setStep(Math.max(step - 1, 0));
			} else if (e.key === "Escape") {
				e.preventDefault();
				exit();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [active, step, setStep, exit]);

	// Only expose the presenter on tickets pages — other features shouldn't see
	// the floating Demo pill or the tickets-specific step overlay.
	const onTicketsRoute = location.pathname.startsWith("/tickets");
	if (!onTicketsRoute) return null;

	if (!active) {
		// Small "Play demo" floating trigger when not active — useful without the URL
		return (
			<Button
				variant="outline"
				size="sm"
				onClick={() => {
					enter();
					DEMO_STEPS[0].onEnter?.({ navigate });
				}}
				className="fixed bottom-4 right-4 z-50 gap-1.5 shadow-md bg-background/90 backdrop-blur"
			>
				<Play className="size-3" />
				Demo
			</Button>
		);
	}

	const current = DEMO_STEPS[step];
	const total = DEMO_STEPS.length;

	return (
		<div
			className={cn(
				"fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
				"flex items-stretch gap-0 rounded-xl border bg-background shadow-xl",
				"max-w-[720px] w-[92vw]",
			)}
			role="region"
			aria-label="Demo presenter"
		>
			{/* Step counter */}
			<div className="flex flex-col items-center justify-center px-3 py-2 border-r bg-muted/40 rounded-l-xl">
				<div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
					Step
				</div>
				<div className="text-lg font-semibold tabular-nums leading-none">
					{step + 1}
					<span className="text-muted-foreground text-xs">/{total}</span>
				</div>
			</div>

			{/* Title + line */}
			<div className="flex-1 min-w-0 px-4 py-2 flex flex-col justify-center">
				<div className="text-sm font-semibold truncate">{current.title}</div>
				<div className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
					{current.line}
				</div>
			</div>

			{/* Controls */}
			<div className="flex items-center gap-0.5 px-2 py-2 border-l">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setStep(Math.max(step - 1, 0))}
					disabled={step === 0}
					className="size-8"
					aria-label="Previous step"
				>
					<ChevronLeft className="size-4" />
				</Button>
				<Button
					variant="default"
					size="icon"
					onClick={() => setStep(Math.min(step + 1, total - 1))}
					disabled={step === total - 1}
					className="size-8"
					aria-label="Next step"
				>
					<ChevronRight className="size-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					onClick={exit}
					className="size-8"
					aria-label="Exit demo"
					title="Exit (Esc)"
				>
					<X className="size-4" />
				</Button>
			</div>
		</div>
	);
}
