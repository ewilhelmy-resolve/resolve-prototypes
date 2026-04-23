import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Journey } from "../types/avcj.js";

export interface RouteData {
	journeys: Journey[];
}

export async function extractRoutes(rootDir: string): Promise<RouteData> {
	const journeys: Journey[] = [];

	// Extract client routes from router.tsx
	const routerPath = path.join(rootDir, "packages/client/src/router.tsx");
	if (existsSync(routerPath)) {
		const clientRoutes = parseClientRouter(routerPath);
		for (const route of clientRoutes) {
			const id = routeToId(route.path);
			journeys.push({
				id,
				name: routeToName(route.path),
				description: `Client route: ${route.path}`,
				steps: [
					{
						order: 1,
						actor: "user",
						action: `Navigates to ${route.path}`,
						view: id,
						description: "",
					},
				],
				actors: [],
				views: [id],
				constraints: route.protected ? ["auth-middleware"] : [],
				tags: route.protected ? ["authenticated"] : ["public"],
			});
		}
	}

	return { journeys };
}

interface ClientRoute {
	path: string;
	component: string;
	protected: boolean;
}

function parseClientRouter(filePath: string): ClientRoute[] {
	const content = readFileSync(filePath, "utf-8");
	const routes: ClientRoute[] = [];

	// Match Route elements: <Route path="..." element={...} />
	// or path prop in createBrowserRouter
	const routeRegex = /path:\s*["'`]([^"'`]+)["'`]/g;
	for (const match of content.matchAll(routeRegex)) {
		const routePath = match[1];
		// Check if this route is within a ProtectedRoute or RoleProtectedRoute wrapper
		const contextStart = Math.max(0, match.index - 500);
		const context = content.slice(contextStart, match.index);
		const isProtected = /ProtectedRoute|RoleProtectedRoute/.test(context);

		// Extract component name from nearby element prop
		const afterMatch = content.slice(match.index, match.index + 200);
		const componentMatch = afterMatch.match(/element:\s*(?:<\s*)?(\w+)/);

		routes.push({
			path: routePath,
			component: componentMatch?.[1] || "Unknown",
			protected: isProtected,
		});
	}

	return routes;
}

function routeToId(route: string): string {
	return (
		route
			.replace(/^\//, "")
			.replace(/\/:[\w]+/g, "")
			.replace(/\//g, "-")
			.replace(/[^a-z0-9-]/gi, "")
			.toLowerCase() || "root"
	);
}

function routeToName(route: string): string {
	const parts = route
		.replace(/^\//, "")
		.replace(/\/:[\w]+/g, "")
		.split("/")
		.filter(Boolean);

	if (parts.length === 0) return "Root";

	return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" → ");
}
