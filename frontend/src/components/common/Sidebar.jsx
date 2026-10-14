import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  Building2,
  BarChart3,
  Bell,
  Settings,
  Shield,
  X,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export default function Sidebar({ isOpen, onClose }) {
  const { user, isAdmin, isHR, isManager } = useAuth();
  const { isConnected } = useSocket();

  const isStaffElevated = isAdmin || isHR || isManager;

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'hr', 'manager', 'employee']
    },
    {
      label: 'Employees',
      path: '/employees',
      icon: Users,
      roles: ['admin', 'hr', 'manager']
    },
    {
      label: 'Attendance',
      path: '/attendance',
      icon: CalendarCheck,
      roles: ['admin', 'hr', 'manager', 'employee']
    },
    {
      label: 'Leave Management',
      path: '/leaves',
      icon: CalendarDays,
      roles: ['admin', 'hr', 'manager', 'employee']
    },
    {
      label: 'Departments',
      path: '/departments',
      icon: Building2,
      roles: ['admin', 'hr', 'manager']
    },
    {
      label: 'Reports',
      path: '/reports',
      icon: BarChart3,
      roles: ['admin', 'hr', 'manager']
    },
    {
      label: 'Notifications',
      path: '/notifications',
      icon: Bell,
      roles: ['admin', 'hr', 'manager', 'employee']
    },
    {
      label: 'Settings',
      path: '/settings',
      icon: Settings,
      roles: ['admin', 'hr', 'manager', 'employee']
    }
  ];

  const userRole = (user?.role_name || '').toLowerCase();
  const filteredNav = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 left-0 z-45 h-full w-64 flex flex-col justify-between border-r border-slate-200/80 bg-white transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header */}
        <div>
          <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-700 to-indigo-500 text-white shadow-md shadow-brand-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-slate-900 leading-tight">
                  WorkSphere
                </h1>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-600">
                  EMS Portal
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-3">
            <p className="px-3 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Menu Navigation
            </p>
            <nav className="space-y-1">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                        isActive
                          ? 'bg-brand-50 text-brand-700 shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={`h-4 w-4 shrink-0 transition ${
                            isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Profile / System Status card */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/70 shadow-xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="relative">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.first_name || 'User'}
                    className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                    {(user?.first_name || user?.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span
                  className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                    isConnected ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                  title={isConnected ? 'Live Socket Connected' : 'Reconnecting...'}
                />
              </div>

              <div className="truncate">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.email}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-medium text-slate-500 truncate">
                    {user?.designation || user?.role_name || 'Staff'}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 pl-1">
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                  user?.role_name === 'Admin'
                    ? 'bg-rose-100 text-rose-700'
                    : user?.role_name === 'HR'
                    ? 'bg-purple-100 text-purple-700'
                    : user?.role_name === 'Manager'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {user?.role_name || 'Staff'}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
