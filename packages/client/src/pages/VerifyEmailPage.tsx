import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen w-full bg-gradient-to-br from-black via-[#0d1637] to-[#1a2549] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-7xl lg:grid lg:grid-cols-2 gap-8 items-center">
        <div className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md">
            <div className="text-left space-y-2 mb-8">
              <h1 className="text-4xl font-bold tracking-tighter">
                Email Verification
              </h1>
              <p className="text-muted-foreground">
                {status === 'loading' && 'Verifying your email address...'}
                {status === 'success' && 'Your email has been verified successfully!'}
                {status === 'error' && 'There was an issue verifying your email.'}
              </p>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {/* Loading State */}
              {status === 'loading' && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3 text-lg">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                    <span className="text-muted-foreground">Verifying...</span>
                  </div>
                </div>
              )}

              {/* Success State */}
              {status === 'success' && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="flex items-center justify-center w-16 h-16 bg-green-900/30 rounded-full">
                      <CheckCircle className="h-8 w-8 text-green-400" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm text-muted-foreground">{message}</p>
                      {userEmail && (
                        <p className="text-xs text-muted-foreground">
                          Email: <span className="font-medium text-gray-300">{userEmail}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={handleSignIn}
                    className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white"
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
                    <div className="flex items-center justify-center w-16 h-16 bg-red-900/30 rounded-full">
                      <XCircle className="h-8 w-8 text-red-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-red-300 bg-red-900/20 border border-red-700 rounded-lg p-4">
                        {message}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={handleRetrySignup}
                      className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <div className="flex items-center gap-2">
                        <span>Try Signing Up Again</span>
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    </Button>

                    <Button
                      onClick={handleSignIn}
                      variant="outline"
                      className="w-full h-12 text-base font-medium border-gray-700 hover:bg-gray-800"
                    >
                      Sign In with Keycloak
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="hidden lg:flex items-center justify-center p-12 relative overflow-hidden">
          <img src="/ask-rita.png" alt="Ask Rita" className="object-contain w-auto h-[70%] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}