import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { MessageSquare, Loader2, Sparkles, UserPlus } from 'lucide-react';
import { cn } from '../lib/utils';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function LoginPage() {
  const { authenticated, login, loading } = useAuth();
  const [signupForm, setSignupForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    password: ''
  });
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupMessage, setSignupMessage] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError(null);
    setSignupMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      setSignupMessage(data.message);
      setSignupForm({
        firstName: '',
        lastName: '',
        email: '',
        company: '',
        password: ''
      });
    } catch (error) {
      setSignupError(error instanceof Error ? error.message : 'Signup failed');
    } finally {
      setSignupLoading(false);
    }
  };

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
        <Card className="border-0 shadow-2xl backdrop-blur-sm bg-card/95 p-8 space-y-6">
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
                  Join the future of chat
                </p>
              </div>
            </div>
          </div>

          {/* Signup Form */}
          <div className="space-y-4">
            {signupMessage && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">{signupMessage}</p>
              </div>
            )}

            {signupError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{signupError}</p>
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="text"
                  placeholder="First Name"
                  value={signupForm.firstName}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                  disabled={signupLoading}
                  className="h-11"
                />
                <Input
                  type="text"
                  placeholder="Last Name"
                  value={signupForm.lastName}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, lastName: e.target.value }))}
                  required
                  disabled={signupLoading}
                  className="h-11"
                />
              </div>
              <Input
                type="email"
                placeholder="Email Address"
                value={signupForm.email}
                onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                required
                disabled={signupLoading}
                className="h-11"
              />
              <Input
                type="text"
                placeholder="Company"
                value={signupForm.company}
                onChange={(e) => setSignupForm(prev => ({ ...prev, company: e.target.value }))}
                required
                disabled={signupLoading}
                className="h-11"
              />
              <Input
                type="password"
                placeholder="Password"
                value={signupForm.password}
                onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                required
                disabled={signupLoading}
                className="h-11"
              />
              <Button
                type="submit"
                disabled={signupLoading}
                className={cn(
                  "w-full h-12 text-base font-medium transition-all duration-200",
                  "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary",
                  "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                )}
              >
                {signupLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    <span>Create Account</span>
                  </div>
                )}
              </Button>
            </form>

            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                Your account will be created and you can sign in immediately.
              </p>
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <button
                  onClick={login}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}