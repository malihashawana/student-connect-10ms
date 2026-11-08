// Central API Client for Connect 10ms

const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('connect10ms_token') || '';
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('connect10ms_token', token);
  } else {
    localStorage.removeItem('connect10ms_token');
  }
}

export function getCurrentUser() {
  const userStr = localStorage.getItem('connect10ms_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('connect10ms_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('connect10ms_user');
  }
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  verifyRoster: (tms_id, phone, program) =>
    request('/auth/verify-roster', { method: 'POST', body: JSON.stringify({ tms_id, phone, program }) }),

  register: (payload) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  login: (phone, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),

  staffLogin: (staff_id, password) =>
    request('/auth/staff-login', { method: 'POST', body: JSON.stringify({ staff_id, password }) }),

  getMe: () => request('/auth/me'),

  updateProfile: (updates) =>
    request('/auth/profile', { method: 'PUT', body: JSON.stringify(updates) }),

  // Catalog & Classes
  getCatalog: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/catalog?${query}`);
  },

  getUpcomingClasses: () => request('/classes/upcoming'),

  // Tickets
  getTickets: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/tickets?${query}`);
  },

  getTicket: (id) => request(`/tickets/${id}`),

  createTicket: (payload) =>
    request('/tickets', { method: 'POST', body: JSON.stringify(payload) }),

  replyTicket: (id, message, is_internal = false, attachments = []) =>
    request(`/tickets/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message, is_internal, attachments })
    }),

  updateTicket: (id, updates) =>
    request(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),

  escalateTicket: (id, reason) =>
    request(`/tickets/${id}/escalate`, { method: 'POST', body: JSON.stringify({ reason }) }),

  uploadFile: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'File upload failed');
    return data;
  },

  // Notices
  getNotices: () => request('/notices'),
  createNotice: (payload) => request('/notices', { method: 'POST', body: JSON.stringify(payload) }),
  deleteNotice: (id) => request(`/notices/${id}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PATCH' }),

  // Captain tools
  verifyStudentByPhone: (phone) => request(`/captain/verify-student?phone=${encodeURIComponent(phone)}`),

  // Admin Desk
  getRoster: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/roster?${query}`);
  },
  importRoster: (entries) => request('/admin/roster', { method: 'POST', body: JSON.stringify({ entries }) }),
  getCaptains: () => request('/admin/captains'),
  toggleCaptain: (payload) => request('/admin/captains/toggle', { method: 'POST', body: JSON.stringify(payload) }),
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/audit-logs?${query}`);
  }
};
