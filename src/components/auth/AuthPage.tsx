import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react';

type Mode = 'login' | 'register';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  textColor: string;
  criteria: { label: string; met: boolean }[];
}

function evaluatePassword(password: string): PasswordStrength {
  const criteria = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character', met: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'`~\/]/.test(password) },
  ];
  const score = criteria.filter((c) => c.met).length;

  if (score <= 1) return { score, label: 'Very weak', color: 'bg-red-500', textColor: 'text-red-400', criteria };
  if (score === 2) return { score, label: 'Weak', color: 'bg-orange-500', textColor: 'text-orange-400', criteria };
  if (score === 3) return { score, label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-400', criteria };
  if (score === 4) return { score, label: 'Strong', color: 'bg-green-500', textColor: 'text-green-400', criteria };
  return { score, label: 'Very strong', color: 'bg-emerald-500', textColor: 'text-emerald-400', criteria };
}

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: '',
    username: '',
    displayName: '',
    password: '',
    confirmPassword: '',
    identifier: '',
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setForm({ email: '', username: '', displayName: '', password: '', confirmPassword: '', identifier: '' });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const strength = mode === 'register' && form.password ? evaluatePassword(form.password) : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match. Please re-enter your password.');
        return;
      }
      const s = evaluatePassword(form.password);
      if (s.score < 4) {
        setError('Password is too weak. It must be at least 8 characters and include uppercase, lowercase, a number, and a special character.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.identifier, form.password);
      } else {
        await register({
          email: form.email,
          username: form.username,
          displayName: form.displayName,
          password: form.password,
        });
      }
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message ?? 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const errorSuggestsRegister =
    error &&
    (error.toLowerCase().includes('no account found') ||
      error.toLowerCase().includes('would you like to create'));

  const errorSuggestsLogin =
    error &&
    (error.toLowerCase().includes('already exists') ||
      error.toLowerCase().includes('try signing in'));

  return (
    <div className="min-h-screen bg-base-950 flex items-center justify-center p-4">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Glow blob */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <span className="text-xl font-semibold tracking-tight">Nexus</span>
        </div>

        {/* Card */}
        <div className="bg-base-800 border border-border rounded-xl p-6">
          {/* Tab switcher */}
          <div className="flex bg-base-900 rounded-lg p-1 mb-6">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={cn(
                  'flex-1 py-1.5 text-sm font-medium rounded-md transition-all duration-150',
                  mode === m
                    ? 'bg-base-600 text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'login' ? (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Email or username
                </label>
                <input
                  className="nexus-input"
                  placeholder="you@example.com"
                  value={form.identifier}
                  onChange={set('identifier')}
                  required
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    className="nexus-input"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={set('email')}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Username
                    </label>
                    <input
                      className="nexus-input"
                      placeholder="handle"
                      value={form.username}
                      onChange={set('username')}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Display name
                    </label>
                    <input
                      className="nexus-input"
                      placeholder="Your name"
                      value={form.displayName}
                      onChange={set('displayName')}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="nexus-input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength indicator */}
              {mode === 'register' && form.password && strength && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-all duration-300',
                          i <= strength.score ? strength.color : 'bg-base-700',
                        )}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn('text-xs font-medium', strength.textColor)}>
                      {strength.label}
                    </span>
                    <span className="text-xs text-text-muted">
                      {strength.criteria.filter((c) => !c.met).map((c) => c.label).join(' · ') || 'All criteria met'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm password (register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={cn(
                      'nexus-input pr-10',
                      form.confirmPassword &&
                        (form.password === form.confirmPassword
                          ? 'border-green-500/50 focus:border-green-500'
                          : 'border-red-500/50 focus:border-red-500'),
                    )}
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                )}
                {form.confirmPassword && form.password === form.confirmPassword && (
                  <p className="text-xs text-green-400 mt-1">Passwords match</p>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded px-3 py-2 space-y-1.5">
                <p>{error}</p>
                {errorSuggestsRegister && (
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
                  >
                    Create an account →
                  </button>
                )}
                {errorSuggestsLogin && (
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
                  >
                    Sign in instead →
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="nexus-btn-primary w-full mt-1"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-text-muted mt-4">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
