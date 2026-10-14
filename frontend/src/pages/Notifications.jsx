import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  Info,
  CheckCheck,
  ExternalLink,
  Filter
} from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

export default function Notifications() {
  const navigate = useNavigate();
  const { subscribe } = useSocket();
  const { showSuccess, showError } = useToast();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationService.getAll({
        unreadOnly: unreadOnly ? 'true' : 'false',
        limit: 100
      });
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      showError('Failed to fetch notifications.');
    } finally {
      setLoading(false);
    }
  }, [unreadOnly, showError]);

  useEffect(() => {
    fetchNotifications();

    const unsub = subscribe('notification', () => {
      fetchNotifications();
    });

    return () => unsub();
  }, [fetchNotifications, subscribe]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      showError('Failed to update status.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      showSuccess('All notifications marked as read.');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      showError('Failed to mark all as read.');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'leave':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'attendance':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'warning':
      case 'danger':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-brand-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            Notifications Center
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time corporate alerts, leave approvals, attendance updates, and announcements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              unreadOnly
                ? 'border-brand-300 bg-brand-50 text-brand-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            {unreadOnly ? 'Showing Unread' : 'Filter Unread'}
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Notifications Container */}
      <Card
        title="Alerts Feed"
        subtitle={unreadCount > 0 ? `${unreadCount} unread message(s)` : 'All caught up!'}
      >
        {loading ? (
          <LoadingSpinner text="Retrieving alerts..." />
        ) : notifications.length === 0 ? (
          <EmptyState
            title="No notifications"
            description="You don't have any notifications at this moment."
            icon={Bell}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.is_read) handleMarkAsRead(n.id);
                  if (n.link) navigate(n.link);
                }}
                className={`py-4 px-3 sm:px-4 -mx-6 flex items-start gap-4 transition cursor-pointer hover:bg-slate-50 ${
                  !n.is_read ? 'bg-brand-50/25' : ''
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-2xs">
                  {getTypeIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      {n.title}
                      {!n.is_read && (
                        <span className="h-2 w-2 rounded-full bg-brand-600" />
                      )}
                    </p>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>

                  {n.link && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline mt-2">
                      Go to destination <ExternalLink className="w-3 h-3" />
                    </span>
                  )}
                </div>

                {!n.is_read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(n.id);
                    }}
                    className="p-1 text-slate-400 hover:text-brand-600 rounded-lg"
                    title="Mark as Read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
