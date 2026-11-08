import React from 'react';
import { X, CheckCheck, Bell, MessageSquare, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { translations } from '../translations';

export default function NotificationsModal({ isOpen, onClose, notifications, onMarkRead, onMarkAllRead, onSelectTicket, lang }) {
  if (!isOpen) return null;
  const t = translations[lang] || translations.bn;

  const getIcon = (type) => {
    switch (type) {
      case 'ticket_resolved':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'ticket_reply':
        return <MessageSquare className="w-5 h-5 text-blue-600" />;
      case 'escalation':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-[#DA291C] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{t.notifications}</h3>
              <p className="text-xs text-slate-500">আপডেট ও নোটিশের বিবরণী</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notifications.some(n => !n.is_read) && (
              <button
                onClick={onMarkAllRead}
                className="text-xs font-semibold text-[#DA291C] hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-red-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{t.mark_all_read}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="max-h-[60vh] overflow-y-auto p-4 divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-500">নতুন কোনো নোটিফিকেশন নেই</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.is_read) onMarkRead(notif.id);
                  if (notif.ticket_id) {
                    onSelectTicket(notif.ticket_id);
                    onClose();
                  }
                }}
                className={`py-3.5 px-3 rounded-xl transition-all cursor-pointer flex items-start gap-3.5 ${
                  notif.is_read ? 'hover:bg-slate-50 opacity-80' : 'bg-red-50/40 hover:bg-red-50/70 border border-red-100/60'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>
                  {notif.ticket_id && (
                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#DA291C]">
                      <span>টিকেট দেখুন ({notif.ticket_id})</span>
                      <span>→</span>
                    </div>
                  )}
                </div>
                {!notif.is_read && (
                  <span className="w-2 h-2 rounded-full bg-[#DA291C] mt-2 shrink-0"></span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}
