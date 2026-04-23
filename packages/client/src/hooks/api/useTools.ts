import { useInfiniteQuery } from "@tanstack/react-query";
import { MOCK_TOOLS, demoDelay } from "@/data/mock-agents-demo";

const TOOLS_PAGE_SIZE = 100;

export const toolKeys = {
	all: ["tools"] as const,
	lists: () => [...toolKeys.all, "list"] as const,
	list: (filters: Record<string, string | undefined>) =>
		[...toolKeys.lists(), filters] as const,
};

// Demo branch: serve the static MOCK_TOOLS catalog so the Add skills modal
// stays populated when the backend tools endpoint is unavailable.
export function useTools(filters?: { search?: string; type?: string }) {
	return useInfiniteQuery({
		queryKey: [...toolKeys.lists(), "infinite", filters ?? {}] as const,
		queryFn: async () => {
			const needle = filters?.search?.toLowerCase() ?? "";
			const typed = filters?.type;
			const filtered = MOCK_TOOLS.filter((tool) => {
				if (typed && tool.type !== typed) return false;
				if (
					needle &&
					!(
						tool.name.toLowerCase().includes(needle) ||
						tool.description.toLowerCase().includes(needle)
					)
				)
					return false;
				return true;
			});
			return demoDelay({
				tools: filtered,
				limit: TOOLS_PAGE_SIZE,
				offset: 0,
				hasMore: false,
			});
		},
		getNextPageParam: () => undefined,
		initialPageParam: 0,
		staleTime: 1000 * 60 * 5,
		enabled: filters !== undefined,
	});
}
