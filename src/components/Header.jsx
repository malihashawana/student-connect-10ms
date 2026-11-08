import React from 'react';
import { 
  Bell, 
  User, 
  LogOut, 
  Shield, 
  Award, 
  BookOpen, 
  Globe, 
  Layers
} from 'lucide-react';
import { translations } from '../translations';

export default function Header({ 
  user, 
  lang, 
  setLang, 
  onLogout, 
  onOpenNotifications, 
  onOpenProfile, 
  activeView, 
  setActiveView 
}) {
  const t = translations[lang] || translations.en;
  const isStaff = user?.role === 'staff' || user?.role === 'admin';
  const isCaptain = user?.role === 'captain';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand (DESIGN.md Section 1: Identity Red #E8001D + #931212) */}
          <div className="flex items-center gap-3">
            <div 
              onClick={() => setActiveView(isStaff ? 'staff_desk' : 'dashboard')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E8001D] to-[#931212] flex items-center justify-center text-white shadow-xs transition-transform group-hover:scale-105">
                <span className="font-extrabold text-lg tracking-tight">10</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base text-[#111827] tracking-tight">
                    Connect<span className="text-[#E8001D]">10ms</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 border border-slate-200">
                    Helpdesk
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  10 Minute School Student Support
                </span>
              </div>
            </div>

            {/* Navigation links for students & captains */}
            {!isStaff && (
              <nav className="hidden md:flex items-center gap-1.5 ml-6 border-l border-slate-200 pl-6">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeView === 'dashboard' 
                      ? 'bg-slate-100 text-[#111827] font-bold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {t.my_tickets}
                </button>
                <button
                  onClick={() => setActiveView('new_ticket')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeView === 'new_ticket' 
                      ? 'bg-[#E5F7ED] text-[#1CAB55] font-bold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {t.new_ticket}
                </button>
                {isCaptain && (
                  <button
                    onClick={() => setActiveView('captain_desk')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      activeView === 'captain_desk' 
                        ? 'bg-amber-50 text-amber-800 font-bold border border-amber-200' 
                        : 'text-amber-800 hover:bg-amber-50/60'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>{t.captain_tools}</span>
                  </button>
                )}
              </nav>
            )}
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Student Batch & Group Badges */}
            {user && (
              <div className="hidden lg:flex items-center gap-1.5">
                {user.program && user.program !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                    {user.program}
                  </span>
                )}
                {user.department && user.department !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-[#E8F1FC] text-[#274FE3] border border-blue-200">
                    <Layers className="w-3.5 h-3.5 text-[#274FE3]" />
                    {user.department}
                  </span>
                )}
                {isCaptain && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    {t.captain_badge}
                  </span>
                )}
                {isStaff && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    <Shield className="w-3.5 h-3.5 text-purple-600" />
                    {user.role === 'admin' ? 'Lead Admin' : 'Support Specialist'}
                  </span>
                )}
              </div>
            )}

            {/* Language Switch */}
            <button
              onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              title="Toggle English / Bangla"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === 'en' ? 'EN' : 'বাং'}</span>
            </button>

            {/* Notifications Bell */}
            {user && (
              <button
                onClick={onOpenNotifications}
                className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title={t.notifications}
              >
                <Bell className="w-5 h-5" />
                {user.unread_notifications_count > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full bg-[#E8001D] text-white text-[10px] font-extrabold shadow-xs">
                    {user.unread_notifications_count > 9 ? '9+' : user.unread_notifications_count}
                  </span>
                )}
              </button>
            )}

            {/* User Profile Button */}
            {user && (
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 text-left"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs ring-1 ring-slate-300">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-bold text-[#111827] line-clamp-1 max-w-[120px]">
                    {user.full_name?.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {isStaff ? (user.staff_id || 'Staff') : user.phone}
                  </span>
                </div>
              </button>
            )}

            {/* Logout Button */}
            {user && (
              <button
                onClick={onLogout}
                className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                title={t.logout}
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
}
