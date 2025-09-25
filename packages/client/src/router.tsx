import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { RootLayout } from './components/layouts/RootLayout';
import { LoginPage } from './pages/LoginPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ChatPage } from './pages/ChatPage';
import { FilesPage } from './pages/FilesPage';
import { NotFoundPage } from './pages/NotFoundPage';
import FigmaTestPage from './pages/FigmaTestPage';
import FigmaLoginPage from './test/login/FigmaLoginPage';
import ChatbotPage from './test/chatbot/ChatbotPage';
import ChatUIv1 from './components/ChatUIv1';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const router = createBrowserRouter([
  {
    path: '/v1',
    element: <ChatUIv1 />
  },
  {
    path: '/v1/:conversationId',
    element: <ChatUIv1 />
  },
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
        path: '/',
        element: (
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        )
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