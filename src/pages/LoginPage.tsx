import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Compass,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  X,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isConfigured, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const destination = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeId.trim()) {
      setError('Please enter your Government Employee ID.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await login({
        employeeId: employeeId.trim(),
        password,
      });

      if (response.success) {
        const destination = (location.state as any)?.from?.pathname || '/dashboard';
        navigate(destination, { replace: true });
      } else {
        setError(response.error || 'Invalid employee ID or password.');
      }
    } catch {
      setError('Invalid employee ID or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotInput.trim()) return;

    setForgotSubmitting(true);
    try {
      const result = await resetPassword(forgotInput.trim());
      setForgotMessage(result.message);
    } catch {
      setForgotMessage('If this account exists, password reset instructions have been dispatched.');
    } finally {
      setForgotSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      {/* Background Cadastral Grid Texture */}
      <div className="fixed inset-0 bg-[linear-gradient(#1e293b_1px,transparent_1px),linear-gradient(90deg,#1e293b_1px,transparent_1px)] [background-size:32px_32px] opacity-40 pointer-events-none"></div>

      {/* Centered Login Card */}
      <div className="w-full max-w-md bg-white text-slate-900 border border-slate-200 rounded-lg p-6 sm:p-8 shadow-xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-teal-700 text-white shadow-xs mb-1">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">UrbanParcel</h1>
              <span className="bg-slate-100 text-teal-800 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border border-slate-200">AI</span>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Government GIS & Cadastral Information System
            </p>
          </div>
        </div>

        {/* Section Heading */}
        <div className="border-t border-slate-100 pt-4 text-center">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Government Employee Login
          </h2>
        </div>

        {/* Backend Configuration Notice (only if Supabase is unconfigured) */}
        {!isConfigured && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Authentication Setup Required</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-tight">
              Please configure <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">VITE_SUPABASE_URL</code> and <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">VITE_SUPABASE_ANON_KEY</code> in your <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[10px]">.env</code> file.
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded flex items-start gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee ID */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Government Employee ID
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="Enter your employee ID"
                autoComplete="username"
                className="w-full bg-slate-50 border border-slate-300 rounded pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 font-mono transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full bg-slate-50 border border-slate-300 rounded pl-9 pr-9 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 font-mono transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-xs rounded transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Verifying...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Forgot Password Link */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => {
              setForgotMessage(null);
              setForgotInput(employeeId);
              setShowForgotModal(true);
            }}
            className="text-xs text-teal-800 hover:text-teal-900 hover:underline font-medium cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        {/* Footer Security Notice */}
        <div className="pt-4 border-t border-slate-100 text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
            <span>Authorized Personnel Only</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Access is restricted to approved government employees.
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 border border-slate-200 rounded-lg max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Reset Password</h3>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotMessage ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <p className="leading-tight">{forgotMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3 text-xs">
                <p className="text-slate-600">
                  Enter your Government Employee ID or email address to receive password reset instructions.
                </p>
                <input
                  type="text"
                  value={forgotInput}
                  onChange={(e) => setForgotInput(e.target.value)}
                  placeholder="Enter employee ID or email"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-700 font-mono"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded text-slate-700 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotSubmitting}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium cursor-pointer flex items-center gap-1.5"
                  >
                    {forgotSubmitting ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Subtle Copyright Footer */}
      <footer className="mt-6 text-center text-xs text-slate-500 font-mono text-[11px] relative z-10">
        UrbanParcelAI | Cadastral Land Information System
      </footer>
    </div>
  );
};
