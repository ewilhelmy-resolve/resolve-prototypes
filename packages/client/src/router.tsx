import {
	createBrowserRouter,
	Navigate,
	RouterProvider,
} from "react-router-dom";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { RoleProtectedRoute } from "./components/auth/RoleProtectedRoute";
import { RootLayout } from "./components/layouts/RootLayout";
import { useFeatureFlag } from "./hooks/useFeatureFlags";
import AgentBuilderPageV2 from "./pages/AgentBuilderPage";
import AgentChatPage from "./pages/AgentChatPage";
import AgentsPage from "./pages/AgentsPage";
import AgentTestPage from "./pages/AgentTestPage";
import ChatV1Page from "./pages/ChatV1Page";
import ClusterDetailPage from "./pages/ClusterDetailPage";
import ClustersPage from "./pages/ClustersPage";
import ConnectionSourceDetailPage from "./pages/ConnectionSourceDetailPage";
import ContactPage from "./pages/ContactPage";
import CredentialSetupPage from "./pages/CredentialSetupPage";
import DevToolsPage from "./pages/DevToolsPage";
import DropdownTestPage from "./pages/DropdownTestPage";
import FilesV1Page from "./pages/FilesV1Page";
import HelpPage from "./pages/HelpPage";
import IframeChatPage from "./pages/IframeChatPage";
import InviteAcceptPage from "./pages/InviteAcceptPage";
import JarvisSharePage from "./pages/JarvisSharePage";
import LinkExpiredPage from "./pages/LinkExpiredPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import SchemaRendererDemo from "./pages/SchemaRendererDemo";
import { SignUpPage } from "./pages/SignUpPage";
import ItsmSources from "./pages/settings/ItsmSources";
import KnowledgeSources from "./pages/settings/KnowledgeSources";
import ProfilePage from "./pages/settings/ProfilePage";
import TermsOfService from "./pages/TermsOfService";
import TicketDetailPage from "./pages/TicketDetailPage";
import UsersSettingsPage from "./pages/UsersSettingsPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { VerifyEmailSentPage } from "./pages/VerifyEmailSentPage";
import WorkflowsPage from "./pages/WorkflowsPage";

// Feature-flagged agents gate
function AgentsFeatureGate({ children }: { children: React.ReactNode }) {
	const enableAgents = useFeatureFlag("ENABLE_AGENTS");
	if (!enableAgents) return <Navigate to="/chat" replace />;
	return children;
}

const router = createBrowserRouter([
	// Root redirect
	{
		path: "/",
		element: <Navigate to="/chat" replace />,
	},
	// Main application routes
	{
		path: "/chat",
		element: (
			<ProtectedRoute>
				<ChatV1Page />
			</ProtectedRoute>
		),
	},
	{
		path: "/chat/:conversationId",
		element: (
			<ProtectedRoute>
				<ChatV1Page />
			</ProtectedRoute>
		),
	},
	// Iframe-embeddable chat routes (minimal UI, public access)
	// NO ProtectedRoute - uses public-guest-user session
	{
		path: "/iframe/chat",
		element: <IframeChatPage />,
	},
	{
		path: "/iframe/chat/:conversationId",
		element: <IframeChatPage />,
	},
	// Shareable conversation page (public, read-only)
	{
		path: "/jarvis/:conversationId",
		element: <JarvisSharePage />,
	},
	// Redirect /agent to /agents
	{
		path: "/agent",
		element: <Navigate to="/agents" replace />,
	},
	// Agent builder
	{
		path: "/agents",
		element: (
			<RoleProtectedRoute allowedRoles={["owner", "admin"]}>
				<AgentsFeatureGate>
					<AgentsPage />
				</AgentsFeatureGate>
			</RoleProtectedRoute>
		),
	},
	{
		path: "/agents/create",
		element: (
			<RoleProtectedRoute allowedRoles={["owner", "admin"]}>
				<AgentsFeatureGate>
					<AgentBuilderPageV2 />
				</AgentsFeatureGate>
			</RoleProtectedRoute>
		),
	},
	{
		path: "/agents/:id",
		element: (
			<RoleProtectedRoute allowedRoles={["owner", "admin"]}>
				<AgentsFeatureGate>
					<AgentBuilderPageV2 />
				</AgentsFeatureGate>
			</RoleProtectedRoute>
		),
	},
	{
		path: "/agents/:id/chat",
		element: (
			<RoleProtectedRoute allowedRoles={["owner", "admin"]}>
				<AgentsFeatureGate>
					<AgentChatPage />
				</AgentsFeatureGate>
			</RoleProtectedRoute>
		),
	},
	{
		path: "/agents/:id/test",
		element: (
			<RoleProtectedRoute allowedRoles={["owner", "admin"]}>
				<AgentsFeatureGate>
					<AgentTestPage />
				</AgentsFeatureGate>
			</RoleProtectedRoute>
		),
	},
	{
		path: "/agents/test",
		element: (
			<RoleProtectedRoute allowedRoles={["owner", "admin"]}>
				<AgentsFeatureGate>
					<AgentTestPage />
				</AgentsFeatureGate>
			</RoleProtectedRoute>
		),
	},
	// JIRITA - Workflow builder (dev tool, feature-flagged)
	{
		path: "/jirita",
		element: (
			<ProtectedRoute>
				<WorkflowsPage />
			</ProtectedRoute>
		),
	},
	{
		path: "/content",
		element: (
			<RoleProtectedRoute allowedRoles={["owner", "admin"]}>
				<FilesV1Page />
			</RoleProtectedRoute>
		),
	},
	{
		path: "/tickets",
		element: (
			<RoleProtectedRoute allowedRoles={["owner", "admin"]}>
				<ClustersPage />
			</RoleProtectedRoute>
		),
	},
	{
		path: "/tickets/:id",
		element: (
			<RoleProtectedRoute allowedRoles={["owner", "admin"]}>
				<ClusterDetailPage />
			</RoleProtectedRoute>
		),
	},
	{
		path: "/tickets/:clusterId/:ticketId",
		element: (
			<RoleProtectedRoute allowedRoles={["owner", "admin"]}>
				<TicketDetailPage />
			</RoleProtectedRoute>
		),
	},
	{
		path: "/settings",
		element: <Navigate to="/settings/profile" replace />,
	},
	{
		path: "/settings/profile",
		element: (
			<ProtectedRoute>
				<ProfilePage />
			</ProtectedRoute>
		),
	},
	{
		path: "/settings/connections",
		element: <Navigate to="/settings/connections/knowledge" replace />,
	},
	{
		path: "/settings/connections/knowledge",
		element: (
			<ProtectedRoute>
				<KnowledgeSources />
			</ProtectedRoute>
		),
	},
	{
		path: "/settings/connections/knowledge/:id",
		element: (
			<ProtectedRoute>
				<ConnectionSourceDetailPage mode="knowledge" />
			</ProtectedRoute>
		),
	},
	{
		path: "/settings/connections/itsm",
		element: (
			<ProtectedRoute>
				<ItsmSources />
			</ProtectedRoute>
		),
	},
	{
		path: "/settings/connections/itsm/:id",
		element: (
			<ProtectedRoute>
				<ConnectionSourceDetailPage mode="itsm" />
			</ProtectedRoute>
		),
	},
	{
		path: "/settings/users",
		element: (
			<ProtectedRoute>
				<UsersSettingsPage />
			</ProtectedRoute>
		),
	},
	// Placeholder routes - to be implemented with UX designs
	{
		path: "/account",
		element: (
			<ProtectedRoute>
				{/* Account settings - awaiting UX design */}
				<div>Account settings page (coming soon)</div>
			</ProtectedRoute>
		),
	},
	{
		path: "/contact",
		element: (
			<ProtectedRoute>
				<ContactPage />
			</ProtectedRoute>
		),
	},
	{
		path: "/help",
		element: (
			<ProtectedRoute>
				<HelpPage />
			</ProtectedRoute>
		),
	},
	{
		path: "/payment",
		element: (
			<ProtectedRoute>
				{/* Payment management - awaiting UX design */}
				<div>Payment management (coming soon)</div>
			</ProtectedRoute>
		),
	},
	{
		path: "/analytics",
		element: (
			<ProtectedRoute>
				{/* Analytics dashboard - future feature */}
				<div>Analytics dashboard (future feature)</div>
			</ProtectedRoute>
		),
	},
	{
		path: "/devtools",
		element: (
			<ProtectedRoute>
				<DevToolsPage />
			</ProtectedRoute>
		),
	},
	// Test pages (public)
	{
		path: "/test/dropdown",
		element: <DropdownTestPage />,
	},
	// Schema renderer demo (public, no backend required)
	{
		path: "/demo/schema-renderer",
		element: <SchemaRendererDemo />,
	},
	// Credential setup (public, magic link for IT admins)
	{
		path: "/credential-setup",
		element: <CredentialSetupPage />,
	},
	// Link expired page (public, for invalid/expired magic links)
	{
		path: "/link-expired",
		element: <LinkExpiredPage />,
	},
	// Auth and utility pages
	{
		path: "/",
		element: <RootLayout />,
		children: [
			{
				path: "/login",
				element: <SignUpPage />,
			},
			{
				path: "/verify-email",
				element: <VerifyEmailPage />,
			},
			{
				path: "/verify-email-sent",
				element: <VerifyEmailSentPage />,
			},
			{
				path: "/invite",
				element: <InviteAcceptPage />,
			},
			{
				path: "/terms-of-service",
				element: <TermsOfService />,
			},
			{
				path: "*",
				element: <NotFoundPage />,
			},
		],
	},
]);

export function AppRouter() {
	return <RouterProvider router={router} />;
}
