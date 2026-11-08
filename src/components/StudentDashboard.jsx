import React, { useState } from 'react';
import { 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ChevronRight, 
  Bell, 
  Layers,
  BookOpen
} from 'lucide-react';
import { translations } from '../translations';

export default function StudentDashboard({ 
  user, 
  tickets, 
  notices, 
  onOpenNewTicket, 
  onSelectTicket, 
  lang 
}) {
  const t = translations[lang] || translations.en;
  const [ticketFilter, setTicketFilter] = useState('ALL');

  // Ticket metrics
  const totalTickets = tickets.length;
  const openCount = tickets.filter(t => t.status === 'Open').length;
  const inProgressCount = tickets.filter(t => t.status === 'In Progress' || t.status === 'Waiting for Student').length;
  const resolvedCount = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;

  // Filtered tickets
  const filteredTickets = ticketFilter === 'ALL' 
    ? tickets 
    : tickets.filter(t => t.status.toLowerCase() === ticketFilter.toLowerCase());

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Open':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">Open</span>;
      case 'In Progress':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">In Progress</span>;
      case 'Waiting for Student':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">Waiting for Reply</span>;
      case 'Resolved':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Resolved</span>;
      case 'Closed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">Closed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const getPriorityBadge = (priority) => {
    if (priority === 'Urgent') {
      return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">Urgent</span>;
    }
    if (priority === 'High') {
      return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">High</span>;
    }
    return <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">Normal</span>;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* 10MS Hero Card - Clean White surface with subtle 1px border per DESIGN.md */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 text-xs font-semibold text-[#111827]">
            <BookOpen className="w-3.5 h-3.5 text-[#E8001D]" />
            <span>{user?.program || 'HSC'} • {user?.department || 'Science'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
            {lang === 'bn' ? `স্বাগতম, ${user?.full_name?.split(' ')[0]}!` : `Welcome, ${user?.full_name?.split(' ')[0]}!`}
          </h1>
          <p className="text-sm text-[#4B5563] leading-relaxed">
            {lang === 'bn'
              ? 'ক্লাস, এক্সাম বা অ্যাপ সংক্রান্ত যে কোনো সমস্যায় টিকিট খুলে জানাও। সাপোর্ট টিম দ্রুত সমাধানে সাহায্য করবে।'
              : 'Need help with your classes, exams, or app? Report an issue below and our student support team will resolve it quickly.'}
          </p>
        </div>

        {/* Primary Action Button - Green #1CAB55 per DESIGN.md Section 8.2 */}
        <div className="shrink-0">
          <button
            onClick={onOpenNewTicket}
            className="btn-primary text-sm shadow-sm"
          >
            <PlusCircle className="w-5 h-5 text-white" />
            <span>{t.new_ticket}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards - 4 Column Clean Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E7EB] shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">{t.total_tickets}</span>
            <span className="text-xl sm:text-2xl font-extrabold text-[#111827]">{totalTickets}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E7EB] shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">{t.open_tickets}</span>
            <span className="text-xl sm:text-2xl font-extrabold text-amber-600">{openCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E7EB] shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">{t.in_progress}</span>
            <span className="text-xl sm:text-2xl font-extrabold text-blue-600">{inProgressCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E7EB] shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">{t.resolved}</span>
            <span className="text-xl sm:text-2xl font-extrabold text-[#1CAB55]">{resolvedCount}</span>
          </div>
        </div>

      </div>

      {/* Notice Board Card */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E5E7EB] bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#E8001D]" />
            <h2 className="text-sm font-bold text-[#111827]">{t.notice_board}</h2>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {user?.program} Updates
          </span>
        </div>

        <div className="divide-y divide-slate-100 p-2">
          {notices.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs font-medium">
              {t.no_notices}
            </div>
          ) : (
            notices.slice(0, 3).map((n) => (
              <div key={n.id} className="p-4 hover:bg-slate-50/60 transition-colors rounded-xl">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {n.priority === 'Urgent' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                      Urgent Notice
                    </span>
                  )}
                  {n.priority === 'High' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      Important
                    </span>
                  )}
                  <span className="text-[11px] font-medium text-slate-400">
                    {new Date(n.publish_date).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#111827] mb-0.5 leading-snug">
                  {n.title}
                </h3>
                <p className="text-xs text-[#4B5563] line-clamp-2 leading-relaxed">
                  {n.content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* My Tickets Section */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E5E7EB] bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-bold text-[#111827]">{t.my_tickets}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
              {tickets.length}
            </span>
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'Open', 'In Progress', 'Resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setTicketFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  ticketFilter === st 
                    ? 'bg-[#111827] text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? (lang === 'bn' ? 'সব' : 'All') : st}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100 p-2">
          {filteredTickets.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#111827]">{t.no_tickets}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {lang === 'bn' ? 'কোনো সমস্যা থাকলে নতুন টিকেট খুলে জানাও।' : 'If you face any issue, submit a ticket below.'}
                </p>
              </div>
              <button
                onClick={onOpenNewTicket}
                className="btn-primary text-xs shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t.new_ticket}</span>
              </button>
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => onSelectTicket(ticket.id)}
                className="p-4 hover:bg-slate-50/70 transition-all rounded-xl cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-[#111827] font-mono">
                      {ticket.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {ticket.category}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold truncate max-w-[150px]">
                      {ticket.subject}
                    </span>
                    {getPriorityBadge(ticket.priority)}
                  </div>

                  <h4 className="text-sm font-bold text-[#111827] group-hover:text-[#E8001D] transition-colors line-clamp-1">
                    {ticket.title}
                  </h4>

                  <p className="text-xs text-slate-500 line-clamp-1">
                    {ticket.description}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                    <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    {ticket.context_details?.exam_type && (
                      <span>• Exam: {ticket.context_details.exam_type}</span>
                    )}
                    {ticket.context_details?.class_type && (
                      <span>• Class: {ticket.context_details.class_type}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  {getStatusBadge(ticket.status)}
                  <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-slate-100 text-slate-400 group-hover:text-[#111827] flex items-center justify-center transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
