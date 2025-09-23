import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Loader2 } from 'lucide-react';

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
    <div className="min-h-screen w-full bg-gradient-to-br from-black via-[#0d1637] to-[#1a2549] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-7xl lg:grid lg:grid-cols-2 gap-8 items-center">
        <div className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md">
            <div className="text-left space-y-2 mb-8">
              <h1 className="text-4xl font-bold tracking-tighter">
                Start your automation journey
              </h1>
              <p className="text-muted-foreground">
                Take 2 minutes to share your goals and challenges with IT automation.
              </p>
            </div>

            {/* Signup Form */}
            <div className="space-y-4">
              {signupMessage && (
                <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                  <p className="text-sm text-green-300">{signupMessage}</p>
                </div>
              )}

              {signupError && (
                <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
                  <p className="text-sm text-red-300">{signupError}</p>
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-gray-300">First Name</label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={signupForm.firstName}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                      disabled={signupLoading}
                      className="h-11 bg-black/20 text-white border-gray-700 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-gray-300">Last Name</label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={signupForm.lastName}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                      disabled={signupLoading}
                      className="h-11 bg-black/20 text-white border-gray-700 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-gray-300">Work email</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@acme.com"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    disabled={signupLoading}
                    className="h-11 bg-black/20 text-white border-gray-700 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="company" className="text-gray-300">Company name</label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="Acme Inc."
                    value={signupForm.company}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, company: e.target.value }))}
                    required
                    disabled={signupLoading}
                    className="h-11 bg-black/20 text-white border-gray-700 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-gray-300">Password</label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                    disabled={signupLoading}
                    className="h-11 bg-black/20 text-white border-gray-700 focus:border-blue-500"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={signupLoading}
                  className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {signupLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Creating Account...</span>
                    </div>
                  ) : (
                    <span>Continue</span>
                  )}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    onClick={login}
                    className="text-blue-400 hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </p>
              </div>
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