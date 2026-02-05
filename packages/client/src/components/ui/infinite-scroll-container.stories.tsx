import { useState, useCallback } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { InfiniteScrollContainer } from "./infinite-scroll-container";

const meta: Meta<typeof InfiniteScrollContainer> = {
	component: InfiniteScrollContainer,
	title: "Components/Data Display/Infinite Scroll Container",
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"A reusable container for infinite scroll functionality. Automatically triggers loading when user scrolls near the bottom.",
			},
		},
	},
	args: {
		onLoadMore: fn(),
		hasMore: true,
		isLoading: false,
	},
	decorators: [
		(Story) => (
			<div className="max-w-2xl">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof InfiniteScrollContainer>;

// Sample card component for stories
const SampleCard = ({ index }: { index: number }) => (
	<div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
		<h3 className="font-semibold">Item {index + 1}</h3>
		<p className="text-sm text-muted-foreground">
			Sample content for infinite scroll demo
		</p>
	</div>
);

// Static sample cards
const SampleCards = ({ count = 6 }: { count?: number }) => (
	<div className="grid grid-cols-2 gap-4">
		{Array.from({ length: count }).map((_, i) => (
			<SampleCard key={i} index={i} />
		))}
	</div>
);

/**
 * Interactive infinite scroll demo component
 */
const InteractiveDemo = () => {
	const [items, setItems] = useState<number[]>([0, 1, 2, 3, 4, 5]);
	const [isLoading, setIsLoading] = useState(false);
	const [hasMore, setHasMore] = useState(true);

	const loadMore = useCallback(() => {
		if (isLoading) return;

		setIsLoading(true);

		// Simulate API delay
		setTimeout(() => {
			setItems((prev) => {
				const newItems = Array.from(
					{ length: 6 },
					(_, i) => prev.length + i,
				);
				const allItems = [...prev, ...newItems];

				// Stop after 30 items
				if (allItems.length >= 30) {
					setHasMore(false);
				}

				return allItems;
			});
			setIsLoading(false);
		}, 1000);
	}, [isLoading]);

	return (
		<div className="h-[400px] overflow-auto rounded-lg border">
			<InfiniteScrollContainer
				hasMore={hasMore}
				isLoading={isLoading}
				onLoadMore={loadMore}
				endMessage="You've reached the end!"
				className="p-4"
			>
				<div className="grid grid-cols-2 gap-4">
					{items.map((index) => (
						<SampleCard key={index} index={index} />
					))}
				</div>
			</InfiniteScrollContainer>
		</div>
	);
};

/**
 * Interactive demo - scroll down to load more items.
 * Loading stops after 30 items.
 */
export const Interactive: Story = {
	render: () => <InteractiveDemo />,
	parameters: {
		docs: {
			description: {
				story:
					"Scroll down to trigger loading more items. This demo loads 6 items at a time and stops after 30 total items.",
			},
		},
	},
};

export const Default: Story = {
	args: {
		hasMore: true,
		isLoading: false,
		children: <SampleCards />,
	},
	parameters: {
		docs: {
			description: {
				story: "Default state with more items available to load.",
			},
		},
	},
};

export const Loading: Story = {
	args: {
		hasMore: true,
		isLoading: true,
		children: <SampleCards />,
	},
	parameters: {
		docs: {
			description: {
				story: "Loading state shows a spinner while fetching more items.",
			},
		},
	},
};

export const NoMoreItems: Story = {
	args: {
		hasMore: false,
		isLoading: false,
		endMessage: "No more items to load",
		children: <SampleCards count={3} />,
	},
	parameters: {
		docs: {
			description: {
				story: "When all items are loaded, shows an optional end message.",
			},
		},
	},
};

export const CustomLoadingComponent: Story = {
	args: {
		hasMore: true,
		isLoading: true,
		loadingComponent: (
			<div className="flex items-center gap-2 text-primary">
				<span className="animate-pulse">Loading more...</span>
			</div>
		),
		children: <SampleCards />,
	},
	parameters: {
		docs: {
			description: {
				story:
					"Custom loading component can be provided via the loadingComponent prop.",
			},
		},
	},
};

export const Disabled: Story = {
	args: {
		hasMore: true,
		isLoading: false,
		enabled: false,
		children: <SampleCards />,
	},
	parameters: {
		docs: {
			description: {
				story: "When disabled, the infinite scroll detection is paused.",
			},
		},
	},
};

export const WithClassName: Story = {
	args: {
		hasMore: true,
		isLoading: false,
		className: "bg-muted/50 p-4 rounded-lg",
		children: <SampleCards count={4} />,
	},
	parameters: {
		docs: {
			description: {
				story: "Custom className can be applied to the container.",
			},
		},
	},
};
