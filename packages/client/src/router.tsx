import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { RootLayout } from './components/layouts/RootLayout';
import { LoginPage } from './pages/LoginPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ChatPage } from './pages/ChatPage';
import { FilesPage } from './pages/FilesPage';
import { NotFoundPage } from './pages/NotFoundPage';
import FigmaTestPage from './pages/FigmaTestPage';
import FigmaLoginPage from './test/login/FigmaLoginPage';
import ChatbotPage from './test/chatbot/ChatbotPage';
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
  // Legacy routes and auth pages
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
        path: '/chat',
        element: (
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/chat/:conversationId',
        element: (
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/files',
        element: (
          <ProtectedRoute>
            <FilesPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/figma-test',
        element: <FigmaTestPage />
      },
      {
        path: '/figma-login-poc',
        element: <FigmaLoginPage />
      },
      {
        path: '/chatbot-test',
        element: <ChatbotPage />
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