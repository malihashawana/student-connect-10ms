
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

import { api } from '../api';

const normalizePhone = (value) => {
  let phone = String(value || '').replace(/\D/g, '');

  if (phone.startsWith('880')) {
    phone = '0' + phone.slice(3);
  }

  return phone;
};

const isValidPhone = (phone) => {
  return /^01[3-9]\d{8}$/.test(phone);
};

const getTicketNumber = (ticket) => {
  return ticket?.ticket_number || ticket?.id || 'N/A';
};

const getScopeLabel = (scope) => {
  const labels = {
    self: 'Self',
    specific_student: 'Specific Student',
    both: 'Self & Student',
    cohort: 'Batch Cohort'
  };

  return labels[scope] || 'Self';
};

export default function CaptainDesk({
  user,
  tickets = [],
  onSelectTicket,
  onOpenNewTicket,
  lang = 'en'
}) {
  // Student verification
  const [studentPhone, setStudentPhone] = useState('');
  const [verifyingStudent, setVerifyingStudent] = useState(false);
  const [verifiedStudent, setVerifiedStudent] = useState(null);
  const [verifyError, setVerifyError] = useState('');

  // Ticket escalation
  const [escalateTicketId, setEscalateTicketId] = useState(null);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalating, setEscalating] = useState(false);
  const [escalationError, setEscalationError] = useState('');
  const [escalationSuccess, setEscalationSuccess] = useState('');

  // Only tickets actually submitted by this Captain.
  const captainTickets = (Array.isArray(tickets) ? tickets : [])
    .filter((ticket) => {
      return (
        ticket.reporter_user_id === user?.id &&
        ticket.reporter_role === 'captain'
      );
    })
    .sort((a, b) => {
      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      );
    });

  const selectedTicket = captainTickets.find(
    (ticket) => ticket.id === escalateTicketId
  );

  // ------------------------------------------
  // Verify Student
  // ------------------------------------------

  const handleVerifyStudent = async (event) => {
    event.preventDefault();

    if (verifyingStudent) return;

    const phone = normalizePhone(studentPhone);

    setVerifyError('');
    setVerifiedStudent(null);

    if (!isValidPhone(phone)) {
      setVerifyError(
        'Please enter a valid 11-digit Bangladeshi phone number.'
      );
      return;
    }

    setVerifyingStudent(true);

    try {
      const response = await api.verifyStudentByPhone(phone);

      if (!response?.student) {
        throw new Error('Student information was not returned.');
      }

      const student = response.student;

      // Additional frontend safety check.
      // The backend remains responsible for authorization.
      if (
        user?.program &&
        student.program !== user.program
      ) {
        throw new Error(
          'This student is outside your assigned program.'
        );
      }

      setVerifiedStudent(student);
    } catch (error) {
      setVerifyError(
        error?.message ||
        'Student verification failed. Please try again.'
      );
    } finally {
      setVerifyingStudent(false);
    }
  };

  // ------------------------------------------
  // Open Escalation Modal
  // ------------------------------------------

  const openEscalation = (ticket) => {
    if (!ticket?.id) return;

    if (
      ticket.priority === 'Urgent' ||
      ticket.status === 'Resolved' ||
      ticket.status === 'Closed'
    ) {
      return;
    }

    setEscalateTicketId(ticket.id);
    setEscalateReason('');
    setEscalationError('');
    setEscalationSuccess('');
  };

  const closeEscalation = () => {
    if (escalating) return;

    setEscalateTicketId(null);
    setEscalateReason('');
    setEscalationError('');
    setEscalationSuccess('');
  };

  // ------------------------------------------
  // Submit Escalation
  // ------------------------------------------

  const handleEscalateSubmit = async (event) => {
    event.preventDefault();

    if (!escalateTicketId || escalating) return;

    const reason = escalateReason.trim();

    setEscalationError('');
    setEscalationSuccess('');

    if (!reason) {
      setEscalationError(
        'Please provide a reason for escalation.'
      );
      return;
    }

    if (reason.length > 2000) {
      setEscalationError(
        'Escalation reason cannot exceed 2000 characters.'
      );
      return;
    }

    setEscalating(true);

    try {
      await api.escalateTicket(escalateTicketId, reason);

      setEscalationSuccess(
        'Ticket escalated to Urgent priority successfully!'
      );
    } catch (error) {
      setEscalationError(
        error?.message ||
        'Escalation failed. Please try again.'
      );
    } finally {
      setEscalating(false);
    }
  };

  const handleEscalationDone = () => {
    window.location.reload();
  };

  // ------------------------------------------
  // UI
  // ------------------------------------------

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Captain Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">

        <div className="space-y-2 max-w-xl">

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-xs font-bold text-amber-800 border border-amber-200">
            <Award className="w-4 h-4 text-amber-600" />
            <span>
              Official Batch Captain Workspace ({user?.program || 'N/A'})
            </span>
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

        <button
          type="button"
          onClick={onOpenNewTicket}
          className="btn-primary text-sm shadow-xs shrink-0"
        >
          <PlusCircle className="w-5 h-5 text-white" />
          <span>Report for Student</span>
        </button>

      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Captain Tickets */}
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

                captainTickets.map((ticket) => {

                  const canEscalate =
                    ticket.priority !== 'Urgent' &&
                    ticket.status !== 'Resolved' &&
                    ticket.status !== 'Closed';

                  return (
                    <div
                      key={ticket.id}
                      className="p-4 hover:bg-slate-50/70 transition-all rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >

                      <div className="space-y-1.5 min-w-0 flex-1">

                        <div className="flex items-center gap-2 flex-wrap">

                          <span className="text-xs font-bold text-[#111827] font-mono">
                            {getTicketNumber(ticket)}
                          </span>

                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Scope: {getScopeLabel(ticket.affected_scope)}
                          </span>

                          {ticket.priority === 'Urgent' ? (

                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                              Urgent Escalated
                            </span>

                          ) : (

                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700">
                              {ticket.priority || 'Normal'}
                            </span>

                          )}

                          {ticket.status && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                              {ticket.status}
                            </span>
                          )}

                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectTicket?.(ticket.id)}
                          className="text-left text-sm font-bold text-[#111827] hover:text-[#E8001D] cursor-pointer line-clamp-1"
                        >
                          {ticket.title || 'Untitled Ticket'}
                        </button>

                        {ticket.affected_student_name && (
                          <p className="text-xs font-semibold text-amber-900 bg-amber-50/60 px-2 py-0.5 rounded-md inline-block">
                            Affected Student:{' '}
                            {ticket.affected_student_name}
                            {ticket.affected_student_phone
                              ? ` (${ticket.affected_student_phone})`
                              : ''}
                          </p>
                        )}

                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">

                        {canEscalate && (
                          <button
                            type="button"
                            onClick={() => openEscalation(ticket)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 flex items-center gap-1 transition-colors"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Escalate</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onSelectTicket?.(ticket.id)}
                          className="btn-secondary text-xs"
                        >
                          Details
                        </button>

                      </div>

                    </div>
                  );
                })

              )}

            </div>

          </div>

        </div>

        {/* Student Verification */}
        <div className="space-y-6">

          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-5 space-y-4">

            <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-3">

              <ShieldCheck className="w-5 h-5 text-[#1CAB55]" />

              <div>
                <h3 className="text-sm font-bold text-[#111827]">
                  Student Verification Tool
                </h3>

                <p className="text-[11px] text-slate-500">
                  Verify phone before reporting
                </p>
              </div>

            </div>

            <form
              onSubmit={handleVerifyStudent}
              className="space-y-3"
            >

              <div>

                <label
                  htmlFor="captain-student-phone"
                  className="block text-xs font-semibold text-[#111827] mb-1"
                >
                  Student Phone Number *
                </label>

                <div className="relative">

                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />

                  <input
                    id="captain-student-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    required
                    maxLength={14}
                    value={studentPhone}
                    onChange={(event) => {
                      setStudentPhone(event.target.value);
                      setVerifiedStudent(null);
                      setVerifyError('');
                    }}
                    placeholder="017xxxxxxxx"
                    className="input-ten pl-9 font-medium"
                  />

                </div>

              </div>

              <button
                type="submit"
                disabled={verifyingStudent}
                className="w-full btn-primary text-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4" />

                <span>
                  {verifyingStudent
                    ? 'Checking...'
                    : 'Verify in Database'}
                </span>
              </button>

            </form>

            {verifyError && (
              <div
                role="alert"
                className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold"
              >
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

                  <p>
                    <strong className="text-[#111827]">
                      Name:
                    </strong>{' '}
                    {verifiedStudent.full_name ||
                      verifiedStudent.name ||
                      'N/A'}
                  </p>

                  <p>
                    <strong className="text-[#111827]">
                      Phone:
                    </strong>{' '}
                    {verifiedStudent.phone || 'N/A'}
                  </p>

                  <p>
                    <strong className="text-[#111827]">
                      Course:
                    </strong>{' '}
                    {verifiedStudent.program || 'N/A'}
                    {' '}
                    ({verifiedStudent.department ||
                      verifiedStudent.academic_group ||
                      'N/A'})
                  </p>

                  <p>
                    <strong className="text-[#111827]">
                      College:
                    </strong>{' '}
                    {verifiedStudent.college || 'N/A'}
                  </p>

                </div>

              </div>

            )}

          </div>

        </div>

      </div>

      {/* Escalation Modal */}
      {escalateTicketId && (

        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="presentation"
        >

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="captain-escalation-title"
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-[#E5E7EB]"
          >

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>

              <div>

                <h3
                  id="captain-escalation-title"
                  className="text-base font-bold text-[#111827]"
                >
                  Escalate Ticket
                </h3>

                <p className="text-xs text-slate-500">
                  Ticket ID:{' '}
                  {getTicketNumber(selectedTicket)}
                </p>

              </div>

            </div>

            {escalationSuccess ? (

              <div className="space-y-4">

                <div
                  role="status"
                  className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold text-center"
                >
                  <CheckCircle className="w-5 h-5 mx-auto mb-2" />
                  {escalationSuccess}
                </div>

                <button
                  type="button"
                  onClick={handleEscalationDone}
                  className="w-full btn-primary text-xs"
                >
                  Done
                </button>

              </div>

            ) : (

              <form
                onSubmit={handleEscalateSubmit}
                className="space-y-3.5"
              >

                <p className="text-xs text-slate-600 leading-relaxed">
                  Please provide the reason for escalating this issue
                  to the support desk:
                </p>

                <textarea
                  required
                  rows={3}
                  maxLength={2000}
                  disabled={escalating}
                  value={escalateReason}
                  onChange={(event) => {
                    setEscalateReason(event.target.value);
                    setEscalationError('');
                  }}
                  placeholder="e.g. Student has exam today evening, but question paper is not showing up..."
                  className="input-ten text-xs"
                />

                <p className="text-[11px] text-slate-400 text-right">
                  {escalateReason.length}/2000
                </p>

                {escalationError && (
                  <div
                    role="alert"
                    className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold"
                  >
                    {escalationError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">

                  <button
                    type="button"
                    onClick={closeEscalation}
                    disabled={escalating}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={escalating || !escalateReason.trim()}
                    className="btn-primary text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {escalating
                      ? 'Escalating...'
                      : 'Submit Escalation'}
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
