import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { MessageSquare, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Verification failed');
        }

        setStatus('success');
        setMessage(data.message);
        setUserEmail(data.email);
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Verification failed');
      }
    };

    verifyEmail();
  }, [searchParams]);

  const handleSignIn = () => {
    login(); // Direct redirect to Keycloak
  };

  const handleRetrySignup = () => {
    navigate('/login'); // Back to signup page
  };

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
                Email Verification
              </h1>
              <p className="text-muted-foreground text-sm">
                {status === 'loading' && 'Verifying your email address...'}
                {status === 'success' && 'Your email has been verified successfully!'}
                {status === 'error' && 'There was an issue verifying your email.'}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* Loading State */}
            {status === 'loading' && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 text-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-muted-foreground">Verifying...</span>
                </div>
              </div>
            )}

            {/* Success State */}
            {status === 'success' && (
              <div className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">{message}</p>
                    {userEmail && (
                      <p className="text-xs text-muted-foreground">
                        Email: <span className="font-medium">{userEmail}</span>
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleSignIn}
                  className={cn(
                    "w-full h-12 text-base font-medium transition-all duration-200",
                    "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary",
                    "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span>Sign In</span>
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </Button>
              </div>
            )}

            {/* Error State */}
            {status === 'error' && (
              <div className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg p-4">
                      {message}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleRetrySignup}
                    className={cn(
                      "w-full h-12 text-base font-medium transition-all duration-200",
                      "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary",
                      "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span>Try Signing Up Again</span>
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </Button>

                  <Button
                    onClick={handleSignIn}
                    variant="outline"
                    className="w-full h-12 text-base font-medium"
                  >
                    Sign In with Keycloak
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}