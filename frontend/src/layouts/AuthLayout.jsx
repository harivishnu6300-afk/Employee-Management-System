import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, ArrowRight, LogOut, LayoutDashboard } from 'lucide-react';

export default function AuthLayout() {
  const { isAuthenticated, loading, user, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-xs text-slate-500 font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50 selection:bg-brand-500 selection:text-white">
      {/* If an active session exists, show friendly banner allowing 1-click jump to dashboard or quick sign-out */}
      {isAuthenticated && (
        <div className="sm:mx-auto sm:w-full sm:max-w-md mb-4 px-4 sm:px-0">
          <div className="bg-brand-50/90 border border-brand-200 rounded-2xl p-3 flex items-center justify-between text-xs text-brand-900 shadow-xs">
            <span className="truncate pr-2">
              Active session: <strong>{user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.email}</strong>
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/dashboard"
                className="flex items-center gap-1 font-bold text-brand-700 hover:text-brand-900 bg-white px-2.5 py-1 rounded-lg border border-brand-200 shadow-2xs"
              >
                <LayoutDashboard className="w-3 h-3" /> Dashboard
              </Link>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-800 bg-white px-2 py-1 rounded-lg border border-rose-200 shadow-2xs"
                title="Sign out of current account"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-700 to-indigo-500 text-white shadow-lg shadow-brand-500/25 mb-4">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          WorkSphere Portal
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Enterprise Employee & Workforce Management
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl sm:px-10 border border-slate-200/80">
          <Outlet />
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">
          &copy; {new Date().getFullYear()} WorkSphere Global Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
}
