import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  Flame, 
  List, 
  LayoutGrid, 
  Search, 
  Download, 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  Users, 
  Award, 
  Shield, 
  Bell, 
  History, 
  GraduationCap,
  FileEdit,
  Smartphone,
  HelpCircle,
  Trash2
} from 'lucide-react';
import { translations } from '../translations';
import { api } from '../api';

export default function StaffDesk({ user, onSelectTicket, lang }) {
  const t = translations[lang] || translations.en;

  // Active top-level tab: 'tickets' | 'roster' | 'captains' | 'notices' | 'audit'
  const [activeTab, setActiveTab] = useState('tickets');

  // Program Switcher
  const [selectedProgram, setSelectedProgram] = useState('ALL');

  // Folder & Queue State
  const [selectedFolder, setSelectedFolder] = useState('ALL');
  const [selectedQueue, setSelectedQueue] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table'); // Default table-dense for operators per DESIGN.md

  // Tickets Data
  const [ticketsData, setTicketsData] = useState({ metrics: {}, tickets: [] });
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Roster Tab Data
  const [rosterData, setRosterData] = useState({ metrics: {}, roster: [] });
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterClaimFilter, setRosterClaimFilter] = useState('ALL');
  const [showAddRosterModal, setShowAddRosterModal] = useState(false);
  const [showBulkRosterModal, setShowBulkRosterModal] = useState(false);
  const [newRosterTms, setNewRosterTms] = useState('');
  const [newRosterPhone, setNewRosterPhone] = useState('');
  const [newRosterProgram, setNewRosterProgram] = useState('HSC 28');
  const [newRosterName, setNewRosterName] = useState('');
  const [bulkRosterText, setBulkRosterText] = useState('');

  // Captains Tab Data
  const [captainsData, setCaptainsData] = useState({ captains: [], candidates: [] });

  // Notices Tab Data
  const [notices, setNotices] = useState([]);
  const [showAddNoticeModal, setShowAddNoticeModal] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticePriority, setNoticePriority] = useState('Normal');
  const [noticeTargetProgram, setNoticeTargetProgram] = useState('ALL');
  const [noticeTargetDept, setNoticeTargetDept] = useState('ALL');

  // Audit Logs Data
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState('');

  // Fetch Tickets
  const fetchTickets = async () => {
    try {
      setLoadingTickets(true);
      const params = {};
      if (selectedProgram !== 'ALL') params.program = selectedProgram;
      if (selectedFolder !== 'ALL') params.category = selectedFolder;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (searchQuery) params.search = searchQuery;

      const res = await api.getTickets(params);
      setTicketsData(res);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tickets') {
      fetchTickets();
    } else if (activeTab === 'roster') {
      fetchRoster();
    } else if (activeTab === 'captains') {
      fetchCaptains();
    } else if (activeTab === 'notices') {
      fetchNotices();
    } else if (activeTab === 'audit') {
      fetchAudit();
    }
  }, [activeTab, selectedProgram, selectedFolder, selectedStatus, searchQuery]);

  // Fetch Roster
  const fetchRoster = async () => {
    try {
      const res = await api.getRoster({
        program: selectedProgram !== 'ALL' ? selectedProgram : undefined,
        claimed: rosterClaimFilter !== 'ALL' ? rosterClaimFilter : undefined,
        search: rosterSearch || undefined
      });
      setRosterData(res);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Captains
  const fetchCaptains = async () => {
    try {
      const res = await api.getCaptains();
      setCaptainsData(res);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Notices
  const fetchNotices = async () => {
    try {
      const res = await api.getNotices();
      setNotices(res.notices || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Audit Logs
  const fetchAudit = async () => {
    try {
      const res = await api.getAuditLogs({ search: auditSearch || undefined });
      setAuditLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter queue logic (Important vs Normal)
  const displayTickets = (ticketsData.tickets || []).filter(t => {
    if (selectedQueue === 'IMPORTANT') {
      return t.priority === 'Urgent' || t.priority === 'High';
    }
    if (selectedQueue === 'NORMAL') {
      return t.priority === 'Normal';
    }
    return true;
  });

  // Export Tickets to CSV
  const handleExportCSV = () => {
    if (displayTickets.length === 0) return alert('No tickets to export');
    const headers = ['ID', 'Category', 'Program', 'Department', 'Subject', 'Priority', 'Status', 'Reporter', 'Phone', 'Title', 'Date'];
    const rows = displayTickets.map(t => [
      t.id,
      t.category,
      t.program,
      t.department,
      t.subject,
      t.priority,
      t.status,
      `"${t.reporter_name}"`,
      t.reporter_phone,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.created_at
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `connect10ms_tickets_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add Single Roster Entry
  const handleAddSingleRoster = async (e) => {
    e.preventDefault();
    if (!newRosterTms || !newRosterPhone || !newRosterProgram) return;

    try {
      await api.importRoster([{
        tms_id: newRosterTms,
        phone: newRosterPhone,
        program: newRosterProgram,
        student_name: newRosterName || 'Pre-approved Student'
      }]);
      setShowAddRosterModal(false);
      setNewRosterTms('');
      setNewRosterPhone('');
      setNewRosterName('');
      fetchRoster();
    } catch (err) {
      alert(err.message || 'Failed to add student to roster');
    }
  };

  // Bulk Import Roster
  const handleBulkImportRoster = async (e) => {
    e.preventDefault();
    if (!bulkRosterText.trim()) return;

    const lines = bulkRosterText.split('\n');
    const entries = [];
    lines.forEach(line => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 3 && parts[0] && parts[1]) {
        entries.push({
          tms_id: parts[0],
          phone: parts[1],
          program: parts[2] || 'HSC 28',
          student_name: parts[3] || 'Imported Student'
        });
      }
    });

    if (entries.length === 0) {
      alert('No valid comma-separated entries found. Format: TMS_ID, Phone, Program, Name');
      return;
    }

    try {
      await api.importRoster(entries);
      setShowBulkRosterModal(false);
      setBulkRosterText('');
      fetchRoster();
    } catch (err) {
      alert(err.message || 'Failed to import roster');
    }
  };

  // Toggle Captain
  const handleToggleCaptain = async (userId, makeCaptain) => {
    try {
      await api.toggleCaptain({ user_id: userId, make_captain: makeCaptain });
      fetchCaptains();
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  // Create Notice
  const handleCreateNotice = async (e) => {
    e.preventDefault();
    if (!noticeTitle || !noticeContent) return;

    try {
      await api.createNotice({
        title: noticeTitle,
        content: noticeContent,
        priority: noticePriority,
        target_program: noticeTargetProgram,
        target_department: noticeTargetDept
      });
      setShowAddNoticeModal(false);
      setNoticeTitle('');
      setNoticeContent('');
      fetchNotices();
    } catch (err) {
      alert(err.message || 'Failed to create notice');
    }
  };

  // Delete Notice
  const handleDeleteNotice = async (id) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    try {
      await api.deleteNotice(id);
      fetchNotices();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Staff Bar: Product Switcher & Operational Tabs */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Product / Program Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Course View:
          </span>
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            {['ALL', 'HSC 28', 'HSC 27'].map((prog) => (
              <button
                key={prog}
                onClick={() => setSelectedProgram(prog)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedProgram === prog
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {prog === 'ALL' ? 'All Courses' : prog}
              </button>
            ))}
          </div>
        </div>

        {/* Workspace Management Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'tickets', label: 'Issue Desk', icon: <FileText className="w-4 h-4" /> },
            { id: 'roster', label: 'Eligibility Roster', icon: <Shield className="w-4 h-4" /> },
            { id: 'captains', label: 'Captains', icon: <Award className="w-4 h-4" /> },
            { id: 'notices', label: 'Notices', icon: <Bell className="w-4 h-4" /> },
            { id: 'audit', label: 'Audit Trail', icon: <History className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#111827] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

      </div>

      {/* ================= TAB 1: TICKETS ISSUE DESK ================= */}
      {activeTab === 'tickets' && (
        <div className="space-y-6">
          
          {/* Drive-Style Category Folders */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                id: 'Class',
                label: 'Class Issues',
                icon: <GraduationCap className="w-6 h-6 text-[#E8001D]" />,
                count: (ticketsData.tickets || []).filter(t => t.category === 'Class').length,
                urgent: (ticketsData.tickets || []).filter(t => t.category === 'Class' && (t.priority === 'Urgent' || t.priority === 'High')).length
              },
              {
                id: 'Exam',
                label: 'Exam Issues',
                icon: <FileEdit className="w-6 h-6 text-[#274FE3]" />,
                count: (ticketsData.tickets || []).filter(t => t.category === 'Exam').length,
                urgent: (ticketsData.tickets || []).filter(t => t.category === 'Exam' && (t.priority === 'Urgent' || t.priority === 'High')).length
              },
              {
                id: 'App/Website',
                label: 'App & Website',
                icon: <Smartphone className="w-6 h-6 text-[#EA580C]" />,
                count: (ticketsData.tickets || []).filter(t => t.category === 'App/Website').length,
                urgent: (ticketsData.tickets || []).filter(t => t.category === 'App/Website' && (t.priority === 'Urgent' || t.priority === 'High')).length
              },
              {
                id: 'Others',
                label: 'Others',
                icon: <HelpCircle className="w-6 h-6 text-purple-600" />,
                count: (ticketsData.tickets || []).filter(t => t.category === 'Others').length,
                urgent: (ticketsData.tickets || []).filter(t => t.category === 'Others' && (t.priority === 'Urgent' || t.priority === 'High')).length
              }
            ].map((f) => (
              <div
                key={f.id}
                onClick={() => setSelectedFolder(selectedFolder === f.id ? 'ALL' : f.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  selectedFolder === f.id
                    ? 'border-[#E8001D] bg-[#FFF5F6] ring-2 ring-[#E8001D]/15'
                    : 'border-[#E5E7EB] bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    {f.icon}
                  </div>
                  {f.urgent > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                      {f.urgent} Urgent
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-[#111827]">{f.label}</h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {f.count} tickets
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Queue & Operational Filter Bar */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Queues (Important vs Normal) */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSelectedQueue('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedQueue === 'ALL'
                    ? 'bg-[#111827] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Tickets ({ticketsData.metrics?.total || 0})
              </button>
              <button
                onClick={() => setSelectedQueue('IMPORTANT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  selectedQueue === 'IMPORTANT'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-300" />
                <span>Important Queue ({ticketsData.metrics?.urgent || 0})</span>
              </button>
              <button
                onClick={() => setSelectedQueue('NORMAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedQueue === 'NORMAL'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Normal Queue
              </button>
            </div>

            {/* Status Filter & Search */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search ID, phone, name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-ten pl-8 pr-3 py-1.5 text-xs w-48 sm:w-56"
                />
              </div>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="input-ten py-1.5 text-xs w-auto font-semibold bg-white"
              >
                <option value="ALL">All Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Waiting for Student">Waiting for Student</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>

              {/* View Switcher: Table vs Cards */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs ${viewMode === 'table' ? 'bg-white shadow-xs text-[#111827]' : 'text-slate-500'}`}
                  title="Dense Table View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-lg text-xs ${viewMode === 'cards' ? 'bg-white shadow-xs text-[#111827]' : 'text-slate-500'}`}
                  title="Card View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Export to CSV */}
              <button
                onClick={handleExportCSV}
                className="btn-secondary text-xs"
                title="Export Filtered CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>

          </div>

          {/* Ticket Listing: Table or Cards */}
          {loadingTickets ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading tickets...</div>
          ) : displayTickets.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs font-semibold bg-white rounded-2xl border border-[#E5E7EB]">
              No tickets found
            </div>
          ) : viewMode === 'table' ? (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-variant-numeric tabular-nums">
                  <thead className="bg-slate-50 border-b border-[#E5E7EB] text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Ticket ID</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Course / Subject</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Reporter</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayTickets.map((t) => (
                      <tr 
                        key={t.id} 
                        onClick={() => onSelectTicket(t.id)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-[#111827]">{t.id}</td>
                        <td className="px-4 py-3 font-semibold">{t.category}</td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-[#E8001D]">{t.program}</span> • {t.subject}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#111827] max-w-xs truncate">{t.title}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold">{t.reporter_name}</span>
                          {t.reporter_role === 'captain' && <span className="ml-1 text-[9px] bg-amber-100 text-amber-800 px-1 rounded-sm font-bold">Captain</span>}
                        </td>
                        <td className="px-4 py-3">
                          {t.priority === 'Urgent' ? <span className="text-red-700 font-bold">Urgent</span> : t.priority}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">{t.status}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{new Date(t.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayTickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTicket(t.id)}
                  className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#111827]">
                          {t.id}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {t.category}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-50 text-[#E8001D]">
                          {t.program}
                        </span>
                      </div>
                      
                      {t.priority === 'Urgent' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                          Urgent
                        </span>
                      ) : t.priority === 'High' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          High
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Normal</span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-[#111827] group-hover:text-[#E8001D] transition-colors line-clamp-1">
                      {t.title}
                    </h4>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {t.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                        {t.reporter_name?.charAt(0)}
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[120px]">
                        {t.reporter_name}
                      </span>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ================= TAB 2: ELIGIBILITY ROSTER ================= */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Total Eligible Records</span>
              <span className="text-2xl font-extrabold text-[#111827]">{rosterData.metrics?.total || 0}</span>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Claimed / Registered</span>
              <span className="text-2xl font-extrabold text-[#1CAB55]">{rosterData.metrics?.claimed || 0}</span>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs">
              <span className="text-xs font-semibold text-slate-500 block">Unclaimed / Available</span>
              <span className="text-2xl font-extrabold text-amber-600">{rosterData.metrics?.unclaimed || 0}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search TMS ID or phone..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="input-ten pl-8 pr-3 py-1.5 text-xs w-48 sm:w-64"
                />
              </div>

              <select
                value={rosterClaimFilter}
                onChange={(e) => setRosterClaimFilter(e.target.value)}
                className="input-ten py-1.5 text-xs w-auto font-semibold bg-white"
              >
                <option value="ALL">All Status</option>
                <option value="false">Unclaimed</option>
                <option value="true">Claimed</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddRosterModal(true)}
                className="btn-primary text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Record</span>
              </button>
              <button
                onClick={() => setShowBulkRosterModal(true)}
                className="btn-secondary text-xs"
              >
                <span>Bulk Import (CSV)</span>
              </button>
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs font-variant-numeric tabular-nums">
              <thead className="bg-slate-50 border-b border-[#E5E7EB] text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">TMS ID</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Claim Status</th>
                  <th className="px-4 py-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(rosterData.roster || []).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-[#111827]">{r.tms_id}</td>
                    <td className="px-4 py-3 font-mono">{r.phone}</td>
                    <td className="px-4 py-3 font-bold text-[#E8001D]">{r.program}</td>
                    <td className="px-4 py-3 font-semibold">{r.student_name || 'N/A'}</td>
                    <td className="px-4 py-3">
                      {r.is_claimed ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Claimed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Ready to Register
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{r.import_source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: CAPTAIN MANAGEMENT ================= */}
      {activeTab === 'captains' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-6 space-y-4">
            <h3 className="text-base font-bold text-[#111827]">
              Active Batch Captains
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(captainsData.captains || []).map((capt) => (
                <div key={capt.id} className="p-4 rounded-xl border border-slate-200 bg-amber-50/30 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#111827]">{capt.full_name}</h4>
                    <p className="text-xs text-slate-500 font-mono">{capt.phone} • {capt.program} ({capt.department})</p>
                    <span className="text-[10px] text-amber-800 font-semibold">{capt.college}</span>
                  </div>
                  <button
                    onClick={() => handleToggleCaptain(capt.id, false)}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                  >
                    Revoke Captain
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-6 space-y-4">
            <h3 className="text-base font-bold text-[#111827]">
              Eligible Student Candidates to Promote
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(captainsData.candidates || []).map((stu) => (
                <div key={stu.id} className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#111827]">{stu.full_name}</h4>
                    <p className="text-xs text-slate-500 font-mono">{stu.phone} • {stu.program} ({stu.department})</p>
                    <span className="text-[10px] text-slate-400">{stu.college}</span>
                  </div>
                  <button
                    onClick={() => handleToggleCaptain(stu.id, true)}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    Promote to Captain
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: NOTICE BOARD MANAGER ================= */}
      {activeTab === 'notices' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-[#111827]">All Published Notices</h3>
            <button
              onClick={() => setShowAddNoticeModal(true)}
              className="btn-primary text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Announcement</span>
            </button>
          </div>

          <div className="space-y-3">
            {notices.map((n) => (
              <div key={n.id} className="p-4 bg-white rounded-2xl border border-[#E5E7EB] flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      n.priority === 'Urgent' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {n.priority}
                    </span>
                    <span className="text-xs font-bold text-[#E8001D]">Target: {n.target_program} ({n.target_department})</span>
                    <span className="text-[11px] text-slate-400">{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#111827]">{n.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.content}</p>
                </div>
                <button
                  onClick={() => handleDeleteNotice(n.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 5: AUDIT LOGS ================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
            <input
              type="text"
              placeholder="Filter by action, user or ticket ID..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className="input-ten w-full sm:w-80 text-xs"
            />
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
            <table className="w-full text-left text-xs font-variant-numeric tabular-nums">
              <thead className="bg-slate-50 border-b border-[#E5E7EB] text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target ID</th>
                  <th className="px-4 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#111827]">{log.actor_name}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{log.actor_role}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] font-bold text-[#274FE3] bg-blue-50 px-2 py-0.5 rounded-md">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">{log.target_id}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[10px] truncate max-w-xs">
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Single Roster Modal */}
      {showAddRosterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleAddSingleRoster} className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-[#E5E7EB]">
            <h3 className="text-base font-bold text-[#111827]">Add Pre-approved Roster Record</h3>
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">TMS Transaction ID *</label>
              <input
                type="text"
                required
                value={newRosterTms}
                onChange={(e) => setNewRosterTms(e.target.value)}
                placeholder="TMS-2026-XXXXX"
                className="input-ten font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">Login Phone Number *</label>
              <input
                type="text"
                required
                value={newRosterPhone}
                onChange={(e) => setNewRosterPhone(e.target.value)}
                placeholder="017xxxxxxxx"
                className="input-ten font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">Course / Program *</label>
              <select
                value={newRosterProgram}
                onChange={(e) => setNewRosterProgram(e.target.value)}
                className="input-ten"
              >
                <option value="HSC 28">HSC 28</option>
                <option value="HSC 27">HSC 27</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">Student Name (Optional)</label>
              <input
                type="text"
                value={newRosterName}
                onChange={(e) => setNewRosterName(e.target.value)}
                placeholder="Student Name"
                className="input-ten"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddRosterModal(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary text-xs"
              >
                Save Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkRosterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleBulkImportRoster} className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-[#E5E7EB]">
            <h3 className="text-base font-bold text-[#111827]">Bulk Roster Import (CSV)</h3>
            <p className="text-xs text-slate-500">
              Format each line as: TMS_ID, Phone, Program, Student_Name
            </p>
            <textarea
              rows="6"
              required
              value={bulkRosterText}
              onChange={(e) => setBulkRosterText(e.target.value)}
              placeholder="TMS-2026-99001, 01712345678, HSC 28, Rakib Hasan&#10;TMS-2026-99002, 01812345678, HSC 28, Sumaiya Akter"
              className="input-ten font-mono text-xs"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkRosterModal(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary text-xs"
              >
                Import Records
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Notice Modal */}
      {showAddNoticeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateNotice} className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-[#E5E7EB]">
            <h3 className="text-base font-bold text-[#111827]">Publish Announcement</h3>
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">Title *</label>
              <input
                type="text"
                required
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                placeholder="e.g. Server Maintenance Notice..."
                className="input-ten"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">Announcement Content *</label>
              <textarea
                rows="4"
                required
                value={noticeContent}
                onChange={(e) => setNoticeContent(e.target.value)}
                placeholder="Details of the announcement..."
                className="input-ten"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Target Course</label>
                <select
                  value={noticeTargetProgram}
                  onChange={(e) => setNoticeTargetProgram(e.target.value)}
                  className="input-ten"
                >
                  <option value="ALL">All Courses</option>
                  <option value="HSC 28">HSC 28</option>
                  <option value="HSC 27">HSC 27</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Priority</label>
                <select
                  value={noticePriority}
                  onChange={(e) => setNoticePriority(e.target.value)}
                  className="input-ten"
                >
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddNoticeModal(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary text-xs"
              >
                Publish Notice
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
