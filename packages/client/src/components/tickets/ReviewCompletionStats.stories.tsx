import type { Meta, StoryObj } from "@storybook/react";
import { ReviewCompletionStats } from "./ReviewCompletionStats";

const meta: Meta<typeof ReviewCompletionStats> = {
	component: ReviewCompletionStats,
	title: "Features/Tickets/Review Completion Stats",
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Displays review session completion statistics with configurable content for different scenarios: first session vs subsequent, good vs poor results, and knowledge status.",
			},
		},
	},
	decorators: [
		(Story) => (
			<div className="w-[500px] h-[500px] flex items-center justify-center">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ReviewCompletionStats>;

/**
 * Aligned Responses - Good results in subsequent sessions
 * Shows confetti celebration for consistently meeting expectations
 */
export const AlignedResponses: Story = {
	args: {
		icon: "🙌",
		title: "Responses look aligned",
		subtitle: "AI responses reviewed in this session consistently met expectations.",
		trusted: 3,
		totalReviewed: 3,
		needsImprovement: 0,
		message: "Reviewed responses matched expected answers for this cluster.",
		proTip: "Consistent results contribute to automation readiness over time.",
		showConfetti: true,
	},
};

/**
 * Needs Improvement - Poor results in subsequent sessions
 * No confetti, shows wrench icon indicating work needed
 */
export const NeedsImprovement: Story = {
	args: {
		icon: "🔧",
		title: "Responses need improvement",
		subtitle: "Most AI responses reviewed in this session did not meet expectations.",
		trusted: 1,
		totalReviewed: 4,
		needsImprovement: 3,
		message: "Several responses lacked the information needed to respond accurately.",
		proTip: "Improving knowledge coverage often has the biggest impact on response quality.",
		showConfetti: false,
	},
};

/**
 * No Knowledge - Knowledge gap detected
 * Warning state when no knowledge articles exist for cluster
 */
export const NoKnowledge: Story = {
	args: {
		icon: "⚠️",
		title: "Nice start, knowledge missing",
		subtitle: "You've started reviewing AI responses for this cluster. Missing knowledge is likely impacting response quality.",
		trusted: 1,
		totalReviewed: 4,
		needsImprovement: 3,
		message: "Without knowledge, AI responses may lack the context needed to meet expectations.",
		proTip: "Early reviews help identify the most important gaps to address when creating knowledge.",
		showConfetti: false,
	},
};

/**
 * Early Signal - Mixed Results (First session, learning)
 * Books emoji indicates still gathering data
 */
export const EarlySignalMixed: Story = {
	args: {
		icon: "📚",
		title: "Nice start, still learning",
		subtitle: "You've started reviewing AI responses for this cluster. Based on this session, some responses did not meet expectations.",
		trusted: 1,
		totalReviewed: 4,
		needsImprovement: 3,
		message: "Some reviewed responses lacked the information needed to meet expectations.",
		proTip: "Reviewing a few more tickets helps surface patterns and edge cases faster.",
		showConfetti: false,
	},
};

/**
 * Early Signal - Good Results (First session, promising)
 * Sparkle emoji indicates positive early signs with confetti
 */
export const EarlySignalGood: Story = {
	args: {
		icon: "🎇",
		title: "Nice start, early signs look good",
		subtitle: "You've started reviewing AI responses for this cluster. Early feedback suggests responses are meeting expectations.",
		trusted: 3,
		totalReviewed: 4,
		needsImprovement: 1,
		message: "Responses reviewed so far generally met expectations.",
		proTip: "Continued review helps confirm patterns across more tickets.",
		showConfetti: true,
	},
};

/**
 * Perfect Score - All responses trusted
 */
export const PerfectScore: Story = {
	args: {
		icon: "🙌",
		title: "Responses look aligned",
		subtitle: "AI responses reviewed in this session consistently met expectations.",
		trusted: 5,
		totalReviewed: 5,
		needsImprovement: 0,
		message: "All responses matched expected answers for this cluster.",
		proTip: "This cluster may be ready for increased automation.",
		showConfetti: true,
	},
};

/**
 * Without Pro-tip - Minimal variant
 */
export const WithoutProTip: Story = {
	args: {
		icon: "🙌",
		title: "Responses look aligned",
		subtitle: "AI responses reviewed in this session consistently met expectations.",
		trusted: 3,
		totalReviewed: 3,
		needsImprovement: 0,
		message: "Reviewed responses matched expected answers for this cluster.",
		showConfetti: false,
	},
};
