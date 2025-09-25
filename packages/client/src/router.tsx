import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { RootLayout } from './components/layouts/RootLayout';
import { LoginPage } from './pages/LoginPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ChatPage } from './pages/ChatPage';
import { FilesPage } from './pages/FilesPage';
import FigmaTestPage from './pages/FigmaTestPage';
import FigmaLoginPage from './test/login/FigmaLoginPage';
import ChatbotPage from './test/chatbot/ChatbotPage';
import RitaLayout from './components/RitaLayout';
import RitaLayoutWithChat from './components/RitaLayoutWithChat';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const router = createBrowserRouter([
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
        path: '/rita-layout',
        element: <RitaLayout />
      },
      {
        path: '/rita-chat',
        element: (
          <ProtectedRoute>
            <RitaLayoutWithChat />
          </ProtectedRoute>
        )
      },
      {
        path: '/rita-chat/:conversationId',
        element: (
          <ProtectedRoute>
            <RitaLayoutWithChat />
          </ProtectedRoute>
        )
      },
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        )
      }
    ]
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}