import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import StudentDashboard from './components/StudentDashboard';
import DynamicIssueForm from './components/DynamicIssueForm';
import CaptainDesk from './components/CaptainDesk';
import StaffDesk from './components/StaffDesk';
import TicketDetailModal from './components/TicketDetailModal';
import NotificationsModal from './components/NotificationsModal';
import ProfileModal from './components/ProfileModal';
import { getCurrentUser, setCurrentUser, setToken, api } from './api';

export default function App() {
  const [user, setUser] = useState(getCurrentUser());
  const [lang, setLang] = useState('en'); // Default English as requested
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'new_ticket' | 'captain_desk' | 'staff_desk'

  // Global Data
  const [tickets, setTickets] = useState([]);
  const [notices, setNotices] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Active Selected Ticket for Detail Drawer
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // Modals
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Refresh user data & tickets
  const refreshData = async () => {
    if (!user) return;
    try {
      const meRes = await api.getMe();
      setUser(meRes.user);
      setCurrentUser(meRes.user);

      const [ticketsRes, noticesRes, notifsRes] = await Promise.all([
        api.getTickets(),
        api.getNotices(),
        api.getNotifications()
      ]);

      setTickets(ticketsRes.tickets || []);
      setNotices(noticesRes.notices || []);
      setNotifications(notifsRes.notifications || []);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  };

  useEffect(() => {
    if (user) {
      const isStaff = user.role === 'staff' || user.role === 'admin';
      setActiveView(isStaff ? 'staff_desk' : 'dashboard');
      refreshData();
    }
  }, [user?.id]);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    const isStaff = loggedInUser.role === 'staff' || loggedInUser.role === 'admin';
    setActiveView(isStaff ? 'staff_desk' : 'dashboard');
    refreshData();
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setUser(null);
    setActiveView('dashboard');
    setSelectedTicketId(null);
  };

  const handleMarkNotifRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUser(prev => prev ? { ...prev, unread_notifications_count: Math.max(0, (prev.unread_notifications_count || 1) - 1) } : null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUser(prev => prev ? { ...prev, unread_notifications_count: 0 } : null);
    } catch (err) {
      console.error(err);
    }
  };

  // If user is not authenticated, show Auth View
  if (!user) {
    return <AuthModal onLoginSuccess={handleLoginSuccess} lang={lang} />;
  }

  const isStaff = user.role === 'staff' || user.role === 'admin';
  const isCaptain = user.role === 'captain';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      
      {/* Top Application Header */}
      <Header
        user={user}
        lang={lang}
        setLang={setLang}
        onLogout={handleLogout}
        onOpenNotifications={() => setIsNotifModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        
        {/* Student Dashboard */}
        {activeView === 'dashboard' && !isStaff && (
          <StudentDashboard
            user={user}
            tickets={tickets}
            notices={notices}
            onOpenNewTicket={() => setActiveView('new_ticket')}
            onSelectTicket={(id) => setSelectedTicketId(id)}
            lang={lang}
          />
        )}

        {/* Dynamic Issue Reporting Form */}
        {activeView === 'new_ticket' && !isStaff && (
          <DynamicIssueForm
            user={user}
            onCancel={() => setActiveView('dashboard')}
            onSuccess={(createdTicket) => {
              refreshData();
              setSelectedTicketId(createdTicket.id);
              setActiveView('dashboard');
            }}
            lang={lang}
          />
        )}

        {/* Captain Action Desk */}
        {activeView === 'captain_desk' && isCaptain && (
          <CaptainDesk
            user={user}
            tickets={tickets}
            onSelectTicket={(id) => setSelectedTicketId(id)}
            onOpenNewTicket={() => setActiveView('new_ticket')}
            lang={lang}
          />
        )}

        {/* Staff / Admin Workspace */}
        {isStaff && (
          <StaffDesk
            user={user}
            onSelectTicket={(id) => setSelectedTicketId(id)}
            lang={lang}
          />
        )}

      </main>

      {/* Ticket Detail Drawer / Modal */}
      {selectedTicketId && (
        <TicketDetailModal
          ticketId={selectedTicketId}
          isOpen={!!selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
          user={user}
          onTicketUpdated={() => refreshData()}
          lang={lang}
        />
      )}

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotifRead}
        onMarkAllRead={handleMarkAllNotifsRead}
        onSelectTicket={(id) => setSelectedTicketId(id)}
        lang={lang}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onUpdateUser={(updated) => setUser(updated)}
        lang={lang}
      />

    </div>
  );
}
