
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
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(
      'connect10ms_user',
      JSON.stringify(user)
    );
  } else {
    localStorage.removeItem('connect10ms_user');
  }
}

async function request(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.body != null
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(token
      ? { Authorization: `Bearer ${token}` }
      : {}),
    ...options.headers
  };

  let response;

  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
  } catch {
    throw new Error(
      'Cannot connect to the server. Please check your connection.'
    );
  }

  const contentType =
    response.headers.get('content-type') || '';

  const data = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : {};

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      (response.status === 401
        ? 'Session expired or unauthorized. Please log in again.'
        : `Request failed (${response.status})`)
    );
  }

  return data;
}

export const api = {

  // ====================================
  // AUTHENTICATION
  // ====================================

  // New unified phone-based registration
  // Backend determines Student/Captain role.
  registerByPhone: (payload) =>
    request('/auth/register-by-phone', {
      method: 'POST',
      body: JSON.stringify({
        full_name: payload.full_name,
        phone: payload.phone,
        password: payload.password
      })
    }),

  // Legacy Student Roster Verification
  verifyRoster: (tms_id, phone, program) =>
    request('/auth/verify-roster', {
      method: 'POST',
      body: JSON.stringify({
        tms_id,
        phone,
        program
      })
    }),

  // Legacy Student Registration
  register: (payload) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Student / Captain Login
  login: (phone, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        phone,
        password
      })
    }),

  // Staff / Admin Login
  staffLogin: (staff_id, password) =>
    request('/auth/staff-login', {
      method: 'POST',
      body: JSON.stringify({
        staff_id,
        password
      })
    }),

  getMe: () =>
    request('/auth/me'),

  updateProfile: (updates) =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),

  // ====================================
  // CATALOG & CLASSES
  // ====================================

  getCatalog: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/catalog?${query}`);
  },

  getUpcomingClasses: () =>
    request('/classes/upcoming'),

  // ====================================
  // TICKETS
  // ====================================

  getTickets: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/tickets?${query}`);
  },

  getTicket: (id) =>
    request(`/tickets/${encodeURIComponent(id)}`),

  createTicket: (payload) =>
    request('/tickets', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  replyTicket: (
    id,
    message,
    is_internal = false,
    attachments = []
  ) =>
    request(
      `/tickets/${encodeURIComponent(id)}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          message,
          is_internal,
          attachments
        })
      }
    ),

  updateTicket: (id, updates) =>
    request(`/tickets/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }),

  escalateTicket: (id, reason) =>
    request(
      `/tickets/${encodeURIComponent(id)}/escalate`,
      {
        method: 'POST',
        body: JSON.stringify({ reason })
      }
    ),

  uploadFile: async (file) => {
    const token = getToken();

    const formData = new FormData();
    formData.append('file', file);

    let res;

    try {
      res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          ...(token
            ? { Authorization: `Bearer ${token}` }
            : {})
        },
        body: formData
      });
    } catch {
      throw new Error(
        'Cannot connect to the server. Please check your connection.'
      );
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data.error || data.message || 'File upload failed'
      );
    }

    return data;
  },

  // ====================================
  // NOTICES
  // ====================================

  getNotices: () =>
    request('/notices'),

  createNotice: (payload) =>
    request('/notices', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  deleteNotice: (id) =>
    request(`/notices/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }),

  // ====================================
  // NOTIFICATIONS
  // ====================================

  getNotifications: () =>
    request('/notifications'),

  markNotificationRead: (id) =>
    request(
      `/notifications/${encodeURIComponent(id)}/read`,
      { method: 'PATCH' }
    ),

  markAllNotificationsRead: () =>
    request('/notifications/read-all', {
      method: 'PATCH'
    }),

  // ====================================
  // CAPTAIN TOOLS
  // ====================================

  verifyStudentByPhone: (phone) =>
    request(
      `/captain/verify-student?phone=${encodeURIComponent(phone)}`
    ),

  // ====================================
  // ADMIN DESK
  // ====================================

  getRoster: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/roster?${query}`);
  },

  importRoster: (entries) =>
    request('/admin/roster', {
      method: 'POST',
      body: JSON.stringify({ entries })
    }),

  getCaptains: () =>
    request('/admin/captains'),

  toggleCaptain: (payload) =>
    request('/admin/captains/toggle', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/audit-logs?${query}`);
  },

  // ====================================
  // CAPTAIN ROSTER MANAGEMENT
  // ====================================

  getCaptainRoster: () =>
    request('/admin/captain-roster'),

  generateCaptainInvite: (id) =>
    request(
      `/admin/captain-roster/${encodeURIComponent(id)}/invite`,
      { method: 'POST' }
    ),

  // Legacy Captain Registration
  // Retained for compatibility with existing code.
  registerCaptain: (payload) =>
    request('/auth/captain-register', {
      method: 'POST',
      body: JSON.stringify(payload)
    })

};
