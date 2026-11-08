import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Lock, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  User, 
  Calendar, 
  Paperclip, 
  Award, 
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { translations } from '../translations';
import { api } from '../api';

export default function TicketDetailModal({ 
  ticketId, 
  isOpen, 
  onClose, 
  user, 
  onTicketUpdated, 
  lang 
}) {
  if (!isOpen || !ticketId) return null;
  const t = translations[lang] || translations.en;

  const isStaff = user?.role === 'staff' || user?.role === 'admin';

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Reply State
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  // Staff Update Controls
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updatingTicket, setUpdatingTicket] = useState(false);

  // Fetch ticket & messages
  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.getTicket(ticketId);
      setTicket(res.ticket);
      setMessages(res.messages || []);
      setSelectedStatus(res.ticket.status);
      setSelectedPriority(res.ticket.priority);
      setResolutionNotes(res.ticket.resolution_notes || '');
    } catch (err) {
      console.error('Failed to load ticket details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [ticketId]);

  // Reply Submit
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    setSendingReply(true);
    try {
      await api.replyTicket(ticketId, replyMessage.trim(), isInternal);
      setReplyMessage('');
      setIsInternal(false);
      await fetchDetails();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSendingReply(false);
    }
  };

  // Staff Status & Priority Update
  const handleUpdateStatusAndPriority = async (newStatus, newPriority) => {
    setUpdatingTicket(true);
    try {
      const updates = {};
      if (newStatus) updates.status = newStatus;
      if (newPriority) updates.priority = newPriority;
      if (newStatus === 'Resolved') updates.resolution_notes = resolutionNotes || 'Issue has been successfully resolved.';

      const res = await api.updateTicket(ticketId, updates);
      setTicket(res.ticket);
      setSelectedStatus(res.ticket.status);
      setSelectedPriority(res.ticket.priority);
      await fetchDetails();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      alert(err.message || 'Failed to update ticket');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const getStatusColor = (st) => {
    switch (st) {
      case 'Open': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Waiting for Student': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Resolved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Closed': return 'bg-slate-200 text-slate-800 border-slate-300';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-[#E5E7EB]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-200/80 text-[#111827]">
              {ticketId}
            </span>
            {ticket && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(ticket.status)}`}>
                {ticket.status}
              </span>
            )}
            {ticket?.priority === 'Urgent' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                Urgent
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Loading...
          </div>
        ) : !ticket ? (
          <div className="p-12 text-center text-red-500 text-sm">
            Ticket not found.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            
            {/* Title & Metadata */}
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-[#111827] leading-snug">
                {ticket.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <span>Reporter: <strong>{ticket.reporter_name}</strong> ({ticket.reporter_role})</span>
                <span>• Phone: <span className="font-mono">{ticket.reporter_phone}</span></span>
                <span>• Course: <strong className="text-[#E8001D]">{ticket.program}</strong></span>
                <span>• Group: <strong className="text-[#274FE3]">{ticket.department}</strong></span>
                <span>• Subject: <strong>{ticket.subject}</strong></span>
                <span>• Date: {new Date(ticket.created_at).toLocaleString()}</span>
              </div>
            </div>

            {/* Affected Student Badge (Captain Workflow) */}
            {ticket.affected_student_name && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs">
                <Award className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-amber-900 block">
                    Reported by Captain on Behalf of Student
                  </span>
                  <span className="text-amber-800">
                    Affected Student: <strong>{ticket.affected_student_name}</strong> (Phone: {ticket.affected_student_phone})
                  </span>
                </div>
              </div>
            )}

            {/* Context Details Grid */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-[#E5E7EB] space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Issue Context ({ticket.category})
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {ticket.category === 'Class' && (
                  <>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Class Type</span>
                      <span className="font-bold text-[#111827]">{ticket.context_details?.class_type || 'N/A'}</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Class Date</span>
                      <span className="font-bold text-[#111827]">{ticket.context_details?.class_date || 'N/A'}</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 block">Session (Column G)</span>
                      <span className="font-bold text-[#111827] truncate block">{ticket.context_details?.session_title || 'N/A'}</span>
                    </div>
                  </>
                )}

                {ticket.category === 'Exam' && (
                  <>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Exam Type</span>
                      <span className="font-bold text-[#274FE3]">{ticket.context_details?.exam_type || 'N/A'}</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Exam Date</span>
                      <span className="font-bold text-[#111827]">{ticket.context_details?.exam_date || 'N/A'}</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 block">Title (Column G)</span>
                      <span className="font-bold text-[#111827] truncate block">{ticket.context_details?.exam_title || 'N/A'}</span>
                    </div>
                  </>
                )}

                {ticket.category === 'App/Website' && (
                  <>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Platform</span>
                      <span className="font-bold text-[#EA580C]">{ticket.context_details?.app_platform || 'N/A'}</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">App Version</span>
                      <span className="font-bold text-[#111827]">{ticket.context_details?.app_version || 'N/A'}</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Device</span>
                      <span className="font-bold text-[#111827]">{ticket.context_details?.device_info || 'Not specified'}</span>
                    </div>
                  </>
                )}

                {ticket.category === 'Others' && (
                  <div className="p-2 bg-white rounded-lg border border-slate-200 col-span-2">
                    <span className="text-[10px] text-slate-400 block">Subtype</span>
                    <span className="font-bold text-[#111827]">{ticket.context_details?.other_subtype || 'General'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Attachments */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-[#111827] block">Attachments:</span>
                <div className="flex flex-wrap gap-2">
                  {ticket.attachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-[#111827] border border-slate-200 transition-colors"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate max-w-[160px]">{att.name}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution note if resolved */}
            {ticket.status === 'Resolved' && ticket.resolution_notes && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Resolution Notes:</span>
                </div>
                <p className="text-emerald-900 leading-relaxed font-medium pl-5">
                  {ticket.resolution_notes}
                </p>
                {ticket.resolved_at && (
                  <span className="text-[10px] text-emerald-600 block pl-5 pt-0.5">
                    Resolved at: {new Date(ticket.resolved_at).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {/* Conversation Timeline */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Conversation Timeline</span>
              </h3>

              <div className="space-y-2.5">
                {messages.map((msg) => {
                  const isStaffSender = msg.sender_role === 'staff' || msg.sender_role === 'admin';
                  const isInternalMsg = msg.is_internal;

                  return (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-xl text-xs space-y-1 ${
                        isInternalMsg
                          ? 'bg-amber-50/80 border border-amber-300 text-amber-950 ml-4 sm:ml-8'
                          : isStaffSender
                          ? 'bg-blue-50/80 border border-blue-200 text-slate-800 ml-4 sm:ml-8'
                          : 'bg-slate-50 border border-[#E5E7EB] text-slate-800 mr-4 sm:mr-8'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-0.5">
                        <div className="flex items-center gap-1.5">
                          {isInternalMsg && (
                            <span className="px-1.5 py-0.5 rounded-sm bg-amber-200 text-amber-900 text-[10px] font-bold flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Internal Note
                            </span>
                          )}
                          <strong className={isStaffSender ? 'text-blue-800' : 'text-[#111827]'}>
                            {msg.sender_name}
                          </strong>
                          <span className="text-slate-400">({msg.sender_role})</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="whitespace-pre-line leading-relaxed text-[#111827]">
                        {msg.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Staff Controls (Status, Priority, Assign, Resolve) */}
            {isStaff && (
              <div className="bg-slate-50 border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                <span className="text-xs font-bold text-[#111827] block">
                  Staff Controls
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Update Status
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => handleUpdateStatusAndPriority(e.target.value, null)}
                      className="input-ten font-bold bg-white"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Waiting for Student">Waiting for Student</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Priority
                    </label>
                    <select
                      value={selectedPriority}
                      onChange={(e) => handleUpdateStatusAndPriority(null, e.target.value)}
                      className="input-ten font-bold bg-white"
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {selectedStatus === 'Resolved' && (
                  <div className="pt-1.5 space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Resolution Note (sent to student)
                    </label>
                    <input
                      type="text"
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="e.g. Stream encoding issue fixed. Replaced with fresh class backup..."
                      className="input-ten"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateStatusAndPriority('Resolved', null)}
                      className="btn-primary text-xs"
                    >
                      Confirm Resolution
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Reply Input Form */}
            <form onSubmit={handleSendReply} className="pt-2 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#111827]">
                  {isStaff ? 'Send Reply or Add Staff Note' : 'Send Message'}
                </label>
                {isStaff && (
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Internal Note (Hidden from Student)</span>
                  </label>
                )}
              </div>

              <div className="flex gap-2">
                <textarea
                  rows="2"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder={isInternal ? 'Type internal staff note...' : 'Type message here...'}
                  className={`flex-1 input-ten text-xs ${
                    isInternal ? 'border-amber-300 bg-amber-50/40' : ''
                  }`}
                />
                {/* Green Action CTA button */}
                <button
                  type="submit"
                  disabled={sendingReply || !replyMessage.trim()}
                  className="btn-primary text-xs shrink-0 self-end"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </div>
            </form>

          </div>
        )}

      </div>
    </div>
  );
}
