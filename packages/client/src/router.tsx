import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { RootLayout } from './components/layouts/RootLayout';
import { LoginPage } from './pages/LoginPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { NotFoundPage } from './pages/NotFoundPage';
import ChatV1Page from './pages/ChatV1Page';
import FilesV1Page from './pages/FilesV1Page';
import UsersV1Page from './pages/UsersV1Page';
import SettingsV1Page from './pages/SettingsV1Page';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const router = createBrowserRouter([
  // Root redirect - make v1 the default experience
  {
    path: '/',
    element: <Navigate to="/v1/chat" replace />
  },
  // V1 Routes - Modern Rita Architecture (default experience)
  {
    path: '/v1',
    children: [
      {
        path: '',
        element: <Navigate to="/v1/chat" replace />
      },
      {
        path: 'chat',
        element: (
          <ProtectedRoute>
            <ChatV1Page />
          </ProtectedRoute>
        )
      },
      {
        path: 'chat/:conversationId',
        element: (
          <ProtectedRoute>
            <ChatV1Page />
          </ProtectedRoute>
        )
      },
      {
        path: 'files',
        element: (
          <ProtectedRoute>
            <FilesV1Page />
          </ProtectedRoute>
        )
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute>
            <UsersV1Page />
          </ProtectedRoute>
        )
      }
    ]
  },
  // Settings route with unique layout
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <SettingsV1Page />
      </ProtectedRoute>
    )
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