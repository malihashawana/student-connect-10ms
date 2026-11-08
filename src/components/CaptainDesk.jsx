import React, { useState } from 'react';
import { 
  Award, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  Phone, 
  PlusCircle, 
  ShieldCheck
} from 'lucide-react';
import { translations } from '../translations';
import { api } from '../api';

export default function CaptainDesk({ user, tickets, onSelectTicket, onOpenNewTicket, lang }) {
  const t = translations[lang] || translations.en;

  // Affected student verification state
  const [studentPhone, setStudentPhone] = useState('');
  const [verifyingStudent, setVerifyingStudent] = useState(false);
  const [verifiedStudent, setVerifiedStudent] = useState(null);
  const [verifyError, setVerifyError] = useState('');

  // Escalation Modal
  const [escalateTicketId, setEscalateTicketId] = useState(null);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalating, setEscalating] = useState(false);
  const [escalationSuccess, setEscalationSuccess] = useState('');

  // Captain submitted tickets
  const captainTickets = tickets.filter(t => t.reporter_user_id === user.id || t.reporter_role === 'captain');

  const handleVerifyStudent = async (e) => {
    e.preventDefault();
    if (!studentPhone.trim()) return;

    setVerifyingStudent(true);
    setVerifyError('');
    setVerifiedStudent(null);

    try {
      const res = await api.verifyStudentByPhone(studentPhone.trim());
      setVerifiedStudent(res.student);
    } catch (err) {
      setVerifyError(err.message || 'Student verification failed. Phone not found in roster.');
    } finally {
      setVerifyingStudent(false);
    }
  };

  const handleEscalateSubmit = async (e) => {
    e.preventDefault();
    if (!escalateTicketId) return;

    setEscalating(true);
    setEscalationSuccess('');

    try {
      await api.escalateTicket(escalateTicketId, escalateReason);
      setEscalationSuccess('Ticket escalated to Urgent priority successfully!');
      setTimeout(() => {
        setEscalateTicketId(null);
        setEscalateReason('');
        setEscalationSuccess('');
        window.location.reload();
      }, 1500);
    } catch (err) {
      alert(err.message || 'Escalation failed');
    } finally {
      setEscalating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Captain Special Banner (DESIGN.md: 1px border card, green primary CTA) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-xs font-bold text-amber-800 border border-amber-200">
            <Award className="w-4 h-4 text-amber-600" />
            <span>Official Batch Captain Workspace ({user?.program})</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#111827] tracking-tight">
            Captain Action & Escalation Desk
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {lang === 'bn'
              ? 'ক্যাপ্টেন হিসেবে তুমি অন্য শিক্ষার্থীর পক্ষে ইস্যু রিপোর্ট করতে পারো, শিক্ষার্থীর ফোন নম্বর ভেরিফাই করতে পারো এবং জরুরি বিষয়ে টিকেট এসকেলেট করতে পারো।'
              : 'As a designated batch captain, you can submit issues on behalf of students, verify student enrollments, and escalate urgent issues directly to the support desk.'}
          </p>
        </div>

        {/* Green Action CTA button */}
        <button
          onClick={onOpenNewTicket}
          className="btn-primary text-sm shadow-xs shrink-0"
        >
          <PlusCircle className="w-5 h-5 text-white" />
          <span>Report for Student</span>
        </button>
      </div>

      {/* Grid: Tickets & Quick Verification Tool */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Captain Tickets List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E5E7EB] bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-[#111827]">
                  Captain Submitted & Triaged Issues
                </h3>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {captainTickets.length} tickets
              </span>
            </div>

            <div className="divide-y divide-slate-100 p-2">
              {captainTickets.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No tickets submitted on behalf of other students yet.
                </div>
              ) : (
                captainTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-4 hover:bg-slate-50/70 transition-all rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#111827] font-mono">
                          {ticket.id}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Scope: {ticket.affected_scope === 'specific_student' ? 'Specific Student' : ticket.affected_scope === 'cohort' ? 'Batch Cohort' : 'Self'}
                        </span>
                        {ticket.priority === 'Urgent' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                            Urgent Escalated
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700">
                            {ticket.priority}
                          </span>
                        )}
                      </div>

                      <h4 
                        onClick={() => onSelectTicket(ticket.id)}
                        className="text-sm font-bold text-[#111827] hover:text-[#E8001D] cursor-pointer line-clamp-1"
                      >
                        {ticket.title}
                      </h4>

                      {ticket.affected_student_name && (
                        <p className="text-xs font-semibold text-amber-900 bg-amber-50/60 px-2 py-0.5 rounded-md inline-block">
                          Affected Student: {ticket.affected_student_name} ({ticket.affected_student_phone})
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {ticket.priority !== 'Urgent' && ticket.status !== 'Resolved' && (
                        <button
                          onClick={() => {
                            setEscalateTicketId(ticket.id);
                            setEscalateReason('');
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 flex items-center gap-1 transition-colors"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Escalate</span>
                        </button>
                      )}

                      <button
                        onClick={() => onSelectTicket(ticket.id)}
                        className="btn-secondary text-xs"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Student Phone Verification Tool */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-3">
              <ShieldCheck className="w-5 h-5 text-[#1CAB55]" />
              <div>
                <h3 className="text-sm font-bold text-[#111827]">Student Verification Tool</h3>
                <p className="text-[11px] text-slate-500">Verify phone before reporting</p>
              </div>
            </div>

            <form onSubmit={handleVerifyStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Student Phone Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="input-ten pl-9 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={verifyingStudent}
                className="w-full btn-primary text-xs"
              >
                <Search className="w-4 h-4" />
                <span>{verifyingStudent ? 'Checking...' : 'Verify in Database'}</span>
              </button>
            </form>

            {verifyError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                {verifyError}
              </div>
            )}

            {verifiedStudent && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Student Verified!</span>
                </div>
                <div className="space-y-0.5 text-slate-700 pt-0.5">
                  <p><strong className="text-[#111827]">Name:</strong> {verifiedStudent.full_name}</p>
                  <p><strong className="text-[#111827]">Phone:</strong> {verifiedStudent.phone}</p>
                  <p><strong className="text-[#111827]">Course:</strong> {verifiedStudent.program} ({verifiedStudent.department})</p>
                  <p><strong className="text-[#111827]">College:</strong> {verifiedStudent.college}</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Escalation Modal */}
      {escalateTicketId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-[#E5E7EB]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111827]">Escalate Ticket</h3>
                <p className="text-xs text-slate-500">Ticket ID: {escalateTicketId}</p>
              </div>
            </div>

            {escalationSuccess ? (
              <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold text-center">
                {escalationSuccess}
              </div>
            ) : (
              <form onSubmit={handleEscalateSubmit} className="space-y-3.5">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Please provide the reason for escalating this issue to the support desk:
                </p>

                <textarea
                  required
                  rows="3"
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="e.g. Student has exam today evening, but question paper is not showing up..."
                  className="input-ten text-xs"
                />

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEscalateTicketId(null)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={escalating}
                    className="btn-primary text-xs"
                  >
                    {escalating ? 'Escalating...' : 'Submit Escalation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
