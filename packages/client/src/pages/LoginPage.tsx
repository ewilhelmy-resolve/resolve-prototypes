import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { MessageSquare, LogIn, Loader2, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

export function LoginPage() {
  const { authenticated, login, loading } = useAuth();

  // Redirect if already logged in
  if (authenticated && !loading) {
    return <Navigate to="/chat" replace />;
  }

  // Show a loading spinner while the auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="flex items-center gap-3 text-lg">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Card className="border-0 shadow-2xl backdrop-blur-sm bg-card/95 p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                <div className="relative bg-primary/10 p-4 rounded-full">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Rita Chat
              </h1>
              <div className="flex items-center justify-center gap-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-muted-foreground text-sm">
                  Welcome to the future of chat
                </p>
              </div>
            </div>
          </div>

          {/* Login Button */}
          <Button
            onClick={login}
            className={cn(
              "w-full h-12 text-base font-medium transition-all duration-200",
              "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary",
              "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
            )}
          >
            <div className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              <span>Sign In with Keycloak</span>
            </div>
          </Button>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-muted-foreground">
            You will be redirected to the official login page.
          </p>
        </div>
      </div>
    </div>
  );
}