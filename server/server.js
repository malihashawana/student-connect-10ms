import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db, saveDBSync } from './db.js';
import { seedDatabase } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB if needed
seedDatabase(false);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'connect10ms_super_secret_jwt_key_2026';

// Uploads directory
const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `attachment-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|pdf|docx|txt/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowed.test(ext) || allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, Word docs, and text files are permitted'));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// Helper: Normalize phone numbers (e.g. +88017... -> 017...)
function normalizePhone(p) {
  if (!p) return '';
  let clean = p.replace(/\s+/g, '').replace(/-/g, '');
  if (clean.startsWith('+880')) clean = clean.substring(3);
  else if (clean.startsWith('880')) clean = clean.substring(2);
  return clean;
}

// Authentication Token Verification Middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Token missing.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.users.findById(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'User account not found or deactivated.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

// Role Guard Middleware
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: Insufficient privileges.' });
    }
    next();
  };
}

// ==========================================
// 1. AUTHENTICATION & REGISTRATION ENDPOINTS
// ==========================================

// Step 1: Pre-validation of TMS ID + Phone + Program against eligibility roster
app.post('/api/auth/verify-roster', (req, res) => {
  const { tms_id, phone, program } = req.body;
  if (!tms_id || !phone || !program) {
    return res.status(400).json({ error: 'TMS Transaction ID, Login Phone, and Program are required.' });
  }

  const cleanPhone = normalizePhone(phone);
  const cleanTms = tms_id.trim();

  // Find matching roster record
  const rosterEntry = db.roster.findOne(r => 
    r.tms_id.toLowerCase() === cleanTms.toLowerCase() &&
    normalizePhone(r.phone) === cleanPhone &&
    r.program.toLowerCase() === program.trim().toLowerCase()
  );

  if (!rosterEntry) {
    return res.status(400).json({
      success: false,
      error: 'No matching approved student record found. Please verify your TMS ID, phone number, and program.'
    });
  }

  if (rosterEntry.is_claimed) {
    return res.status(400).json({
      success: false,
      error: 'This TMS ID and student entitlement has already been registered and claimed. Please sign in.'
    });
  }

  return res.json({
    success: true,
    message: 'Pre-approved student entitlement verified successfully!',
    data: {
      tms_id: rosterEntry.tms_id,
      phone: rosterEntry.phone,
      program: rosterEntry.program,
      suggested_name: rosterEntry.student_name || ''
    }
  });
});

// Step 2: Complete Registration & Account Creation
app.post('/api/auth/register', (req, res) => {
  const {
    tms_id,
    phone,
    password,
    full_name,
    email,
    program,
    department,
    college,
    district,
    class_level,
    academic_year,
    address,
    contact_phone
  } = req.body;

  if (!tms_id || !phone || !password || !full_name || !program || !department) {
    return res.status(400).json({ error: 'Please provide all required fields including password, full name, and department.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const cleanPhone = normalizePhone(phone);
  const cleanTms = tms_id.trim();

  // Strict Server-Side Validation against Roster
  const rosterEntry = db.roster.findOne(r => 
    r.tms_id.toLowerCase() === cleanTms.toLowerCase() &&
    normalizePhone(r.phone) === cleanPhone &&
    r.program.toLowerCase() === program.trim().toLowerCase()
  );

  if (!rosterEntry) {
    return res.status(400).json({ error: 'Invalid entitlement. Verification failed against pre-approved roster.' });
  }

  if (rosterEntry.is_claimed) {
    return res.status(400).json({ error: 'This entitlement has already been claimed by an existing account.' });
  }

  // Check if phone is already used by another user
  const existingUser = db.users.findOne(u => normalizePhone(u.phone) === cleanPhone);
  if (existingUser) {
    return res.status(400).json({ error: 'An account with this phone number already exists.' });
  }

  // Hash password
  const passwordHash = bcrypt.hashSync(password, 10);
  const newUserId = `USR-${Date.now().toString().slice(-6)}`;

  const newUser = {
    id: newUserId,
    role: 'student',
    phone: cleanPhone,
    tms_id: rosterEntry.tms_id,
    full_name: full_name.trim(),
    email: email ? email.trim() : '',
    program: rosterEntry.program,
    department: department.trim(),
    college: college ? college.trim() : 'Not Specified',
    district: district ? district.trim() : 'Dhaka',
    class_level: class_level ? class_level.trim() : (program.includes('28') ? 'HSC 1st Year' : 'HSC 2nd Year'),
    academic_year: academic_year ? academic_year.trim() : (program.includes('28') ? '2026-2028' : '2025-2027'),
    address: address ? address.trim() : '',
    contact_phone: contact_phone ? normalizePhone(contact_phone) : cleanPhone,
    status: 'active',
    password_hash: passwordHash,
    created_at: new Date().toISOString()
  };

  db.users.insert(newUser);

  // Mark Roster Record Claimed
  db.roster.update(rosterEntry.id, {
    is_claimed: true,
    claimed_by_user_id: newUserId,
    claimed_at: new Date().toISOString()
  });

  // Log Audit
  db.audit.log(
    newUser,
    'USER_REGISTERED',
    'user',
    newUserId,
    { tms_id: rosterEntry.tms_id, program: newUser.program, department: newUser.department }
  );

  // Generate Session Token
  const token = jwt.sign(
    { userId: newUser.id, role: newUser.role, program: newUser.program },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password_hash, ...safeUser } = newUser;
  return res.status(201).json({
    success: true,
    message: 'Account successfully registered and verified!',
    token,
    user: safeUser
  });
});

// Student & Captain Login
app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone number and password are required.' });
  }

  const cleanPhone = normalizePhone(phone);
  const user = db.users.findOne(u => normalizePhone(u.phone) === cleanPhone && (u.role === 'student' || u.role === 'captain'));

  if (!user) {
    return res.status(401).json({ error: 'Invalid phone number or password.' });
  }

  const match = bcrypt.compareSync(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid phone number or password.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Your account has been deactivated. Please contact support desk.' });
  }

  // Audit log
  db.audit.log(user, 'USER_LOGIN', 'user', user.id, { role: user.role, ip: req.ip });

  const token = jwt.sign(
    { userId: user.id, role: user.role, program: user.program },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password_hash, ...safeUser } = user;
  return res.json({
    success: true,
    message: 'Login successful',
    token,
    user: safeUser
  });
});

// Separate Staff / Admin Login (Staff ID + Password)
app.post('/api/auth/staff-login', (req, res) => {
  const { staff_id, password } = req.body;
  if (!staff_id || !password) {
    return res.status(400).json({ error: 'Staff ID / Official Email and password are required.' });
  }

  const cleanId = staff_id.trim();
  const staff = db.users.findOne(u => 
    (u.role === 'staff' || u.role === 'admin') &&
    (u.staff_id?.toLowerCase() === cleanId.toLowerCase() || u.email?.toLowerCase() === cleanId.toLowerCase())
  );

  if (!staff) {
    return res.status(401).json({ error: 'Invalid Staff ID or credentials.' });
  }

  const match = bcrypt.compareSync(password, staff.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid Staff ID or credentials.' });
  }

  // Audit log
  db.audit.log(staff, 'STAFF_LOGIN', 'user', staff.id, { role: staff.role });

  const token = jwt.sign(
    { userId: staff.id, role: staff.role, is_staff: true },
    JWT_SECRET,
    { expiresIn: '3d' }
  );

  const { password_hash, ...safeStaff } = staff;
  return res.json({
    success: true,
    message: 'Staff authentication successful',
    token,
    user: safeStaff
  });
});

// Current User Me & Notifications Count
app.get('/api/auth/me', authenticate, (req, res) => {
  const { password_hash, ...safeUser } = req.user;
  const unreadNotifs = db.notifications.findByUser(req.user.id).filter(n => !n.is_read).length;
  
  // Also check if user has active captain assignment
  const captainAssignment = db.getState().captain_assignments.find(c => c.captain_user_id === req.user.id && c.active);
  
  return res.json({
    user: {
      ...safeUser,
      unread_notifications_count: unreadNotifs,
      captain_assignment: captainAssignment || null
    }
  });
});

// Update Profile
app.put('/api/auth/profile', authenticate, (req, res) => {
  const { full_name, email, college, district, address, contact_phone } = req.body;

  const updates = {};
  if (full_name) updates.full_name = full_name.trim();
  if (email !== undefined) updates.email = email.trim();
  if (college) updates.college = college.trim();
  if (district) updates.district = district.trim();
  if (address !== undefined) updates.address = address.trim();
  if (contact_phone) updates.contact_phone = normalizePhone(contact_phone);

  const updatedUser = db.users.update(req.user.id, updates);
  db.audit.log(req.user, 'PROFILE_UPDATED', 'user', req.user.id, { fields: Object.keys(updates) });

  const { password_hash, ...safeUser } = updatedUser;
  return res.json({ success: true, message: 'Profile updated successfully.', user: safeUser });
});

// ==========================================
// 2. CAPTAIN SPECIFIC WORKFLOWS
// ==========================================

// Verify specific affected student for Captain Reporting
app.get('/api/captain/verify-student', authenticate, requireRole('captain', 'admin', 'staff'), (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'Phone number is required.' });

  const cleanPhone = normalizePhone(phone);
  const student = db.users.findOne(u => normalizePhone(u.phone) === cleanPhone && (u.role === 'student' || u.role === 'captain'));

  if (!student) {
    return res.status(404).json({ error: 'No student found with this phone number in the system.' });
  }

  // Return non-sensitive details only to protect privacy
  return res.json({
    success: true,
    student: {
      id: student.id,
      full_name: student.full_name,
      phone: student.phone,
      program: student.program,
      department: student.department,
      college: student.college
    }
  });
});

// ==========================================
// 3. CATALOG & LEARNING VIEWS (HSC 28/27 & Department Aware)
// ==========================================

// Department subject mapping as defined in PRD Section 4:
// Science = Bangla, English, ICT, Physics, Chemistry, Biology, Higher Math
// Business Studies = Bangla, English, ICT, Finance, Accounting, Marketing, Management
// Humanities = Bangla, English, ICT, Economics, Geography, Civics
const DEPARTMENT_SUBJECT_RULES = {
  'Science': [
    'Bangla 1st Paper', 'Bangla 2nd Paper', 'English 1st Paper', 'English 2nd Paper', 'ICT',
    'Physics 1st Paper', 'Physics 2nd Paper', 'Chemistry 1st Paper', 'Chemistry 2nd Paper',
    'Biology 1st Paper', 'Biology 2nd Paper', 'Higher Math 1st Paper', 'Higher Math 2nd Paper'
  ],
  'Business Studies': [
    'Bangla 1st Paper', 'Bangla 2nd Paper', 'English 1st Paper', 'English 2nd Paper', 'ICT',
    'Finance 1st Paper', 'Finance 2nd Paper', 'Accounting 1st Paper', 'Accounting 2nd Paper',
    'Marketing 1st Paper', 'Marketing 2nd Paper', 'Management 1st Paper', 'Management 2nd Paper'
  ],
  'Humanities': [
    'Bangla 1st Paper', 'Bangla 2nd Paper', 'English 1st Paper', 'English 2nd Paper', 'ICT',
    'Economics 1st Paper', 'Economics 2nd Paper', 'Geography 1st Paper', 'Geography 2nd Paper',
    'Civics 1st Paper', 'Civics 2nd Paper'
  ]
};

// All available subjects for issue reporting (Students can report on any subject!)
const ALL_REPORTING_SUBJECTS = [
  'Bangla 1st Paper', 'Bangla 2nd Paper', 'English 1st Paper', 'English 2nd Paper', 'ICT',
  'Physics 1st Paper', 'Physics 2nd Paper', 'Chemistry 1st Paper', 'Chemistry 2nd Paper',
  'Biology 1st Paper', 'Biology 2nd Paper', 'Higher Math 1st Paper', 'Higher Math 2nd Paper',
  'Finance 1st Paper', 'Finance 2nd Paper', 'Accounting 1st Paper', 'Accounting 2nd Paper',
  'Marketing 1st Paper', 'Marketing 2nd Paper', 'Management 1st Paper', 'Management 2nd Paper',
  'Economics 1st Paper', 'Economics 2nd Paper', 'Geography 1st Paper', 'Geography 2nd Paper',
  'Civics 1st Paper', 'Civics 2nd Paper'
];

// Get Catalog Records (Filtered or Full)
app.get('/api/catalog', (req, res) => {
  const { subject, department, program, search } = req.query;
  let records = db.getCatalog();

  if (subject) {
    records = records.filter(r => r.subject.toLowerCase() === subject.toLowerCase());
  }

  if (department && DEPARTMENT_SUBJECT_RULES[department]) {
    const allowed = DEPARTMENT_SUBJECT_RULES[department];
    records = records.filter(r => allowed.includes(r.subject));
  }

  if (search) {
    const q = search.toLowerCase();
    records = records.filter(r => 
      r.title.toLowerCase().includes(q) ||
      r.chapter.toLowerCase().includes(q) ||
      r.subject.toLowerCase().includes(q) ||
      r.date.toLowerCase().includes(q)
    );
  }

  return res.json({
    total: records.length,
    subjects: ALL_REPORTING_SUBJECTS,
    department_mappings: DEPARTMENT_SUBJECT_RULES,
    items: records.slice(0, 100) // limit page size
  });
});

// Upcoming Classes for Student Dashboard (Filtered strictly by student's department!)
app.get('/api/classes/upcoming', authenticate, (req, res) => {
  const { department, program } = req.user;
  const catalog = db.getCatalog();

  // If user is Science / Business / Humanities, filter by allowed subjects
  let filtered = catalog;
  if (department && DEPARTMENT_SUBJECT_RULES[department]) {
    const allowed = DEPARTMENT_SUBJECT_RULES[department];
    filtered = catalog.filter(c => allowed.includes(c.subject));
  }

  // Return upcoming sessions
  return res.json({
    program: program || 'HSC 28',
    department: department || 'General',
    total_relevant_classes: filtered.length,
    classes: filtered.slice(0, 8) // First 8 relevant classes
  });
});

// ==========================================
// 4. TICKETS & ISSUE REPORTING ENDPOINTS
// ==========================================

// File Upload endpoint
app.post('/api/upload', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or file format not supported.' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  return res.json({
    success: true,
    name: req.file.originalname,
    filename: req.file.filename,
    url: fileUrl,
    size: `${(req.file.size / 1024).toFixed(1)} KB`,
    mimetype: req.file.mimetype
  });
});

// List Tickets
app.get('/api/tickets', authenticate, (req, res) => {
  const user = req.user;
  const isStaff = user.role === 'staff' || user.role === 'admin';
  const isCaptain = user.role === 'captain';

  const { category, status, priority, program, subject, reporter_type, search } = req.query;

  let tickets = db.getState().tickets;

  // Access Control:
  if (!isStaff) {
    if (isCaptain) {
      // Captain sees tickets they created OR tickets affecting their phone
      tickets = tickets.filter(t => 
        t.reporter_user_id === user.id || 
        t.affected_student_phone === user.phone
      );
    } else {
      // Student sees ONLY own tickets
      tickets = tickets.filter(t => 
        t.reporter_user_id === user.id || 
        t.affected_student_phone === user.phone
      );
    }
  }

  // Filters for staff / views
  if (category && category !== 'ALL') {
    tickets = tickets.filter(t => t.category.toLowerCase() === category.toLowerCase());
  }

  if (status && status !== 'ALL') {
    tickets = tickets.filter(t => t.status.toLowerCase() === status.toLowerCase());
  }

  if (priority && priority !== 'ALL') {
    tickets = tickets.filter(t => t.priority.toLowerCase() === priority.toLowerCase());
  }

  if (program && program !== 'ALL') {
    tickets = tickets.filter(t => t.program.toLowerCase() === program.toLowerCase());
  }

  if (subject && subject !== 'ALL') {
    tickets = tickets.filter(t => t.subject.toLowerCase() === subject.toLowerCase());
  }

  if (reporter_type && reporter_type !== 'ALL') {
    tickets = tickets.filter(t => t.reporter_role.toLowerCase() === reporter_type.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    tickets = tickets.filter(t => 
      t.id.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.reporter_name.toLowerCase().includes(q) ||
      t.reporter_phone.includes(q) ||
      (t.affected_student_phone && t.affected_student_phone.includes(q))
    );
  }

  // Summary Metrics
  const metrics = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'Open').length,
    in_progress: tickets.filter(t => t.status === 'In Progress').length,
    resolved: tickets.filter(t => t.status === 'Resolved').length,
    closed: tickets.filter(t => t.status === 'Closed').length,
    urgent: tickets.filter(t => t.priority === 'Urgent' || t.priority === 'High').length
  };

  return res.json({
    metrics,
    tickets
  });
});

// Create Ticket
app.post('/api/tickets', authenticate, (req, res) => {
  const {
    category,
    program,
    department,
    subject,
    title,
    description,
    priority,
    context_details,
    attachments,
    // Captain fields
    affected_scope,
    affected_student_phone
  } = req.body;

  if (!category || !description) {
    return res.status(400).json({ error: 'Issue category and detailed description are required.' });
  }

  const isCaptain = req.user.role === 'captain';
  let ticketScope = 'self';
  let verifiedAffectedStudent = null;

  if (isCaptain && affected_scope) {
    ticketScope = affected_scope;
    if (affected_scope === 'specific_student' || affected_scope === 'both') {
      if (!affected_student_phone) {
        return res.status(400).json({ error: 'Affected student phone number is required when reporting for a specific student.' });
      }
      const cleanPhone = normalizePhone(affected_student_phone);
      verifiedAffectedStudent = db.users.findOne(u => normalizePhone(u.phone) === cleanPhone);
      if (!verifiedAffectedStudent) {
        return res.status(400).json({ error: 'Affected student could not be verified in the student roster.' });
      }
    }
  }

  const newTicketId = `TKT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

  const newTicket = {
    id: newTicketId,
    reporter_user_id: req.user.id,
    reporter_role: req.user.role,
    reporter_name: req.user.full_name,
    reporter_phone: req.user.phone,
    affected_scope: ticketScope,
    affected_student_phone: verifiedAffectedStudent ? verifiedAffectedStudent.phone : null,
    affected_student_name: verifiedAffectedStudent ? verifiedAffectedStudent.full_name : null,
    category,
    program: program || req.user.program || 'HSC 28',
    department: department || req.user.department || 'Science',
    subject: subject || 'General',
    priority: priority || (isCaptain && req.body.is_escalated ? 'High' : 'Normal'),
    status: 'Open',
    title: title ? title.trim() : `${category} Issue - ${subject || 'General'}`,
    description: description.trim(),
    context_details: context_details || {},
    attachments: attachments || [],
    assigned_staff_id: null,
    assigned_staff_name: null,
    resolution_notes: null,
    resolved_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.tickets.insert(newTicket);

  // Add initial message
  db.messages.insert({
    id: `MSG-${Date.now()}-1`,
    ticket_id: newTicket.id,
    sender_user_id: req.user.id,
    sender_name: req.user.full_name,
    sender_role: req.user.role,
    message: description.trim(),
    is_internal: false,
    attachments: attachments || [],
    created_at: newTicket.created_at
  });

  // Audit Log
  db.audit.log(
    req.user,
    'TICKET_CREATED',
    'ticket',
    newTicket.id,
    { category, subject, priority: newTicket.priority, affected_scope: ticketScope }
  );

  return res.status(201).json({
    success: true,
    message: 'Ticket created successfully!',
    ticket: newTicket
  });
});

// Get Single Ticket Details & Conversation
app.get('/api/tickets/:id', authenticate, (req, res) => {
  const ticket = db.tickets.findById(req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  const isStaff = req.user.role === 'staff' || req.user.role === 'admin';
  const isOwner = ticket.reporter_user_id === req.user.id || (ticket.affected_student_phone && normalizePhone(ticket.affected_student_phone) === normalizePhone(req.user.phone));

  // Access Control: Only staff or ticket owner/affected student can view
  if (!isStaff && !isOwner) {
    return res.status(403).json({ error: 'Unauthorized: You do not have permission to view this ticket.' });
  }

  let messages = db.messages.findByTicket(ticket.id);

  // If student or captain, strictly hide internal staff notes!
  if (!isStaff) {
    messages = messages.filter(m => !m.is_internal);
  }

  return res.json({
    ticket,
    messages
  });
});

// Reply or Add Message to Ticket
app.post('/api/tickets/:id/messages', authenticate, (req, res) => {
  const ticket = db.tickets.findById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

  const isStaff = req.user.role === 'staff' || req.user.role === 'admin';
  const isOwner = ticket.reporter_user_id === req.user.id || (ticket.affected_student_phone && normalizePhone(ticket.affected_student_phone) === normalizePhone(req.user.phone));

  if (!isStaff && !isOwner) {
    return res.status(403).json({ error: 'Unauthorized to reply to this ticket.' });
  }

  const { message, is_internal, attachments } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message content cannot be empty.' });
  }

  const internalFlag = isStaff ? !!is_internal : false;

  const newMsg = {
    id: `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ticket_id: ticket.id,
    sender_user_id: req.user.id,
    sender_name: req.user.full_name,
    sender_role: req.user.role,
    message: message.trim(),
    is_internal: internalFlag,
    attachments: attachments || [],
    created_at: new Date().toISOString()
  };

  db.messages.insert(newMsg);

  // Update ticket timestamp
  db.tickets.update(ticket.id, { updated_at: new Date().toISOString() });

  // If staff replied publicly, notify student
  if (isStaff && !internalFlag) {
    db.notifications.insert({
      id: `NTF-${Date.now()}`,
      user_id: ticket.reporter_user_id,
      title: 'টিকেট রিপ্লাই আপডেট',
      message: `সাপোর্ট টিম আপনার টিকেট ${ticket.id}-এ বার্তা পাঠিয়েছেন: "${message.slice(0, 60)}..."`,
      type: 'ticket_reply',
      ticket_id: ticket.id,
      is_read: false,
      created_at: new Date().toISOString()
    });

    // Also notify affected student if captain reported
    if (ticket.affected_student_phone) {
      const affectedUser = db.users.findOne(u => normalizePhone(u.phone) === normalizePhone(ticket.affected_student_phone));
      if (affectedUser && affectedUser.id !== ticket.reporter_user_id) {
        db.notifications.insert({
          id: `NTF-${Date.now()}-aff`,
          user_id: affectedUser.id,
          title: 'টিকেট রিপ্লাই আপডেট',
          message: `আপনার পক্ষ থেকে করা টিকেটে সাপোর্ট টিম বার্তা দিয়েছেন: "${message.slice(0, 60)}..."`,
          type: 'ticket_reply',
          ticket_id: ticket.id,
          is_read: false,
          created_at: new Date().toISOString()
        });
      }
    }
  }

  db.audit.log(
    req.user,
    internalFlag ? 'INTERNAL_NOTE_ADDED' : 'TICKET_REPLIED',
    'ticket',
    ticket.id,
    { is_internal: internalFlag }
  );

  return res.status(201).json({ success: true, message: newMsg });
});

// Update Ticket (Status, Priority, Staff Assignment, Resolution) - Staff / Admin only
app.patch('/api/tickets/:id', authenticate, requireRole('staff', 'admin'), (req, res) => {
  const ticket = db.tickets.findById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

  const { status, priority, assigned_staff_id, resolution_notes } = req.body;
  const updates = {};
  const changes = [];

  if (status && status !== ticket.status) {
    updates.status = status;
    changes.push(`Status changed from ${ticket.status} to ${status}`);
    if (status === 'Resolved' && !ticket.resolved_at) {
      updates.resolved_at = new Date().toISOString();
    }
  }

  if (priority && priority !== ticket.priority) {
    updates.priority = priority;
    changes.push(`Priority changed from ${ticket.priority} to ${priority}`);
  }

  if (assigned_staff_id !== undefined) {
    const staff = db.users.findById(assigned_staff_id);
    updates.assigned_staff_id = assigned_staff_id;
    updates.assigned_staff_name = staff ? staff.full_name : 'Unassigned';
    changes.push(`Assigned to ${updates.assigned_staff_name}`);
  }

  if (resolution_notes !== undefined) {
    updates.resolution_notes = resolution_notes;
  }

  const updatedTicket = db.tickets.update(ticket.id, updates);

  // Trigger Notification if resolved
  if (status === 'Resolved') {
    db.notifications.insert({
      id: `NTF-${Date.now()}`,
      user_id: ticket.reporter_user_id,
      title: 'টিকেট সমাধান সম্পন্ন!',
      message: `আপনার টিকেট ${ticket.id} (${ticket.title}) সফলভাবে সমাধান করা হয়েছে। নোট: ${resolution_notes || 'কোন অতিরিক্ত মন্তব্য নেই।'}`,
      type: 'ticket_resolved',
      ticket_id: ticket.id,
      is_read: false,
      created_at: new Date().toISOString()
    });
  }

  // Audit
  db.audit.log(req.user, 'TICKET_UPDATED', 'ticket', ticket.id, { changes });

  return res.json({ success: true, ticket: updatedTicket, message: 'Ticket updated successfully.' });
});

// Captain Request Escalation
app.post('/api/tickets/:id/escalate', authenticate, requireRole('captain'), (req, res) => {
  const ticket = db.tickets.findById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

  const { reason } = req.body;
  const updatedTicket = db.tickets.update(ticket.id, {
    priority: 'Urgent',
    updated_at: new Date().toISOString()
  });

  db.messages.insert({
    id: `MSG-${Date.now()}-esc`,
    ticket_id: ticket.id,
    sender_user_id: req.user.id,
    sender_name: req.user.full_name,
    sender_role: 'captain',
    message: `[ক্যাপ্টেন এসকেলেশন]: এই সমস্যাটি জরুরি সমাধানের জন্য অনুরোধ করা হয়েছে। কারণ: ${reason || 'শিক্ষার্থীর জরুরি সমস্যা'}`,
    is_internal: false,
    attachments: [],
    created_at: new Date().toISOString()
  });

  db.audit.log(req.user, 'TICKET_ESCALATED', 'ticket', ticket.id, { reason });

  return res.json({ success: true, ticket: updatedTicket, message: 'Ticket escalated to Urgent priority.' });
});

// ==========================================
// 5. NOTICES & ANNOUNCEMENTS
// ==========================================

// Get Notices (Targeted for Student Program/Dept or All for Admin)
app.get('/api/notices', authenticate, (req, res) => {
  const { program, department, role } = req.user;
  const isStaff = role === 'staff' || role === 'admin';

  let notices = db.getState().notices;

  if (!isStaff) {
    // Filter active notices targeted to this student
    notices = notices.filter(n => {
      if (!n.is_active) return false;
      const progMatch = n.target_program === 'ALL' || n.target_program === program;
      const deptMatch = n.target_department === 'ALL' || n.target_department === department;
      return progMatch && deptMatch;
    });
  }

  return res.json({ notices });
});

// Create Notice (Admin / Staff)
app.post('/api/notices', authenticate, requireRole('staff', 'admin'), (req, res) => {
  const { title, content, priority, target_program, target_department, expiry_date } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Notice title and content are required.' });
  }

  const newNotice = {
    id: `NOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    title: title.trim(),
    content: content.trim(),
    priority: priority || 'Normal',
    target_program: target_program || 'ALL',
    target_department: target_department || 'ALL',
    is_active: true,
    publish_date: new Date().toISOString(),
    expiry_date: expiry_date || '2026-12-31T23:59:59Z',
    created_by: req.user.full_name,
    created_at: new Date().toISOString()
  };

  db.notices.insert(newNotice);
  db.audit.log(req.user, 'NOTICE_PUBLISHED', 'notice', newNotice.id, { title: newNotice.title, priority: newNotice.priority });

  return res.status(201).json({ success: true, notice: newNotice });
});

// Delete Notice
app.delete('/api/notices/:id', authenticate, requireRole('staff', 'admin'), (req, res) => {
  const removed = db.notices.delete(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Notice not found.' });

  db.audit.log(req.user, 'NOTICE_DELETED', 'notice', req.params.id, { title: removed.title });
  return res.json({ success: true, message: 'Notice deleted successfully.' });
});

// ==========================================
// 6. NOTIFICATIONS CENTER
// ==========================================

app.get('/api/notifications', authenticate, (req, res) => {
  const notifs = db.notifications.findByUser(req.user.id);
  return res.json({ notifications: notifs });
});

app.patch('/api/notifications/:id/read', authenticate, (req, res) => {
  const notif = db.notifications.markAsRead(req.params.id, req.user.id);
  if (!notif) return res.status(404).json({ error: 'Notification not found.' });
  return res.json({ success: true, notification: notif });
});

app.patch('/api/notifications/read-all', authenticate, (req, res) => {
  db.notifications.markAllRead(req.user.id);
  return res.json({ success: true, message: 'All notifications marked as read.' });
});

// ==========================================
// 7. ADMIN / SUPPORT DESK MANAGEMENT TABS
// ==========================================

// Roster Management
app.get('/api/admin/roster', authenticate, requireRole('staff', 'admin'), (req, res) => {
  const { search, claimed, program } = req.query;
  let roster = db.getState().roster;

  if (claimed !== undefined && claimed !== 'ALL') {
    const isClaimed = claimed === 'true';
    roster = roster.filter(r => r.is_claimed === isClaimed);
  }

  if (program && program !== 'ALL') {
    roster = roster.filter(r => r.program === program);
  }

  if (search) {
    const q = search.toLowerCase();
    roster = roster.filter(r => 
      r.tms_id.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      (r.student_name && r.student_name.toLowerCase().includes(q))
    );
  }

  const metrics = {
    total: db.getState().roster.length,
    claimed: db.getState().roster.filter(r => r.is_claimed).length,
    unclaimed: db.getState().roster.filter(r => !r.is_claimed).length
  };

  return res.json({ metrics, roster });
});

// Add Single or Bulk Roster Entry
app.post('/api/admin/roster', authenticate, requireRole('admin'), (req, res) => {
  const { entries } = req.body; // array of { tms_id, phone, program, student_name }
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'Array of entries required.' });
  }

  let addedCount = 0;
  entries.forEach(e => {
    if (e.tms_id && e.phone && e.program) {
      const cleanPhone = normalizePhone(e.phone);
      const exists = db.roster.findOne(r => r.tms_id.toLowerCase() === e.tms_id.trim().toLowerCase());
      if (!exists) {
        db.roster.insert({
          id: `ROS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tms_id: e.tms_id.trim(),
          phone: cleanPhone,
          program: e.program.trim(),
          student_name: e.student_name ? e.student_name.trim() : 'Pre-approved Student',
          is_claimed: false,
          claimed_by_user_id: null,
          claimed_at: null,
          import_source: 'Admin Manual / Batch Import'
        });
        addedCount++;
      }
    }
  });

  db.audit.log(req.user, 'ROSTER_IMPORTED', 'roster', 'batch', { count: addedCount });
  return res.status(201).json({ success: true, message: `Added ${addedCount} pre-approved entries to the roster.` });
});

// Captains Management
app.get('/api/admin/captains', authenticate, requireRole('staff', 'admin'), (req, res) => {
  const captains = db.users.find(u => u.role === 'captain');
  const allStudents = db.users.find(u => u.role === 'student');
  return res.json({
    captains,
    candidates: allStudents
  });
});

app.post('/api/admin/captains/toggle', authenticate, requireRole('admin'), (req, res) => {
  const { user_id, make_captain, program, scope } = req.body;
  const user = db.users.findById(user_id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (make_captain) {
    db.users.update(user.id, { role: 'captain' });
    db.getState().captain_assignments.push({
      id: `CAPT-${Date.now()}`,
      captain_user_id: user.id,
      program: program || user.program,
      scope: scope || 'All Groups',
      assigned_by_user_id: req.user.id,
      active: true,
      created_at: new Date().toISOString()
    });
    db.audit.log(req.user, 'CAPTAIN_PROMOTED', 'user', user.id, { name: user.full_name });
    saveDBSync();
    return res.json({ success: true, message: `${user.full_name} promoted to Captain!` });
  } else {
    db.users.update(user.id, { role: 'student' });
    const assignment = db.getState().captain_assignments.find(c => c.captain_user_id === user.id);
    if (assignment) assignment.active = false;
    db.audit.log(req.user, 'CAPTAIN_REVOKED', 'user', user.id, { name: user.full_name });
    saveDBSync();
    return res.json({ success: true, message: `Captain role revoked from ${user.full_name}.` });
  }
});

// Audit Logs
app.get('/api/admin/audit-logs', authenticate, requireRole('staff', 'admin'), (req, res) => {
  const { action, actor_role, search } = req.query;
  let logs = db.audit.find();

  if (action && action !== 'ALL') {
    logs = logs.filter(l => l.action === action);
  }

  if (actor_role && actor_role !== 'ALL') {
    logs = logs.filter(l => l.actor_role === actor_role);
  }

  if (search) {
    const q = search.toLowerCase();
    logs = logs.filter(l => 
      l.actor_name.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.target_id.toLowerCase().includes(q)
    );
  }

  return res.json({ logs: logs.slice(0, 100) });
});

// Fallback for SPA routing
const DIST_DIR = path.join(__dirname, '../dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else {
  app.use((req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.send('Connect 10ms API is running. Run `npm run build` or `npm run dev` for frontend.');
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` Connect 10ms Server running on port ${PORT}`);
  console.log(` Ready to serve Student & Staff workflows`);
  console.log(`===============================================`);
});
