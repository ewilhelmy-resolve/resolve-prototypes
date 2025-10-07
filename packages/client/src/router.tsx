import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { RootLayout } from './components/layouts/RootLayout';
import { LoginPage } from './pages/LoginPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { NotFoundPage } from './pages/NotFoundPage';
import ContactPage from './pages/ContactPage';
import HelpPage from './pages/HelpPage';
import ChatV1Page from './pages/ChatV1Page';
import FilesV1Page from './pages/FilesV1Page';
import UsersV1Page from './pages/UsersV1Page';
import SettingsV1Page from './pages/SettingsV1Page';
import UsersSettingsPage from './pages/UsersSettingsPage';
import ConnectionSourceDetailPage from './pages/ConnectionSourceDetailPage';
import DevToolsPage from './pages/DevToolsPage';
import DropdownTestPage from './pages/DropdownTestPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const router = createBrowserRouter([
  // Root redirect
  {
    path: '/',
    element: <Navigate to="/chat" replace />
  },
  // Main application routes
  {
    path: '/chat',
    element: (
      <ProtectedRoute>
        <ChatV1Page />
      </ProtectedRoute>
    )
  },
  {
    path: '/chat/:conversationId',
    element: (
      <ProtectedRoute>
        <ChatV1Page />
      </ProtectedRoute>
    )
  },
  {
    path: '/content',
    element: (
      <ProtectedRoute>
        <FilesV1Page />
      </ProtectedRoute>
    )
  },
  {
    path: '/users',
    element: (
      <ProtectedRoute>
        <UsersV1Page />
      </ProtectedRoute>
    )
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <SettingsV1Page />
      </ProtectedRoute>
    )
  },
  {
    path: '/settings/connections',
    element: (
      <ProtectedRoute>
        <SettingsV1Page />
      </ProtectedRoute>
    )
  },
  {
    path: '/settings/connections/:sourceId',
    element: (
      <ProtectedRoute>
        <ConnectionSourceDetailPage />
      </ProtectedRoute>
    )
  },
  {
    path: '/settings/users',
    element: (
      <ProtectedRoute>
        <UsersSettingsPage />
      </ProtectedRoute>
    )
  },
  // Placeholder routes - to be implemented with UX designs
  {
    path: '/account',
    element: (
      <ProtectedRoute>
        {/* Account settings - awaiting UX design */}
        <div>Account settings page (coming soon)</div>
      </ProtectedRoute>
    )
  },
  {
    path: '/contact',
    element: (
      <ProtectedRoute>
        <ContactPage />
      </ProtectedRoute>
    )
  },
  {
    path: '/help',
    element: (
      <ProtectedRoute>
        <HelpPage />
      </ProtectedRoute>
    )
  },
  {
    path: '/payment',
    element: (
      <ProtectedRoute>
        {/* Payment management - awaiting UX design */}
        <div>Payment management (coming soon)</div>
      </ProtectedRoute>
    )
  },
  {
    path: '/analytics',
    element: (
      <ProtectedRoute>
        {/* Analytics dashboard - future feature */}
        <div>Analytics dashboard (future feature)</div>
      </ProtectedRoute>
    )
  },
  {
    path: '/devtools',
    element: (
      <ProtectedRoute>
        <DevToolsPage />
      </ProtectedRoute>
    )
  },
  // Test pages (public)
  {
    path: '/test/dropdown',
    element: <DropdownTestPage />
  },
  // Auth and utility pages
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: '/login',
        element: <LoginPage />
      },
      {
        path: '/verify-email',
        element: <VerifyEmailPage />
      },
      {
        path: '*',
        element: <NotFoundPage />
      }
    ]
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}