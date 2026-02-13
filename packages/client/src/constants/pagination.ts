/**
 * Chat message pagination configuration
 */
export const CHAT_PAGINATION = {
	INITIAL_PAGE_SIZE: 100, // Initial conversation load
	PAGE_SIZE: 50, // Pagination batch size
} as const;

/**
 * Sidebar conversation list pagination configuration
 */
export const SIDEBAR_PAGINATION = {
	PAGE_SIZE: 16, // Min number of conversations to load per page in the sidebar
} as const;
