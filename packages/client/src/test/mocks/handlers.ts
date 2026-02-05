/**
 * Common mock handlers for testing
 */
import { vi } from "vitest";

/**
 * Mock for useNavigate from react-router
 */
export const mockNavigate = vi.fn();

export const mockUseNavigate = () => mockNavigate;

/**
 * Mock for window.location
 */
export const mockLocation = {
	href: "http://localhost:3000",
	pathname: "/",
	search: "",
	hash: "",
	origin: "http://localhost:3000",
	assign: vi.fn(),
	replace: vi.fn(),
	reload: vi.fn(),
};

/**
 * Mock for localStorage
 */
export const createMockStorage = () => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] || null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		get length() {
			return Object.keys(store).length;
		},
		key: vi.fn((index: number) => Object.keys(store)[index] || null),
	};
};

/**
 * Reset all mock handlers
 */
export function resetAllMocks() {
	mockNavigate.mockReset();
	mockLocation.assign.mockReset();
	mockLocation.replace.mockReset();
	mockLocation.reload.mockReset();
}
