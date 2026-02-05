import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Home } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function NotFoundPage() {
  const { authenticated } = useAuth();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-black via-[#0d1637] to-[#1a2549] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold tracking-tighter text-white">
            404
          </h1>
          <h2 className="text-2xl font-semibold text-gray-200">
            Page Not Found
          </h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex justify-center">
          <Button
            asChild
            className="h-12 px-6 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Link to={authenticated ? "/chat" : "/login"} aria-label="Go to homepage">
              <Home className="h-5 w-5 mr-2" />
              Go Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}