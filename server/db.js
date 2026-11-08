import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const CATALOG_FILE = path.join(__dirname, 'catalog.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache
let dbState = {
  roster: [],
  users: [],
  tickets: [],
  ticket_messages: [],
  notices: [],
  notifications: [],
  audit_logs: [],
  captain_assignments: []
};

let catalogData = [];
if (fs.existsSync(CATALOG_FILE)) {
  try {
    catalogData = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'));
  } catch (err) {
    console.error('Failed to load catalog.json:', err);
  }
}

// Load database from disk
export function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      dbState = JSON.parse(content);
      // Ensure all keys exist
      dbState.roster = dbState.roster || [];
      dbState.users = dbState.users || [];
      dbState.tickets = dbState.tickets || [];
      dbState.ticket_messages = dbState.ticket_messages || [];
      dbState.notices = dbState.notices || [];
      dbState.notifications = dbState.notifications || [];
      dbState.audit_logs = dbState.audit_logs || [];
      dbState.captain_assignments = dbState.captain_assignments || [];
    } catch (e) {
      console.error('Error reading database file, initializing empty state:', e);
    }
  }
  return dbState;
}

// Debounced save to disk for high performance and atomic file writes
let saveTimeout = null;
export function saveDB() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(dbState, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to atomically save database:', err);
    }
  }, 50);
}

// Immediate synchronous save for critical steps
export function saveDBSync() {
  try {
    const tempPath = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(dbState, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_FILE);
  } catch (err) {
    console.error('Failed to synchronously save database:', err);
  }
}

// Helper query wrappers
export const db = {
  getState: () => dbState,
  getCatalog: () => catalogData,
  
  // Roster methods
  roster: {
    find: (predicate) => dbState.roster.filter(predicate),
    findOne: (predicate) => dbState.roster.find(predicate),
    insert: (item) => {
      dbState.roster.push(item);
      saveDB();
      return item;
    },
    update: (id, updates) => {
      const idx = dbState.roster.findIndex(r => r.id === id);
      if (idx !== -1) {
        dbState.roster[idx] = { ...dbState.roster[idx], ...updates };
        saveDB();
        return dbState.roster[idx];
      }
      return null;
    }
  },

  // Users methods
  users: {
    find: (predicate) => dbState.users.filter(predicate),
    findOne: (predicate) => dbState.users.find(predicate),
    findById: (id) => dbState.users.find(u => u.id === id),
    insert: (user) => {
      dbState.users.push(user);
      saveDB();
      return user;
    },
    update: (id, updates) => {
      const idx = dbState.users.findIndex(u => u.id === id);
      if (idx !== -1) {
        dbState.users[idx] = { ...dbState.users[idx], ...updates };
        saveDB();
        return dbState.users[idx];
      }
      return null;
    }
  },

  // Tickets methods
  tickets: {
    find: (predicate) => dbState.tickets.filter(predicate),
    findOne: (predicate) => dbState.tickets.find(predicate),
    findById: (id) => dbState.tickets.find(t => t.id === id),
    insert: (ticket) => {
      dbState.tickets.unshift(ticket);
      saveDB();
      return ticket;
    },
    update: (id, updates) => {
      const idx = dbState.tickets.findIndex(t => t.id === id);
      if (idx !== -1) {
        dbState.tickets[idx] = { ...dbState.tickets[idx], ...updates, updated_at: new Date().toISOString() };
        saveDB();
        return dbState.tickets[idx];
      }
      return null;
    }
  },

  // Ticket messages
  messages: {
    findByTicket: (ticketId) => dbState.ticket_messages.filter(m => m.ticket_id === ticketId),
    insert: (msg) => {
      dbState.ticket_messages.push(msg);
      saveDB();
      return msg;
    }
  },

  // Notices
  notices: {
    find: (predicate) => dbState.notices.filter(predicate),
    findOne: (predicate) => dbState.notices.find(predicate),
    insert: (notice) => {
      dbState.notices.unshift(notice);
      saveDB();
      return notice;
    },
    update: (id, updates) => {
      const idx = dbState.notices.findIndex(n => n.id === id);
      if (idx !== -1) {
        dbState.notices[idx] = { ...dbState.notices[idx], ...updates };
        saveDB();
        return dbState.notices[idx];
      }
      return null;
    },
    delete: (id) => {
      const idx = dbState.notices.findIndex(n => n.id === id);
      if (idx !== -1) {
        const removed = dbState.notices.splice(idx, 1);
        saveDB();
        return removed[0];
      }
      return null;
    }
  },

  // Notifications
  notifications: {
    findByUser: (userId) => dbState.notifications.filter(n => n.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    insert: (notif) => {
      dbState.notifications.unshift(notif);
      saveDB();
      return notif;
    },
    markAsRead: (id, userId) => {
      const notif = dbState.notifications.find(n => n.id === id && n.user_id === userId);
      if (notif) {
        notif.is_read = true;
        saveDB();
        return notif;
      }
      return null;
    },
    markAllRead: (userId) => {
      dbState.notifications.forEach(n => {
        if (n.user_id === userId) n.is_read = true;
      });
      saveDB();
    }
  },

  // Audit Logs
  audit: {
    find: (predicate = () => true) => dbState.audit_logs.filter(predicate).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    log: (actor, action, targetType, targetId, metadata = {}) => {
      const entry = {
        id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        actor_user_id: actor?.id || 'SYSTEM',
        actor_name: actor?.full_name || actor?.name || 'System',
        actor_role: actor?.role || 'system',
        action,
        target_type: targetType,
        target_id: targetId,
        metadata,
        timestamp: new Date().toISOString()
      };
      dbState.audit_logs.unshift(entry);
      saveDB();
      return entry;
    }
  }
};

// Initialize
loadDB();
