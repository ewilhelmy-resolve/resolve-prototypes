import { useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

function getTabFromPath(pathname: string): string {
	if (pathname.startsWith("/pro/mcp")) return "mcp";
	return "dashboard";
}

export function ProSubNav() {
	const location = useLocation();
	const navigate = useNavigate();
	const activeTab = getTabFromPath(location.pathname);

	const handleTabChange = (value: string) => {
		switch (value) {
			case "dashboard":
				navigate("/pro");
				break;
			case "mcp":
				navigate("/pro/mcp");
				break;
		}
	};

	return (
		<nav className="border-b bg-background px-4" aria-label="Pro navigation">
			<Tabs value={activeTab} onValueChange={handleTabChange}>
				<TabsList className="h-10 bg-transparent rounded-none p-0 gap-0">
					<TabsTrigger
						value="dashboard"
						className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
					>
						Dashboard
					</TabsTrigger>
					<TabsTrigger
						value="mcp"
						className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
					>
						Dynamic MCPs
					</TabsTrigger>
				</TabsList>
			</Tabs>
		</nav>
	);
}
