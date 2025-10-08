import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Loader2, Mail } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function VerifyEmailSentPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResendVerification = async () => {
    if (!email) {
      setResendError('Email address is required');
      return;
    }

    setIsResending(true);
    setResendError(null);
    setResendMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification email');
      }

      setResendMessage('Verification email sent! Please check your inbox.');
    } catch (error) {
      setResendError(error instanceof Error ? error.message : 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#0d1637] to-[#1a2549] px-4">
      <div className="flex flex-col items-center text-center space-y-6 max-w-md">
        {/* Success Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-600 px-4 py-1.5 rounded-full text-sm font-medium">
          <Mail className="h-4 w-4" />
          Signup successful!
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl md:text-5xl font-light text-white leading-tight">
          Please check your email to verify.
        </h1>

        {/* Email Display */}
        {email && (
          <p className="text-gray-400">
            We sent a verification link to <span className="text-white font-medium">{email}</span>
          </p>
        )}

        {/* Success/Error Messages */}
        {resendMessage && (
          <div className="w-full p-4 bg-green-900/20 border border-green-700 rounded-lg">
            <p className="text-sm text-green-300">{resendMessage}</p>
          </div>
        )}

        {resendError && (
          <div className="w-full p-4 bg-red-900/20 border border-red-700 rounded-lg">
            <p className="text-sm text-red-300">{resendError}</p>
          </div>
        )}

        {/* Resend Verification */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Didn't receive the email?</span>
          <Button
            onClick={handleResendVerification}
            disabled={isResending || !email}
            variant="link"
            className="text-blue-500 hover:text-blue-400 p-0 h-auto transition-colors disabled:opacity-50"
          >
            {isResending ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Sending...
              </span>
            ) : (
              'Resend verification'
            )}
          </Button>
        </div>

        {/* Back to Login */}
        <div className="pt-4">
          <a
            href="/"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Back to login
          </a>
        </div>
      </div>
    </div>
  );
}
