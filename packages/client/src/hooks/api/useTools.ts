import { useInfiniteQuery } from "@tanstack/react-query";
import { toolsApi } from "@/services/api";

const TOOLS_PAGE_SIZE = 100;

export const toolKeys = {
	all: ["tools"] as const,
	lists: () => [...toolKeys.all, "list"] as const,
	list: (filters: Record<string, string | undefined>) =>
		[...toolKeys.lists(), filters] as const,
};

export function useTools(filters?: { search?: string; type?: string }) {
	return useInfiniteQuery({
		queryKey: [...toolKeys.lists(), "infinite", filters ?? {}] as const,
		queryFn: async ({ pageParam }) => {
			const response = await toolsApi.list({
				...filters,
				limit: TOOLS_PAGE_SIZE,
				offset: pageParam,
			});
			return response;
		},
		getNextPageParam: (lastPage) => {
			if (!lastPage.hasMore) return undefined;
			return lastPage.offset + lastPage.limit;
		},
		initialPageParam: 0,
		staleTime: 1000 * 60 * 5,
		enabled: filters !== undefined,
	});
}
