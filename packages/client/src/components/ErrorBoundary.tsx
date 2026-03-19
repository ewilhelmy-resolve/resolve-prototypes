import { Component, type ReactNode } from "react";

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
}

export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
		this.resetError = this.resetError.bind(this);
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		console.error("ErrorBoundary caught:", error, info);
	}

	resetError() {
		this.setState({ hasError: false, error: null });
	}

	render() {
		const { hasError, error } = this.state;
		const { children, fallback } = this.props;

		if (!hasError || error === null) {
			return children;
		}

		if (fallback !== undefined) {
			if (typeof fallback === "function") {
				return fallback(error, this.resetError);
			}
			return fallback;
		}

		// Default fallback UI
		return (
			<div className="flex h-full min-h-[400px] w-full items-center justify-center bg-background">
				<div className="flex flex-col items-center gap-4 p-6 text-center">
					<h2 className="text-xl font-semibold text-foreground">
						Something went wrong
					</h2>
					<p className="text-sm text-muted-foreground">
						An unexpected error occurred. Please try again.
					</p>
					<button
						type="button"
						onClick={this.resetError}
						className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}
}

export default ErrorBoundary;
