import { useState, type FormEvent } from 'react';
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import Logo from '@/components/Logo';
import { useTheme } from '@/theme/ThemeProvider';
import { Moon, Sun } from 'lucide-react';

type Mode = 'signin' | 'signup' | 'forgot';

export default function AuthScreen() {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === 'forgot') {
      const { error } = await resetPassword(email);
      setLoading(false);
      if (error) {
        setError(error);
        return;
      }
      setSuccess('Password reset instructions have been sent to your email.');
      return;
    }

    if (mode === 'signup') {
      const { error } = await signUp(email, password);
      setLoading(false);
      if (error) {
        setError(error);
        return;
      }
      setSuccess('Account created! You are now signed in.');
      return;
    }

    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setGoogleLoading(false);
      setError(error);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setSuccess(null);
    setPassword('');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10 dark:bg-neutral-950">
      <button
        onClick={toggleTheme}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </button>

      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo className="h-12 w-12" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Chitty Manager</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {mode === 'signup' && 'Create your organizer account'}
              {mode === 'signin' && 'Sign in to manage your Chitties'}
              {mode === 'forgot' && 'Reset your password'}
            </p>
          </div>
        </div>

        <div className="card p-6 sm:p-8">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-3.5 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/50 dark:text-green-400">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {mode === 'forgot' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Email">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input pl-10"
                    disabled={loading}
                  />
                </div>
              </Field>

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Instructions'}
              </button>

              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="flex w-full items-center justify-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Email">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="input pl-10"
                      disabled={loading || googleLoading}
                    />
                  </div>
                </Field>

                <Field label="Password">
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                      className="input pl-10 pr-10"
                      disabled={loading || googleLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors hover:text-neutral-700 dark:hover:text-neutral-200"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

                {mode === 'signin' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button type="submit" className="btn-primary w-full" disabled={loading || googleLoading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'signup' ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-neutral-400 dark:bg-neutral-900 dark:text-neutral-500">
                    or
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                className="btn-secondary w-full"
                disabled={loading || googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </button>

              <p className="pt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
                {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
                  className="font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  {mode === 'signup' ? 'Sign in' : 'Sign up'}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      {children}
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
