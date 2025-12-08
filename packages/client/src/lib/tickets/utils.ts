import type { TicketPriority } from "@/components/tickets/ReviewAIResponseSheet";
import type { AIResponseData } from "@/components/tickets/AIResponseSection";
import { Sparkles, Zap, Network, type LucideIcon } from "lucide-react";

/**
 * AI Response type constants
 */
export const AI_RESPONSE_TYPE = {
	AUTO_RESPOND: "auto-respond",
	AUTO_POPULATE: "auto-populate",
	AUTO_RESOLVE: "auto-resolve",
} as const;

/**
 * AI Response types for ticket automation
 */
export type AIResponseType = (typeof AI_RESPONSE_TYPE)[keyof typeof AI_RESPONSE_TYPE];

/**
 * Configuration for each AI response type
 */
export interface AIResponseTypeConfig {
	type: AIResponseType;
	title: string;
	icon: LucideIcon;
	color: string;
	badgeClasses: string;
	comingSoon?: boolean;
}

/**
 * Centralized configuration for AI response types
 * Used by AIResponseSection and TicketDetailOverviewTab
 */
export const AI_RESPONSE_TYPES: Record<AIResponseType, AIResponseTypeConfig> = {
	"auto-respond": {
		type: "auto-respond",
		title: "Auto-Respond",
		icon: Sparkles,
		color: "text-purple-500",
		badgeClasses: "border-purple-500 bg-purple-50 text-purple-500",
	},
	"auto-populate": {
		type: "auto-populate",
		title: "Auto-Populate",
		icon: Zap,
		color: "text-green-500",
		badgeClasses: "border-green-500 bg-green-50 text-green-500",
	},
	"auto-resolve": {
		type: "auto-resolve",
		title: "Auto-Resolve",
		icon: Network,
		color: "text-blue-500",
		badgeClasses: "border-blue-500 bg-blue-50 text-blue-500",
		comingSoon: true,
	},
};

/**
 * Get AI response type configuration by type
 */
export function getAIResponseTypeConfig(type: AIResponseType): AIResponseTypeConfig {
	return AI_RESPONSE_TYPES[type];
}

/**
 * Get all AI response types as array (useful for mapping)
 */
export function getAllAIResponseTypes(): AIResponseTypeConfig[] {
	return Object.values(AI_RESPONSE_TYPES);
}

/**
 * Get badge color classes based on ticket priority level
 * 
 * @param priority - Ticket priority level
 * @returns Tailwind CSS classes for background, text, and border colors
 */
export function getPriorityColor(priority: TicketPriority): string {
	switch (priority) {
		case "critical":
			return "bg-red-50 text-red-800 border-red-400";
		case "high":
			return "bg-orange-50 text-orange-800 border-orange-400";
		case "medium":
			return "bg-yellow-50 text-yellow-800 border-yellow-400";
		case "low":
			return "bg-blue-50 text-blue-800 border-blue-400";
	}
}

/**
 * Get badge background color based on confidence score
 * 
 * @param score - Confidence score (0-100)
 * @returns Tailwind CSS background color class
 */
export function getConfidenceColor(score: number): string {
	if (score >= 90) return "bg-teal-500";
	if (score >= 75) return "bg-green-500";
	if (score >= 60) return "bg-yellow-500";
	return "bg-orange-500";
}

/**
 * Get confidence level label based on score
 * 
 * @param score - Confidence score (0-100)
 * @returns Human-readable confidence level
 */
export function getConfidenceLabel(score: number): string {
	if (score >= 90) return "strong";
	if (score >= 75) return "good";
	if (score >= 60) return "moderate";
	return "low";
}

/**
 * Format ticket priority for display (capitalize first letter)
 * 
 * @param priority - Ticket priority level
 * @returns Formatted priority string
 */
export function formatPriority(priority: TicketPriority): string {
	return priority.charAt(0).toUpperCase() + priority.slice(1);
}

/**
 * Ticket group data structure
 */
export interface TicketGroup {
	id: string;
	title: string;
	count: number;
	openCount: number;
	manualPercentage: number;
	automatedPercentage: number;
	knowledgeStatus: "found" | "gap";
	aiResponse: AIResponseData;
}

/**
 * Mock ticket groups data
 * TODO: Replace with actual API data
 */
export const MOCK_TICKET_GROUPS: Record<string, TicketGroup> = {
	"email-signatures": {
		id: "email-signatures",
		title: "Email Signatures",
		count: 976,
		openCount: 14,
		manualPercentage: 37,
		automatedPercentage: 0,
		knowledgeStatus: "found",
		aiResponse: {
			content: `Hi {name},

Thank you for reaching out about your email signature. I'd be happy to help you update it to reflect your new role.

Here are the steps to update your email signature:

• Open Outlook and navigate to File > Options > Mail
• Click on "Signatures" button
• Select your existing signature or create a new one
• Update your information (name, contact details)
• Click OK to save and apply to new messages

Please let me know if these steps resolve your issue. If you need any additional assistance with formatting or have questions, I'm here to help!`,
			kbArticles: [
				{ id: "KB0004", title: "Email Signature Configuration Guide" },
				{ id: "KB0012", title: "Outlook Profile Settings" },
				{ id: "KB0023", title: "Corporate Branding Guidelines" },
				{ id: "KB0034", title: "Email Template Best Practices" },
				{ id: "KB0045", title: "Troubleshooting Email Display" },
			],
			confidenceScore: 92,
		},
	},
	"password-resets": {
		id: "password-resets",
		title: "Password Resets",
		count: 743,
		openCount: 8,
		manualPercentage: 21,
		automatedPercentage: 0,
		knowledgeStatus: "found",
		aiResponse: {
			content: `Hi {name},

I understand you need help resetting your password. Here's how to do it:

• Go to the company portal login page
• Click "Forgot Password" below the sign-in button
• Enter your email address and click "Send Reset Link"
• Check your email for the reset link (also check spam folder)
• Click the link and create a new password following our security requirements

If you don't receive the email within 5 minutes, please let me know and I can assist further.`,
			kbArticles: [
				{ id: "KB0001", title: "Password Reset Guide" },
				{ id: "KB0015", title: "Password Security Requirements" },
			],
			confidenceScore: 88,
		},
	},
	"network-connectivity": {
		id: "network-connectivity",
		title: "Network Connectivity",
		count: 564,
		openCount: 23,
		manualPercentage: 7,
		automatedPercentage: 5,
		knowledgeStatus: "found",
		aiResponse: {
			content: `Hi {name},

I see you're experiencing network connectivity issues. Let's troubleshoot:

• First, check if other devices can connect to the network
• Try restarting your network adapter (disable/enable WiFi)
• Run the Windows Network Troubleshooter
• If on VPN, disconnect and reconnect
• Clear your DNS cache: Open CMD and run "ipconfig /flushdns"

If the issue persists after these steps, it may require IT to check the network infrastructure.`,
			kbArticles: [
				{ id: "KB0021", title: "Network Troubleshooting Guide" },
				{ id: "KB0022", title: "VPN Connection Issues" },
				{ id: "KB0033", title: "DNS Configuration" },
			],
			confidenceScore: 76,
		},
	},
	"vpn-issues": {
		id: "vpn-issues",
		title: "VPN Issues",
		count: 45,
		openCount: 3,
		manualPercentage: 39,
		automatedPercentage: 0,
		knowledgeStatus: "found",
		aiResponse: {
			content: `Hi {name},

I can help you troubleshoot your VPN connection issues:

• Ensure you have the latest VPN client installed
• Check your internet connection is stable
• Try disconnecting and reconnecting to the VPN
• If using split tunneling, verify your settings
• Restart the VPN service or your computer

If you continue to have issues, please provide your VPN client version and any error messages.`,
			kbArticles: [
				{ id: "KB0022", title: "VPN Connection Issues" },
				{ id: "KB0041", title: "VPN Client Installation" },
			],
			confidenceScore: 82,
		},
	},
	"application-crashes": {
		id: "application-crashes",
		title: "Application Crashes",
		count: 121,
		openCount: 5,
		manualPercentage: 27,
		automatedPercentage: 0,
		knowledgeStatus: "found",
		aiResponse: {
			content: `Hi {name},

I understand you're experiencing application crashes. Let's work through some troubleshooting steps:

• Check if the application is up to date
• Clear the application cache and temporary files
• Run the application as administrator
• Check for conflicting software or antivirus interference
• Review Windows Event Viewer for error details

If crashes continue, please share the error message or crash dump file for further analysis.`,
			kbArticles: [
				{ id: "KB0051", title: "Application Crash Troubleshooting" },
				{ id: "KB0052", title: "Event Viewer Analysis Guide" },
			],
			confidenceScore: 74,
		},
	},
	"system-overload": {
		id: "system-overload",
		title: "System Overload",
		count: 32,
		openCount: 4,
		manualPercentage: 17,
		automatedPercentage: 0,
		knowledgeStatus: "gap",
		aiResponse: {
			content: `Hi {name},

I see you're reporting system overload issues. Here are some initial steps to improve performance:

• Open Task Manager and identify high CPU/memory usage processes
• Close unnecessary applications and browser tabs
• Check for pending Windows updates
• Run Disk Cleanup to free up space
• Consider restarting your computer

If the issue persists, we may need to evaluate your system resources or scheduled tasks.`,
			kbArticles: [
				{ id: "KB0061", title: "System Performance Optimization" },
			],
			confidenceScore: 65,
		},
	},
	"signature-preferences": {
		id: "signature-preferences",
		title: "Signature Preferences",
		count: 21,
		openCount: 2,
		manualPercentage: 57,
		automatedPercentage: 0,
		knowledgeStatus: "gap",
		aiResponse: {
			content: `Hi {name},

Thank you for reaching out about signature preferences. I can help you customize your email signature:

• Access Outlook > File > Options > Mail > Signatures
• Choose which signature to use for new messages vs replies
• You can create multiple signatures for different purposes
• Add images, links, or formatted text as needed

Let me know if you need help with specific formatting or have branding requirements.`,
			kbArticles: [
				{ id: "KB0004", title: "Email Signature Configuration Guide" },
			],
			confidenceScore: 68,
		},
	},
	"performance-optimization": {
		id: "performance-optimization",
		title: "Performance Optimization",
		count: 11,
		openCount: 1,
		manualPercentage: 12,
		automatedPercentage: 0,
		knowledgeStatus: "gap",
		aiResponse: {
			content: `Hi {name},

I'd be happy to help optimize your system performance:

• Disable startup programs that aren't needed
• Update device drivers to the latest versions
• Defragment your hard drive (for HDD) or optimize SSD
• Increase virtual memory if needed
• Consider upgrading RAM or storage

Let me know your current system specs and I can provide more targeted recommendations.`,
			kbArticles: [
				{ id: "KB0061", title: "System Performance Optimization" },
				{ id: "KB0062", title: "Hardware Upgrade Guidelines" },
			],
			confidenceScore: 71,
		},
	},
	"connection-troubleshooting": {
		id: "connection-troubleshooting",
		title: "Connection Troubleshooting",
		count: 4,
		openCount: 1,
		manualPercentage: 57,
		automatedPercentage: 0,
		knowledgeStatus: "found",
		aiResponse: {
			content: `Hi {name},

Let's troubleshoot your connection issues step by step:

• Verify your network cable is properly connected (for wired)
• Check WiFi signal strength and move closer to router if weak
• Test with a different device to isolate the issue
• Power cycle your modem and router
• Run network diagnostics from Windows Settings

If the problem is isolated to your device, we may need to reset network settings.`,
			kbArticles: [
				{ id: "KB0021", title: "Network Troubleshooting Guide" },
				{ id: "KB0071", title: "WiFi Connection Best Practices" },
			],
			confidenceScore: 79,
		},
	},
};

/**
 * Get ticket group by ID
 */
export function getTicketGroup(id: string): TicketGroup | undefined {
	return MOCK_TICKET_GROUPS[id];
}

/**
 * Get all ticket groups as array
 */
export function getAllTicketGroups(): TicketGroup[] {
	return Object.values(MOCK_TICKET_GROUPS);
}

/**
 * Default mock AI response (fallback)
 * @deprecated Use getTicketGroup(id).aiResponse instead
 */
export const MOCK_AI_RESPONSE: AIResponseData =
	MOCK_TICKET_GROUPS["email-signatures"].aiResponse;
