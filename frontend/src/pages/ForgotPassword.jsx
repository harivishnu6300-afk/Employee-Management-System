import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2, KeyRound } from 'lucide-react';
import { authService } from '../services/authService';
import { useToast } from '../context/ToastContext';

export default function ForgotPassword() {
  const { showSuccess, showError } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetData, setResetData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      showError('Please enter your account email.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.forgotPassword(email);
      setResetData(res);
      showSuccess('Password reset link generated!');
    } catch (err) {
      showError(err.message || 'Could not process password reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
        </Link>
        <h3 className="text-xl font-bold text-slate-800">Forgot Password</h3>
        <p className="text-xs text-slate-500 mt-1">
          Enter your registered work email to receive password reset instructions.
        </p>
      </div>

      {resetData ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-950">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              Reset Link Ready!
            </div>
            <p className="text-xs text-emerald-800 mt-1.5 leading-relaxed">
              In production, an automated reset email is dispatched. For instant testing and evaluation in this environment, you can use the direct reset link below:
            </p>
          </div>

          <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs font-mono break-all text-slate-700">
            {resetData.resetToken}
          </div>

          <Link
            to={`/reset-password?token=${resetData.resetToken}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-brand-700 transition"
          >
            <KeyRound className="w-4 h-4" />
            Proceed to Reset Password
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Work Email Address
            </label>
            <div className="relative rounded-xl shadow-xs">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alexander@company.com"
                className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 transition disabled:opacity-50"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Reset Instructions
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
