/**
 * Test wrapper providers for components requiring context
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

/**
 * Creates a fresh QueryClient for testing
 */
export function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0,
				staleTime: 0,
			},
			mutations: {
				retry: false,
			},
		},
	});
}

interface TestProvidersProps {
	children: ReactNode;
	queryClient?: QueryClient;
	initialEntries?: string[];
}

/**
 * Wrapper with all providers for component testing
 */
export function TestProviders({
	children,
	queryClient = createTestQueryClient(),
	initialEntries = ["/"],
}: TestProvidersProps) {
	return (
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
		</QueryClientProvider>
	);
}

/**
 * Wrapper with QueryClient only (no router)
 */
export function QueryWrapper({
	children,
	queryClient = createTestQueryClient(),
}: {
	children: ReactNode;
	queryClient?: QueryClient;
}) {
	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

/**
 * Wrapper with router only (no QueryClient)
 */
export function RouterWrapper({
	children,
	initialEntries = ["/"],
}: {
	children: ReactNode;
	initialEntries?: string[];
}) {
	return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
}
