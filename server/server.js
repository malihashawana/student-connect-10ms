
import 'dotenv/config';

import crypto from 'crypto';

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { db } from './db.js';
import { seedDatabase } from './seed.js';
import { supabase } from './supabaseClient.js';
import { loginStudentFromSupabase } from './loginSupabase.js';
import { registerStudentInSupabase } from './registerSupabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET must be configured with at least 32 characters.'
  );
}

if (
  process.env.NODE_ENV !== 'production' &&
  process.env.ENABLE_DEMO_SEED === 'true'
) {
  seedDatabase(false);
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ------------------------------------------
// Helpers
// ------------------------------------------

function normalizePhone(value) {
  if (value === null || value === undefined) {
    return '';
  }

  let phone = String(value).replace(/\D/g, '');

  if (phone.startsWith('880')) {
    phone = '0' + phone.slice(3);
  }

  return phone;
}

function isValidPhone(value) {
  return /^01[3-9]\d{8}$/.test(normalizePhone(value));
}

function cleanText(value) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function isStaffRole(role) {
  return role === 'staff' || role === 'admin';
}

function safeUserResponse(user, captainAssignment = null) {
  if (!user) return null;

  const { password_hash, ...safeUser } = user;

  return {
    ...safeUser,
    name: user.full_name,
    department: user.academic_group,
    staff_id: user.login_id,
    status: user.is_active ? 'active' : 'inactive',
    captain_assignment: captainAssignment
  };
}

function createAuthToken(user, expiresIn = '7d') {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
      program: user.program
    },
    JWT_SECRET,
    { expiresIn }
  );
}

// ------------------------------------------
// Authentication Middleware
// ------------------------------------------

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. Token missing.'
    });
  }

  const token = authHeader.slice(7);

  let decoded;

  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({
      error: 'Invalid or expired session token.'
    });
  }

  if (!decoded.userId) {
    return res.status(401).json({
      error: 'Invalid session payload.'
    });
  }

  try {
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', decoded.userId)
      .maybeSingle();

    if (userError) throw userError;

    if (!user) {
      return res.status(401).json({
        error: 'User account not found.'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: 'Your account has been deactivated.'
      });
    }

    let captainAssignment = null;

    if (user.role === 'captain') {
      const { data: assignments, error: assignmentError } =
        await supabase
          .from('captain_assignments')
          .select('*')
          .eq('captain_user_id', user.id)
          .eq('program', user.program)
          .eq('scope', 'program')
          .eq('active', true)
          .limit(1);

      if (assignmentError) throw assignmentError;

      captainAssignment = assignments?.[0] || null;

      if (!captainAssignment) {
        return res.status(403).json({
          error: 'No active Captain assignment found.'
        });
      }
    }

    req.user = safeUserResponse(
      user,
      captainAssignment
    );

    next();
  } catch (error) {
    console.error(
      'Authentication database error:',
      error.message
    );

    return res.status(503).json({
      error: 'Authentication service temporarily unavailable.'
    });
  }
}

// ------------------------------------------
// Role Authorization Middleware
// ------------------------------------------

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (
      !req.user ||
      !allowedRoles.includes(req.user.role)
    ) {
      return res.status(403).json({
        error: 'Access denied: Insufficient privileges.'
      });
    }

    next();
  };
}

function hasCaptainProgramAccess(user, program) {
  if (user.role !== 'captain') {
    return false;
  }

  const assignment = user.captain_assignment;

  return Boolean(
    assignment &&
    assignment.active === true &&
    assignment.scope === 'program' &&
    assignment.program === user.program &&
    assignment.program === program
  );
}

 // ==========================================
 // PART 2 — AUTHENTICATION & PROFILE APIs
 // ==========================================

 // Verify Student Eligibility
 app.post('/api/auth/verify-roster', async (req, res) => {
   const { tms_id, phone, program } = req.body || {};

   const cleanTms = cleanText(tms_id);
   const cleanPhone = normalizePhone(phone);
   const cleanProgram = cleanText(program);

   if (!cleanTms || !isValidPhone(cleanPhone) || !cleanProgram) {
     return res.status(400).json({
       success: false,
       error: 'Valid TMS ID, phone and program are required.'
     });
   }

   try {
     const { data, error } = await supabase
       .from('eligibility_roster')
       .select('tms_id, phone, program, student_name, is_claimed')
       .ilike('tms_id', cleanTms)
       .eq('phone', cleanPhone)
       .ilike('program', cleanProgram)
       .limit(1);

     if (error) throw error;

     const entry = data?.[0];

     if (!entry) {
       return res.status(400).json({
         success: false,
         error: 'No matching approved student record found.'
       });
     }

     if (entry.is_claimed) {
       return res.status(409).json({
         success: false,
         error: 'This TMS ID has already been registered. Please sign in.'
       });
     }

     return res.json({
       success: true,
       message: 'Student eligibility verified successfully.',
       data: {
         tms_id: entry.tms_id,
         phone: entry.phone,
         program: entry.program,
         suggested_name: entry.student_name || ''
       }
     });
   } catch (error) {
     console.error('Roster verification error:', error.message);

     return res.status(503).json({
       success: false,
       error: 'Verification service temporarily unavailable.'
     });
   }
 });

 // Register Student
 app.post('/api/auth/register', async (req, res) => {
   const {
     tms_id,
     phone,
     password,
     full_name,
     program,
     department
   } = req.body || {};

   if (
     !cleanText(tms_id) ||
     !isValidPhone(phone) ||
     typeof password !== 'string' ||
     password.length < 6 ||
     !cleanText(full_name) ||
     !cleanText(program) ||
     !cleanText(department)
   ) {
     return res.status(400).json({
       success: false,
       error: 'Valid registration information and password (6+ characters) are required.'
     });
   }

   try {
     const registeredUser = await registerStudentInSupabase({
       ...req.body,
       phone: normalizePhone(phone)
     });

     const token = createAuthToken(registeredUser);

     return res.status(201).json({
       success: true,
       message: 'Account registered successfully.',
       token,
       user: safeUserResponse({
         ...registeredUser,
         academic_group:
           registeredUser.academic_group || department,
         is_active: true
       })
     });
   } catch (error) {
     console.error('Registration error:', error.message);

     if (
       error.message?.includes('ELIGIBILITY_NOT_FOUND_OR_CLAIMED')
     ) {
       return res.status(400).json({
         success: false,
         error: 'Invalid or already claimed student entitlement.'
       });
     }

     if (
       error.message?.includes('PHONE_ALREADY_REGISTERED') ||
       error.code === '23505'
     ) {
       return res.status(409).json({
         success: false,
         error: 'Phone number or TMS ID already registered.'
       });
     }

     if (error.message === 'INVALID_REGISTRATION_DATA') {
       return res.status(400).json({
         success: false,
         error: 'Invalid registration information.'
       });
     }

     return res.status(503).json({
       success: false,
       error: 'Registration service temporarily unavailable.'
     });
   }
 });

 // Student / Captain Login
 app.post('/api/auth/login', async (req, res) => {
   const { phone, password } = req.body || {};

   if (!isValidPhone(phone) || typeof password !== 'string' || !password) {
     return res.status(400).json({
       error: 'Valid phone number and password are required.'
     });
   }

   try {
     const user = await loginStudentFromSupabase(
       normalizePhone(phone),
       password
     );

     let captainAssignment = null;

     if (user.role === 'captain') {
       const { data, error } = await supabase
         .from('captain_assignments')
         .select('*')
         .eq('captain_user_id', user.id)
         .eq('program', user.program)
         .eq('scope', 'program')
         .eq('active', true)
         .limit(1);

       if (error) throw error;

       captainAssignment = data?.[0] || null;

       if (!captainAssignment) {
         return res.status(403).json({
           error: 'No active Captain assignment found.'
         });
       }
     }

     const token = createAuthToken(user);

     const { error: auditError } = await supabase
       .from('audit_logs')
       .insert({
         actor_user_id: user.id,
         actor_name: user.full_name,
         actor_role: user.role,
         action: 'USER_LOGIN',
         target_type: 'user',
         target_id: user.id,
         metadata: { role: user.role }
       });

     if (auditError) {
       console.error('Login audit error:', auditError.message);
     }

     return res.json({
       success: true,
       message: 'Login successful.',
       token,
       user: safeUserResponse(user, captainAssignment)
     });
   } catch (error) {
     if (error.message === 'INVALID_CREDENTIALS') {
       return res.status(401).json({
         error: 'Invalid phone number or password.'
       });
     }

     if (error.message === 'ACCOUNT_DEACTIVATED') {
       return res.status(403).json({
         error: 'Your account has been deactivated.'
       });
     }

     console.error('Student login error:', error.message);

     return res.status(503).json({
       error: 'Login service temporarily unavailable.'
     });
   }
 });

 // Staff / Admin Login
 app.post('/api/auth/staff-login', async (req, res) => {
   const { staff_id, password } = req.body || {};

   const identifier = cleanText(staff_id).toLowerCase();

   if (!identifier || typeof password !== 'string' || !password) {
     return res.status(400).json({
       error: 'Staff ID / email and password are required.'
     });
   }

   try {
     const field = identifier.includes('@') ? 'email' : 'login_id';

     const { data: staff, error } = await supabase
       .from('app_users')
       .select('*')
       .in('role', ['staff', 'admin'])
       .ilike(field, identifier)
       .maybeSingle();

     if (error) throw error;

     if (!staff?.password_hash) {
       return res.status(401).json({
         error: 'Invalid Staff ID or credentials.'
       });
     }

     const passwordMatches = await bcrypt.compare(
       password,
       staff.password_hash
     );

     if (!passwordMatches) {
       return res.status(401).json({
         error: 'Invalid Staff ID or credentials.'
       });
     }

     if (!staff.is_active) {
       return res.status(403).json({
         error: 'Your account has been deactivated.'
       });
     }

     const token = createAuthToken(staff, '3d');

     const { error: auditError } = await supabase
       .from('audit_logs')
       .insert({
         actor_user_id: staff.id,
         actor_name: staff.full_name,
         actor_role: staff.role,
         action: 'STAFF_LOGIN',
         target_type: 'user',
         target_id: staff.id,
         metadata: { role: staff.role }
       });

     if (auditError) {
       console.error('Staff login audit error:', auditError.message);
     }

     return res.json({
       success: true,
       message: 'Staff authentication successful.',
       token,
       user: safeUserResponse(staff)
     });
   } catch (error) {
     console.error('Staff login error:', error.message);

     return res.status(503).json({
       error: 'Login service temporarily unavailable.'
     });
   }
 });

 // Get Current User
 app.get('/api/auth/me', authenticate, async (req, res) => {
   try {
     const { count, error } = await supabase
       .from('notifications')
       .select('id', { count: 'exact', head: true })
       .eq('user_id', req.user.id)
       .eq('is_read', false);

     if (error) throw error;

     return res.json({
       user: {
         ...req.user,
         unread_notifications_count: count || 0
       }
     });
   } catch (error) {
     console.error('Get profile error:', error.message);

     return res.status(503).json({
       error: 'Unable to load account information.'
     });
   }
 });

 // Update Profile
 app.put('/api/auth/profile', authenticate, async (req, res) => {
   try {
     const allowedFields = [
       'full_name',
       'email',
       'college',
       'district',
       'address',
       'contact_phone'
     ];

     const updates = {};

     for (const field of allowedFields) {
       if (req.body?.[field] !== undefined) {
         if (typeof req.body[field] !== 'string') {
           return res.status(400).json({
             error: `Invalid value for ${field}.`
           });
         }

         updates[field] = req.body[field].trim();
       }
     }

     if (updates.contact_phone) {
       updates.contact_phone = normalizePhone(
         updates.contact_phone
       );

       if (!isValidPhone(updates.contact_phone)) {
         return res.status(400).json({
           error: 'Invalid contact phone number.'
         });
       }
     }

     if (Object.keys(updates).length === 0) {
       return res.status(400).json({
         error: 'No profile changes provided.'
       });
     }

     const { data: updatedUser, error } = await supabase
       .from('app_users')
       .update(updates)
       .eq('id', req.user.id)
       .select('*')
       .single();

     if (error) {
       if (error.code === '23505') {
         return res.status(409).json({
           error: 'Email or phone already in use.'
         });
       }
       throw error;
     }

     const { error: auditError } = await supabase
       .from('audit_logs')
       .insert({
         actor_user_id: req.user.id,
         actor_name: req.user.full_name,
         actor_role: req.user.role,
         action: 'PROFILE_UPDATED',
         target_type: 'user',
         target_id: req.user.id,
         metadata: {
           fields: Object.keys(updates)
         }
       });

     if (auditError) {
       console.error('Profile audit error:', auditError.message);
     }

     return res.json({
       success: true,
       message: 'Profile updated successfully.',
       user: safeUserResponse(
         updatedUser,
         req.user.captain_assignment
       )
     });
   } catch (error) {
     console.error('Profile update error:', error.message);

     return res.status(503).json({
       error: 'Unable to update profile.'
     });
   }
 });

 
 // ==========================================
 // PART 3 — CAPTAIN & LEARNING APIs
 // ==========================================

 // Captain Student Verification
 app.get(
   '/api/captain/verify-student',
   authenticate,
   requireRole('captain', 'staff', 'admin'),
   async (req, res) => {
     const phone = normalizePhone(req.query.phone);

     if (!isValidPhone(phone)) {
       return res.status(400).json({
         error: 'Valid student phone number is required.'
       });
     }

     try {
       const { data: student, error } = await supabase
         .from('app_users')
         .select(
           'id, full_name, phone, program, academic_group, college, role, is_active'
         )
         .eq('phone', phone)
         .eq('role', 'student')
         .eq('is_active', true)
         .maybeSingle();

       if (error) throw error;

       if (!student) {
         return res.status(404).json({
           error: 'No active student found with this phone number.'
         });
       }

       if (
         req.user.role === 'captain' &&
         !hasCaptainProgramAccess(req.user, student.program)
       ) {
         return res.status(403).json({
           error: 'Student is outside your assigned program.'
         });
       }

       return res.json({
         success: true,
         student: {
           id: student.id,
           full_name: student.full_name,
           name: student.full_name,
           phone: student.phone,
           program: student.program,
           department: student.academic_group,
           academic_group: student.academic_group,
           college: student.college
         }
       });
     } catch (error) {
       console.error(
         'Captain student verification error:',
         error.message
       );

       return res.status(503).json({
         error: 'Unable to verify student right now.'
       });
     }
   }
 );

 // ------------------------------------------
 // Department Subject Mapping
 // ------------------------------------------

 const DEPARTMENT_SUBJECT_RULES = {
   Science: [
     'Bangla 1st Paper',
     'Bangla 2nd Paper',
     'English 1st Paper',
     'English 2nd Paper',
     'ICT',
     'Physics 1st Paper',
     'Physics 2nd Paper',
     'Chemistry 1st Paper',
     'Chemistry 2nd Paper',
     'Biology 1st Paper',
     'Biology 2nd Paper',
     'Higher Math 1st Paper',
     'Higher Math 2nd Paper'
   ],

   'Business Studies': [
     'Bangla 1st Paper',
     'Bangla 2nd Paper',
     'English 1st Paper',
     'English 2nd Paper',
     'ICT',
     'Finance 1st Paper',
     'Finance 2nd Paper',
     'Accounting 1st Paper',
     'Accounting 2nd Paper',
     'Marketing 1st Paper',
     'Marketing 2nd Paper',
     'Management 1st Paper',
     'Management 2nd Paper'
   ],

   Humanities: [
     'Bangla 1st Paper',
     'Bangla 2nd Paper',
     'English 1st Paper',
     'English 2nd Paper',
     'ICT',
     'Economics 1st Paper',
     'Economics 2nd Paper',
     'Geography 1st Paper',
     'Geography 2nd Paper',
     'Civics 1st Paper',
     'Civics 2nd Paper'
   ]
 };

 const ALL_REPORTING_SUBJECTS = [
   ...new Set(
     Object.values(DEPARTMENT_SUBJECT_RULES).flat()
   )
 ];

 // ------------------------------------------
 // Catalog
 // ------------------------------------------

 app.get('/api/catalog', (req, res) => {
   try {
     const {
       subject,
       department,
       program,
       search
     } = req.query;

     let records = db.getCatalog();

     if (!Array.isArray(records)) {
       records = [];
     }

     if (typeof subject === 'string' && subject.trim()) {
       const wantedSubject = subject.trim().toLowerCase();

       records = records.filter(
         record =>
           String(record.subject || '').toLowerCase() ===
           wantedSubject
       );
     }

     if (
       typeof department === 'string' &&
       DEPARTMENT_SUBJECT_RULES[department]
     ) {
       const allowed = DEPARTMENT_SUBJECT_RULES[department];

       records = records.filter(record =>
         allowed.includes(record.subject)
       );
     }

     if (typeof program === 'string' && program.trim()) {
       records = records.filter(record =>
         !record.program ||
         record.program === program.trim()
       );
     }

     if (typeof search === 'string' && search.trim()) {
       const term = search.trim().toLowerCase();

       records = records.filter(record =>
         [
           record.title,
           record.chapter,
           record.subject,
           record.date
         ].some(value =>
           String(value || '').toLowerCase().includes(term)
         )
       );
     }

     return res.json({
       total: records.length,
       subjects: ALL_REPORTING_SUBJECTS,
       department_mappings: DEPARTMENT_SUBJECT_RULES,
       items: records.slice(0, 100)
     });
   } catch (error) {
     console.error('Catalog error:', error.message);

     return res.status(503).json({
       error: 'Unable to load catalog.'
     });
   }
 });

 // ------------------------------------------
 // Upcoming Classes
 // ------------------------------------------

 app.get(
   '/api/classes/upcoming',
   authenticate,
   (req, res) => {
     try {
       const department = req.user.department;
       const program = req.user.program;

       let catalog = db.getCatalog();

       if (!Array.isArray(catalog)) {
         catalog = [];
       }

       let filtered = catalog;

       if (
         department &&
         DEPARTMENT_SUBJECT_RULES[department]
       ) {
         const allowed = DEPARTMENT_SUBJECT_RULES[department];

         filtered = filtered.filter(record =>
           allowed.includes(record.subject)
         );
       }

       if (program) {
         filtered = filtered.filter(record =>
           !record.program ||
           record.program === program
         );
       }

       return res.json({
         program: program || null,
         department: department || 'General',
         total_relevant_classes: filtered.length,
         classes: filtered.slice(0, 8)
       });
     } catch (error) {
       console.error(
         'Upcoming classes error:',
         error.message
       );

       return res.status(503).json({
         error: 'Unable to load upcoming classes.'
       });
     }
   }
 );

 // ==========================================
 // PART 4 — PRIVATE ATTACHMENTS
 // ==========================================

 const ATTACHMENT_BUCKET = 'ticket-attachments';
 const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

 const ATTACHMENT_TYPES = {
   jpg: 'image/jpeg',
   png: 'image/png',
   webp: 'image/webp',
   pdf: 'application/pdf'
 };

 const ATTACHMENT_PATH_REGEX =
   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$/i;

 // Ticket access is based on the actual ticket relationship.
 // Program membership alone does not grant access.
 function canAccessTicket(user, ticket) {
   if (isStaffRole(user.role)) return true;

   return (
     ticket.reporter_user_id === user.id ||
     ticket.affected_student_user_id === user.id
   );
 }

 function getPublicTicket(ticket) {
   return ticket;
 }

 const privateUpload = multer({
   storage: multer.memoryStorage(),
   limits: {
     fileSize: MAX_ATTACHMENT_SIZE
   },
   fileFilter: (req, file, cb) => {
     if (!Object.values(ATTACHMENT_TYPES).includes(file.mimetype)) {
       return cb(
         new Error('Only JPG, PNG, WebP and PDF files are allowed.')
       );
     }

     cb(null, true);
   }
 });

 // ------------------------------------------
 // Upload Attachment
 // ------------------------------------------

 app.post('/api/upload', authenticate, (req, res) => {
   privateUpload.single('file')(req, res, async uploadError => {
     if (uploadError) {
       return res.status(400).json({
         error: uploadError.message
       });
     }

     if (!req.file) {
       return res.status(400).json({
         error: 'No file uploaded.'
       });
     }

     try {
       const extension = Object.keys(ATTACHMENT_TYPES).find(
         ext => ATTACHMENT_TYPES[ext] === req.file.mimetype
       );

       if (!extension) {
         return res.status(400).json({
           error: 'Unsupported file type.'
         });
       }

       const { randomUUID } = await import('node:crypto');

       const filePath =
         `${req.user.id}/${randomUUID()}.${extension}`;

       const { error } = await supabase.storage
         .from(ATTACHMENT_BUCKET)
         .upload(filePath, req.file.buffer, {
           contentType: req.file.mimetype,
           upsert: false
         });

       if (error) throw error;

       return res.status(201).json({
         success: true,
         file: {
           path: filePath,
           name: req.file.originalname,
           size: req.file.size,
           type: req.file.mimetype
         }
       });
     } catch (error) {
       console.error('Attachment upload error:', error.message);

       return res.status(503).json({
         error: 'Unable to upload attachment.'
       });
     }
   });
 });

 // ------------------------------------------
 // Validate Attachment Ownership
 // ------------------------------------------

 async function validateAttachmentOwnership(attachments, user) {
   if (attachments === undefined || attachments === null) {
     return [];
   }

   if (!Array.isArray(attachments) || attachments.length > 10) {
     throw new Error('INVALID_ATTACHMENTS');
   }

   const validated = [];
   const seen = new Set();

   for (const attachment of attachments) {
     if (
       !attachment ||
       typeof attachment !== 'object' ||
       Array.isArray(attachment)
     ) {
       throw new Error('INVALID_ATTACHMENTS');
     }

     const { path: filePath, name, size, type } = attachment;

     if (
       typeof filePath !== 'string' ||
       !ATTACHMENT_PATH_REGEX.test(filePath) ||
       filePath.split('/')[0].toLowerCase() !== user.id.toLowerCase() ||
       seen.has(filePath) ||
       typeof name !== 'string' ||
       !name.trim() ||
       name.length > 255 ||
       !Number.isInteger(size) ||
       size < 1 ||
       size > MAX_ATTACHMENT_SIZE ||
       typeof type !== 'string'
     ) {
       throw new Error('INVALID_ATTACHMENTS');
     }

     const extension = filePath.split('.').pop().toLowerCase();

     if (ATTACHMENT_TYPES[extension] !== type) {
       throw new Error('INVALID_ATTACHMENTS');
     }

     const fileName = filePath.split('/')[1];

     const { data, error } = await supabase.storage
       .from(ATTACHMENT_BUCKET)
       .list(user.id, {
         search: fileName,
         limit: 100
       });

     if (error) {
       throw new Error('ATTACHMENT_STORAGE_ERROR');
     }

     const exists = (data || []).some(file =>
       file.name === fileName &&
       Number(file.metadata?.size) === size
     );

     if (!exists) {
       throw new Error('INVALID_ATTACHMENTS');
     }

     seen.add(filePath);

     validated.push({
       path: filePath,
       name: name.trim(),
       size,
       type
     });
   }

   return validated;
 }

 // ------------------------------------------
 // Secure Attachment Download
 // ------------------------------------------

 app.get(
   '/api/attachments/download',
   authenticate,
   async (req, res) => {
     try {
       const filePath = req.query.path;
       const ticketId = req.query.ticket_id;

       if (
         typeof filePath !== 'string' ||
         !ATTACHMENT_PATH_REGEX.test(filePath) ||
         typeof ticketId !== 'string' ||
         !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId)
       ) {
         return res.status(400).json({
           error: 'Valid attachment path and ticket ID are required.'
         });
       }

       const { data: ticket, error: ticketError } = await supabase
         .from('tickets')
         .select('*')
         .eq('id', ticketId)
         .maybeSingle();

       if (ticketError) throw ticketError;

       if (!ticket) {
         return res.status(404).json({
           error: 'Ticket not found.'
         });
       }

       if (!canAccessTicket(req.user, ticket)) {
         return res.status(403).json({
           error: 'You cannot access this ticket.'
         });
       }

       // The attachment must be bound to this exact ticket.
       const { data: binding, error: bindingError } = await supabase
         .from('attachment_bindings')
         .select('path, ticket_id, message_id')
         .eq('path', filePath)
         .eq('ticket_id', ticket.id)
         .maybeSingle();

       if (bindingError) throw bindingError;

       if (!binding) {
         return res.status(403).json({
           error: 'Attachment is not linked to this ticket.'
         });
       }

       const isStaff = isStaffRole(req.user.role);

       if (binding.message_id && !isStaff) {
         const { data: message, error: messageError } = await supabase
           .from('ticket_messages')
           .select('id, ticket_id, is_internal')
           .eq('id', binding.message_id)
           .eq('ticket_id', ticket.id)
           .maybeSingle();

         if (messageError) throw messageError;

         if (!message || message.is_internal) {
           return res.status(403).json({
             error: 'You cannot access this attachment.'
           });
         }
       }

       const { data: file, error: downloadError } =
         await supabase.storage
           .from(ATTACHMENT_BUCKET)
           .download(filePath);

       if (downloadError || !file) {
         return res.status(404).json({
           error: 'Attachment not found.'
         });
       }

       const extension = filePath.split('.').pop().toLowerCase();
       const buffer = Buffer.from(await file.arrayBuffer());

       res.setHeader(
         'Content-Type',
         ATTACHMENT_TYPES[extension]
       );
       res.setHeader('Content-Length', buffer.length);
       res.setHeader('Content-Disposition', 'attachment');
       res.setHeader('Cache-Control', 'private, no-store');
       res.setHeader('X-Content-Type-Options', 'nosniff');

       return res.send(buffer);
     } catch (error) {
       console.error(
         'Attachment download error:',
         error.message
       );

       return res.status(503).json({
         error: 'Unable to download attachment.'
       });
     }
   }
 );

 // ==========================================
 // PART 5 — TICKET APIs
 // ==========================================

 const TICKET_STATUSES = [
   'Open',
   'In Progress',
   'Waiting for Student',
   'Resolved',
   'Closed'
 ];

 const TICKET_PRIORITIES = [
   'Normal',
   'High',
   'Urgent'
 ];

 function ticketMetrics(tickets) {
   return {
     total: tickets.length,
     open: tickets.filter(t => t.status === 'Open').length,
     in_progress: tickets.filter(t => t.status === 'In Progress').length,
     resolved: tickets.filter(t => t.status === 'Resolved').length,
     closed: tickets.filter(t => t.status === 'Closed').length,
     urgent: tickets.filter(t =>
       ['Urgent', 'High'].includes(t.priority)
     ).length
   };
 }

 // ------------------------------------------
 // List Tickets
 // ------------------------------------------

 app.get('/api/tickets', authenticate, async (req, res) => {
   try {
     let query = supabase
       .from('tickets')
       .select('*');

     if (!isStaffRole(req.user.role)) {
       query = query.or(
         `reporter_user_id.eq.${req.user.id},affected_student_user_id.eq.${req.user.id}`
       );
     }

     const filters = [
       'category',
       'status',
       'priority',
       'program',
       'subject'
     ];

     for (const field of filters) {
       const value = req.query[field];

       if (
         typeof value === 'string' &&
         value.trim() &&
         value !== 'ALL'
       ) {
         query = query.eq(field, value.trim());
       }
     }

     if (
       typeof req.query.reporter_type === 'string' &&
       req.query.reporter_type !== 'ALL'
     ) {
       query = query.eq(
         'reporter_role',
         req.query.reporter_type
       );
     }

     const { data, error } = await query
       .order('created_at', { ascending: false })
       .limit(1000);

     if (error) throw error;

     let tickets = data || [];

     if (
       typeof req.query.search === 'string' &&
       req.query.search.trim()
     ) {
       const term = req.query.search.trim().toLowerCase();

       tickets = tickets.filter(ticket =>
         [
           ticket.ticket_number,
           ticket.title,
           ticket.description,
           ticket.reporter_name,
           ticket.reporter_phone,
           ticket.affected_student_phone
         ].some(value =>
           String(value || '').toLowerCase().includes(term)
         )
       );
     }

     return res.json({
       metrics: ticketMetrics(tickets),
       tickets: tickets.map(getPublicTicket)
     });
   } catch (error) {
     console.error('Ticket list error:', error.message);

     return res.status(503).json({
       error: 'Unable to load tickets.'
     });
   }
 });

 // ------------------------------------------
 // Create Ticket
 // ------------------------------------------

 app.post('/api/tickets', authenticate, async (req, res) => {
   try {
     if (!['student', 'captain'].includes(req.user.role)) {
       return res.status(403).json({
         error: 'Only students and captains can create tickets.'
       });
     }

     const {
       category,
       title,
       description,
       subject,
       priority,
       affected_scope,
       affected_student_phone,
       context_details,
       attachments
     } = req.body || {};

     if (
       !cleanText(category) ||
       !cleanText(description)
     ) {
       return res.status(400).json({
         error: 'Issue category and description are required.'
       });
     }

     const isCaptain = req.user.role === 'captain';

     const scope = isCaptain
       ? (affected_scope || 'self')
       : 'self';

     if (
       !['self', 'specific_student', 'both', 'cohort'].includes(scope)
     ) {
       return res.status(400).json({
         error: 'Invalid affected scope.'
       });
     }

     if (
       isCaptain &&
       !hasCaptainProgramAccess(req.user, req.user.program)
     ) {
       return res.status(403).json({
         error: 'No valid Captain program assignment.'
       });
     }

     // The authenticated user's program is authoritative.
     // Never trust a program supplied by the frontend.
     const ticketProgram = req.user.program;

     let affectedStudent = null;

     if (['specific_student', 'both'].includes(scope)) {
       if (
         !isCaptain ||
         !isValidPhone(affected_student_phone)
       ) {
         return res.status(400).json({
           error: 'A valid affected student phone is required.'
         });
       }

       const { data, error } = await supabase
         .from('app_users')
         .select(
           'id, full_name, phone, program, academic_group, role, is_active'
         )
         .eq('phone', normalizePhone(affected_student_phone))
         .eq('role', 'student')
         .eq('is_active', true)
         .maybeSingle();

       if (error) throw error;

       if (!data) {
         return res.status(404).json({
           error: 'Active affected student not found.'
         });
       }

       if (
         !hasCaptainProgramAccess(req.user, data.program)
       ) {
         return res.status(403).json({
           error: 'Student is outside your assigned program.'
         });
       }

       affectedStudent = data;
     }

     if (
       context_details !== undefined &&
       (
         !context_details ||
         typeof context_details !== 'object' ||
         Array.isArray(context_details)
       )
     ) {
       return res.status(400).json({
         error: 'Invalid context details.'
       });
     }

     const validatedAttachments =
       await validateAttachmentOwnership(
         attachments,
         req.user
       );

     const { data: ticket, error: ticketError } =
       await supabase.rpc('create_ticket_atomic', {
         p_reporter_user_id: req.user.id,
         p_category: cleanText(category),
         p_title:
           cleanText(title) ||
           `${cleanText(category)} Issue - ${cleanText(subject) || 'General'}`,
         p_description: cleanText(description),
         p_subject: cleanText(subject) || 'General',
         p_priority: TICKET_PRIORITIES.includes(priority)
           ? priority
           : 'Normal',
         p_affected_scope: scope,
         p_affected_student_user_id: affectedStudent?.id || null,
         p_context_details: context_details || {},
         p_attachments: validatedAttachments
       });

     if (ticketError) {
       if (ticketError.code === '23505') {
         return res.status(409).json({
           error: 'Attachment is already linked to another ticket.'
         });
       }

       if (
         /INVALID_ATTACHMENT|AFFECTED_STUDENT_NOT_ALLOWED|INVALID_TICKET/i
           .test(ticketError.message || '')
       ) {
         return res.status(400).json({
           error: 'Invalid ticket information or attachment.'
         });
       }

       throw ticketError;
     }

     // Check the RPC result against the authenticated program.
     // The SQL RPC must independently enforce this rule too.
     if (ticket?.program !== ticketProgram) {
       console.error(
         'Ticket RPC program mismatch:',
         ticket?.id
       );

       return res.status(500).json({
         error: 'Ticket program validation failed.'
       });
     }

     return res.status(201).json({
       success: true,
       message: 'Ticket created successfully.',
       ticket: getPublicTicket(ticket)
     });
   } catch (error) {
     console.error('Ticket creation error:', error.message);

     if (error.message === 'INVALID_ATTACHMENTS') {
       return res.status(400).json({
         error: 'Invalid attachment ownership, type or size.'
       });
     }

     return res.status(503).json({
       error: 'Unable to create ticket.'
     });
   }
 });

 // ------------------------------------------
 // Ticket Details & Messages
 // ------------------------------------------

 app.get('/api/tickets/:id', authenticate, async (req, res) => {
   try {
     const { data: ticket, error } = await supabase
       .from('tickets')
       .select('*')
       .eq('id', req.params.id)
       .maybeSingle();

     if (error) throw error;

     if (!ticket) {
       return res.status(404).json({
         error: 'Ticket not found.'
       });
     }

     if (!canAccessTicket(req.user, ticket)) {
       return res.status(403).json({
         error: 'Unauthorized to view this ticket.'
       });
     }

     let query = supabase
       .from('ticket_messages')
       .select('*')
       .eq('ticket_id', ticket.id);

     if (!isStaffRole(req.user.role)) {
       query = query.eq('is_internal', false);
     }

     const { data: messages, error: messageError } =
       await query.order('created_at', {
         ascending: true
       });

     if (messageError) throw messageError;

     return res.json({
       ticket: getPublicTicket(ticket),
       messages: messages || []
     });
   } catch (error) {
     console.error('Ticket details error:', error.message);

     return res.status(503).json({
       error: 'Unable to load ticket details.'
     });
   }
 });

 // ------------------------------------------
 // Reply to Ticket
 // ------------------------------------------

 app.post(
   '/api/tickets/:id/messages',
   authenticate,
   async (req, res) => {
     try {
       const {
         message,
         is_internal,
         attachments
       } = req.body || {};

       if (!cleanText(message)) {
         return res.status(400).json({
           error: 'Message content cannot be empty.'
         });
       }

       const { data: ticket, error: ticketError } =
         await supabase
           .from('tickets')
           .select('*')
           .eq('id', req.params.id)
           .maybeSingle();

       if (ticketError) throw ticketError;

       if (!ticket) {
         return res.status(404).json({
           error: 'Ticket not found.'
         });
       }

       if (!canAccessTicket(req.user, ticket)) {
         return res.status(403).json({
           error: 'Unauthorized to reply to this ticket.'
         });
       }

       const isStaff = isStaffRole(req.user.role);
       const internalFlag = isStaff && is_internal === true;

       const validatedAttachments =
         await validateAttachmentOwnership(
           attachments,
           req.user
         );

       const { data: newMessage, error: messageError } =
         await supabase.rpc('create_ticket_reply', {
           p_ticket_id: ticket.id,
           p_sender_user_id: req.user.id,
           p_message: cleanText(message),
           p_is_internal: internalFlag,
           p_attachments: validatedAttachments
         });

       if (messageError) {
         if (messageError.code === '23505') {
           return res.status(409).json({
             error: 'Attachment already linked to another message.'
           });
         }

         throw messageError;
       }

       // Notify ticket participants about public staff replies.
       if (isStaff && !internalFlag) {
         const recipients = [
           ticket.reporter_user_id,
           ticket.affected_student_user_id
         ].filter(
           (id, index, arr) =>
             id &&
             id !== req.user.id &&
             arr.indexOf(id) === index
         );

         if (recipients.length > 0) {
           const { error: notificationError } =
             await supabase
               .from('notifications')
               .insert(
                 recipients.map(userId => ({
                   user_id: userId,
                   title: 'টিকেট রিপ্লাই আপডেট',
                   message:
                     `সাপোর্ট টিম আপনার টিকেট ${ticket.ticket_number}-এ নতুন বার্তা পাঠিয়েছে।`,
                   type: 'ticket_reply',
                   ticket_id: ticket.id,
                   is_read: false
                 }))
               );

           if (notificationError) {
             console.error(
               'Reply notification error:',
               notificationError.message
             );
           }
         }
       }

       const { error: auditError } = await supabase
         .from('audit_logs')
         .insert({
           actor_user_id: req.user.id,
           actor_name: req.user.full_name,
           actor_role: req.user.role,
           action: internalFlag
             ? 'INTERNAL_NOTE_ADDED'
             : 'TICKET_REPLIED',
           target_type: 'ticket',
           target_id: ticket.id,
           metadata: {
             is_internal: internalFlag
           }
         });

       if (auditError) {
         console.error(
           'Ticket reply audit error:',
           auditError.message
         );
       }

       return res.status(201).json({
         success: true,
         message: newMessage
       });
     } catch (error) {
       console.error('Ticket reply error:', error.message);

       if (error.message === 'INVALID_ATTACHMENTS') {
         return res.status(400).json({
           error: 'Invalid attachment ownership, type or size.'
         });
       }

       return res.status(503).json({
         error: 'Unable to send ticket reply.'
       });
     }
   }
 );

 // ==========================================
 // PART 6 — TICKET MANAGEMENT
 // ==========================================

 // ------------------------------------------
 // Staff/Admin — Update Ticket
 // ------------------------------------------

 app.patch(
   '/api/tickets/:id',
   authenticate,
   requireRole('staff', 'admin'),
   async (req, res) => {
     try {
       const { data: ticket, error: findError } =
         await supabase
           .from('tickets')
           .select('*')
           .eq('id', req.params.id)
           .maybeSingle();

       if (findError) throw findError;

       if (!ticket) {
         return res.status(404).json({
           error: 'Ticket not found.'
         });
       }

       const {
         status,
         priority,
         assigned_staff_id,
         resolution_notes
       } = req.body || {};

       const updates = {};
       const changes = [];

       // Status
       if (status !== undefined) {
         if (!TICKET_STATUSES.includes(status)) {
           return res.status(400).json({
             error: 'Invalid ticket status.'
           });
         }

         if (status !== ticket.status) {
           updates.status = status;
           changes.push(
             `Status: ${ticket.status} → ${status}`
           );

           if (status === 'Resolved') {
             updates.resolved_at = new Date().toISOString();
           } else if (ticket.status === 'Resolved') {
             updates.resolved_at = null;
           }
         }
       }

       // Priority
       if (priority !== undefined) {
         if (!TICKET_PRIORITIES.includes(priority)) {
           return res.status(400).json({
             error: 'Invalid ticket priority.'
           });
         }

         if (priority !== ticket.priority) {
           updates.priority = priority;
           changes.push(
             `Priority: ${ticket.priority} → ${priority}`
           );
         }
       }

       // Staff Assignment
       if (assigned_staff_id !== undefined) {
         if (
           assigned_staff_id === null ||
           assigned_staff_id === ''
         ) {
           if (ticket.assigned_staff_id !== null) {
             updates.assigned_staff_id = null;
             updates.assigned_staff_name = null;
             changes.push('Staff assignment removed');
           }
         } else {
           const { data: staff, error: staffError } =
             await supabase
               .from('app_users')
               .select('id, full_name, role, is_active')
               .eq('id', assigned_staff_id)
               .maybeSingle();

           if (staffError) throw staffError;

           if (
             !staff ||
             !staff.is_active ||
             !isStaffRole(staff.role)
           ) {
             return res.status(400).json({
               error: 'Invalid or inactive staff member.'
             });
           }

           if (ticket.assigned_staff_id !== staff.id) {
             updates.assigned_staff_id = staff.id;
             updates.assigned_staff_name = staff.full_name;
             changes.push(
               `Assigned to ${staff.full_name}`
             );
           }
         }
       }

       // Resolution Notes
       if (resolution_notes !== undefined) {
         if (typeof resolution_notes !== 'string') {
           return res.status(400).json({
             error: 'Resolution notes must be text.'
           });
         }

         const notes = resolution_notes.trim();

         if (notes !== (ticket.resolution_notes || '')) {
           updates.resolution_notes = notes;
           changes.push('Resolution notes updated');
         }
       }

       if (Object.keys(updates).length === 0) {
         return res.json({
           success: true,
           ticket: getPublicTicket(ticket),
           message: 'No changes required.'
         });
       }

       updates.updated_at = new Date().toISOString();

       const { data: updatedTicket, error: updateError } =
         await supabase
           .from('tickets')
           .update(updates)
           .eq('id', ticket.id)
           .select('*')
           .single();

       if (updateError) throw updateError;

       // Notify reporter when ticket is resolved.
       if (
         updates.status === 'Resolved' &&
         ticket.status !== 'Resolved'
       ) {
         const recipients = [
           ticket.reporter_user_id,
           ticket.affected_student_user_id
         ].filter(
           (id, index, arr) =>
             id && arr.indexOf(id) === index
         );

         if (recipients.length > 0) {
           const { error: notificationError } =
             await supabase
               .from('notifications')
               .insert(
                 recipients.map(userId => ({
                   user_id: userId,
                   title: 'টিকেট সমাধান সম্পন্ন!',
                   message:
                     `আপনার টিকেট ${ticket.ticket_number} সমাধান করা হয়েছে।`,
                   type: 'ticket_resolved',
                   ticket_id: ticket.id,
                   is_read: false
                 }))
               );

           if (notificationError) {
             console.error(
               'Resolution notification error:',
               notificationError.message
             );
           }
         }
       }

       const { error: auditError } = await supabase
         .from('audit_logs')
         .insert({
           actor_user_id: req.user.id,
           actor_name: req.user.full_name,
           actor_role: req.user.role,
           action: 'TICKET_UPDATED',
           target_type: 'ticket',
           target_id: ticket.id,
           metadata: { changes }
         });

       if (auditError) {
         console.error(
           'Ticket update audit error:',
           auditError.message
         );
       }

       return res.json({
         success: true,
         ticket: getPublicTicket(updatedTicket),
         message: 'Ticket updated successfully.'
       });
     } catch (error) {
       console.error(
         'Ticket update error:',
         error.message
       );

       return res.status(503).json({
         error: 'Unable to update ticket.'
       });
     }
   }
 );

 // ------------------------------------------
 // Captain — Escalate Ticket
 // ------------------------------------------

 app.post(
   '/api/tickets/:id/escalate',
   authenticate,
   requireRole('captain'),
   async (req, res) => {
     try {
       const { data: ticket, error: findError } =
         await supabase
           .from('tickets')
           .select('*')
           .eq('id', req.params.id)
           .maybeSingle();

       if (findError) throw findError;

       if (!ticket) {
         return res.status(404).json({
           error: 'Ticket not found.'
         });
       }

       // A Captain may escalate only a ticket they reported.
       if (
         ticket.reporter_user_id !== req.user.id ||
         !hasCaptainProgramAccess(req.user, ticket.program)
       ) {
         return res.status(403).json({
           error: 'You cannot escalate this ticket.'
         });
       }

       if (ticket.status === 'Closed') {
         return res.status(400).json({
           error: 'Closed tickets cannot be escalated.'
         });
       }

       const reason = cleanText(req.body?.reason);

       if (reason.length > 2000) {
         return res.status(400).json({
           error: 'Escalation reason is too long.'
         });
       }

       const escalationMessage =
         `[ক্যাপ্টেন এসকেলেশন]: ${
           reason || 'জরুরি সমাধানের অনুরোধ'
         }`;

       // First save the escalation message through the existing
       // RPC, which also checks ticket access.
       const { error: messageError } =
         await supabase.rpc('create_ticket_reply', {
           p_ticket_id: ticket.id,
           p_sender_user_id: req.user.id,
           p_message: escalationMessage,
           p_is_internal: false,
           p_attachments: []
         });

       if (messageError) throw messageError;

       const { data: updatedTicket, error: updateError } =
         await supabase
           .from('tickets')
           .update({
             priority: 'Urgent',
             updated_at: new Date().toISOString()
           })
           .eq('id', ticket.id)
           .select('*')
           .single();

       if (updateError) throw updateError;

       const { error: auditError } = await supabase
         .from('audit_logs')
         .insert({
           actor_user_id: req.user.id,
           actor_name: req.user.full_name,
           actor_role: 'captain',
           action: 'TICKET_ESCALATED',
           target_type: 'ticket',
           target_id: ticket.id,
           metadata: { reason }
         });

       if (auditError) {
         console.error(
           'Escalation audit error:',
           auditError.message
         );
       }

       return res.json({
         success: true,
         ticket: getPublicTicket(updatedTicket),
         message: 'Ticket escalated to Urgent priority.'
       });
     } catch (error) {
       console.error(
         'Ticket escalation error:',
         error.message
       );

       return res.status(503).json({
         error: 'Unable to escalate ticket.'
       });
     }
   }
 );

 // ==========================================
 // PART 7 — NOTICES & NOTIFICATIONS
 // ==========================================

 // ------------------------------------------
 // List Notices
 // ------------------------------------------

 app.get('/api/notices', authenticate, async (req, res) => {
   try {
     const { data, error } = await supabase
       .from('notices')
       .select('*')
       .order('created_at', { ascending: false })
       .limit(200);

     if (error) throw error;

     const notices = (data || []).filter(notice => {
       if (isStaffRole(req.user.role)) return true;

       if (
         notice.program &&
         notice.program !== 'All' &&
         notice.program !== req.user.program
       ) {
         return false;
       }

       if (
         notice.department &&
         notice.department !== 'All' &&
         notice.department !== req.user.department
       ) {
         return false;
       }

       return true;
     });

     return res.json({ notices });
   } catch (error) {
     console.error('Notice list error:', error.message);

     return res.status(503).json({
       error: 'Unable to load notices.'
     });
   }
 });

 // ------------------------------------------
 // Create Notice — Staff/Admin
 // ------------------------------------------

 app.post(
   '/api/notices',
   authenticate,
   requireRole('staff', 'admin'),
   async (req, res) => {
     try {
       const {
         title,
         content,
         program,
         department,
         priority
       } = req.body || {};

       if (!cleanText(title) || !cleanText(content)) {
         return res.status(400).json({
           error: 'Notice title and content are required.'
         });
       }

       const { data: notice, error } = await supabase
         .from('notices')
         .insert({
           title: cleanText(title),
           content: cleanText(content),
           program: cleanText(program) || 'All',
           department: cleanText(department) || 'All',
           priority: cleanText(priority) || 'Normal',
           created_by_user_id: req.user.id,
           created_by_name: req.user.full_name
         })
         .select('*')
         .single();

       if (error) throw error;

       return res.status(201).json({
         success: true,
         notice
       });
     } catch (error) {
       console.error('Notice creation error:', error.message);

       return res.status(503).json({
         error: 'Unable to create notice.'
       });
     }
   }
 );

 // ------------------------------------------
 // Update Notice — Staff/Admin
 // ------------------------------------------

 app.patch(
   '/api/notices/:id',
   authenticate,
   requireRole('staff', 'admin'),
   async (req, res) => {
     try {
       const allowedFields = [
         'title',
         'content',
         'program',
         'department',
         'priority'
       ];

       const updates = {};

       for (const field of allowedFields) {
         if (req.body?.[field] !== undefined) {
           if (typeof req.body[field] !== 'string') {
             return res.status(400).json({
               error: `Invalid ${field}.`
             });
           }

           updates[field] = req.body[field].trim();
         }
       }

       if (
         updates.title === '' ||
         updates.content === ''
       ) {
         return res.status(400).json({
           error: 'Title and content cannot be empty.'
         });
       }

       if (Object.keys(updates).length === 0) {
         return res.status(400).json({
           error: 'No changes provided.'
         });
       }

       updates.updated_at = new Date().toISOString();

       const { data: notice, error } = await supabase
         .from('notices')
         .update(updates)
         .eq('id', req.params.id)
         .select('*')
         .maybeSingle();

       if (error) throw error;

       if (!notice) {
         return res.status(404).json({
           error: 'Notice not found.'
         });
       }

       return res.json({
         success: true,
         notice
       });
     } catch (error) {
       console.error('Notice update error:', error.message);

       return res.status(503).json({
         error: 'Unable to update notice.'
       });
     }
   }
 );

 // ------------------------------------------
 // Delete Notice — Staff/Admin
 // ------------------------------------------

 app.delete(
   '/api/notices/:id',
   authenticate,
   requireRole('staff', 'admin'),
   async (req, res) => {
     try {
       const { data, error } = await supabase
         .from('notices')
         .delete()
         .eq('id', req.params.id)
         .select('id');

       if (error) throw error;

       if (!data?.length) {
         return res.status(404).json({
           error: 'Notice not found.'
         });
       }

       return res.json({
         success: true,
         message: 'Notice deleted successfully.'
       });
     } catch (error) {
       console.error('Notice deletion error:', error.message);

       return res.status(503).json({
         error: 'Unable to delete notice.'
       });
     }
   }
 );

 // ------------------------------------------
 // My Notifications
 // ------------------------------------------

 app.get(
   '/api/notifications',
   authenticate,
   async (req, res) => {
     try {
       const { data, error } = await supabase
         .from('notifications')
         .select('*')
         .eq('user_id', req.user.id)
         .order('created_at', { ascending: false })
         .limit(100);

       if (error) throw error;

       return res.json({
         notifications: data || [],
         unread_count: (data || []).filter(
           notification => !notification.is_read
         ).length
       });
     } catch (error) {
       console.error(
         'Notification list error:',
         error.message
       );

       return res.status(503).json({
         error: 'Unable to load notifications.'
       });
     }
   }
 );

 // ------------------------------------------
 // Mark Notification as Read
 // ------------------------------------------

 app.patch(
   '/api/notifications/:id/read',
   authenticate,
   async (req, res) => {
     try {
       const { data, error } = await supabase
         .from('notifications')
         .update({ is_read: true })
         .eq('id', req.params.id)
         .eq('user_id', req.user.id)
         .select('*')
         .maybeSingle();

       if (error) throw error;

       if (!data) {
         return res.status(404).json({
           error: 'Notification not found.'
         });
       }

       return res.json({
         success: true,
         notification: data
       });
     } catch (error) {
       console.error(
         'Notification update error:',
         error.message
       );

       return res.status(503).json({
         error: 'Unable to update notification.'
       });
     }
   }
 );

 // ------------------------------------------
 // Mark All Notifications as Read
 // ------------------------------------------

 app.patch(
   '/api/notifications/read-all',
   authenticate,
   async (req, res) => {
     try {
       const { error } = await supabase
         .from('notifications')
         .update({ is_read: true })
         .eq('user_id', req.user.id)
         .eq('is_read', false);

       if (error) throw error;

       return res.json({
         success: true,
         message: 'All notifications marked as read.'
       });
     } catch (error) {
       console.error(
         'Mark all notifications error:',
         error.message
       );

       return res.status(503).json({
         error: 'Unable to update notifications.'
       });
     }
   }
 );

 // ==========================================
 // PART 8 — CAPTAINS, ROSTER & AUDIT LOGS
 // ==========================================

 // ------------------------------------------
 // Captain Management — List
 // ------------------------------------------

 app.get(
   '/api/admin/captains',
   authenticate,
   requireRole('staff', 'admin'),
   async (req, res) => {
     try {
       const { data: assignments, error: assignmentError } =
         await supabase
           .from('captain_assignments')
           .select('*')
           .eq('active', true)
           .eq('scope', 'program')
           .order('created_at', { ascending: false });

       if (assignmentError) throw assignmentError;

       const { data: users, error: usersError } =
         await supabase
           .from('app_users')
           .select(
             'id, full_name, phone, role, program, academic_group, college, is_active'
           )
           .in('role', ['student', 'captain'])
           .eq('is_active', true)
           .order('full_name', { ascending: true })
           .limit(1000);

       if (usersError) throw usersError;

       const userMap = new Map(
         (users || []).map(user => [user.id, user])
       );

       const captainIds = new Set(
         (assignments || []).map(a => a.captain_user_id)
       );

       const captains = (assignments || []).map(assignment => {
         const user = userMap.get(assignment.captain_user_id);

         return {
           id: assignment.captain_user_id,
           user_id: assignment.captain_user_id,
           assignment_id: assignment.id,
           name: user?.full_name || 'Unknown Captain',
           full_name: user?.full_name || '',
           phone: user?.phone || '',
           program: assignment.program,
           department: user?.academic_group || '',
           college: user?.college || '',
           scope: assignment.scope,
           active: assignment.active,
           assigned_at: assignment.created_at
         };
       });

       const candidates = (users || [])
         .filter(
           user =>
             user.role === 'student' &&
             !captainIds.has(user.id)
         )
         .map(user => ({
           id: user.id,
           user_id: user.id,
           name: user.full_name,
           full_name: user.full_name,
           phone: user.phone,
           program: user.program,
           department: user.academic_group,
           college: user.college
         }));

       return res.json({
         captains,
         candidates
       });
     } catch (error) {
       console.error('Captain list error:', error.message);

       return res.status(503).json({
         error: 'Unable to load Captain management data.'
       });
     }
   }
 );

 // ------------------------------------------
 // Promote / Revoke Captain
 // Compatible with api.toggleCaptain(...)
 // ------------------------------------------

 app.post(
   '/api/admin/captains/toggle',
   authenticate,
   requireRole('staff', 'admin'),
   async (req, res) => {
     const { user_id, make_captain } = req.body || {};

     if (
       typeof user_id !== 'string' ||
       typeof make_captain !== 'boolean'
     ) {
       return res.status(400).json({
         error: 'Valid user_id and make_captain are required.'
       });
     }

     try {
       const { data: target, error: targetError } =
         await supabase
           .from('app_users')
           .select('id, full_name, role, program, is_active')
           .eq('id', user_id)
           .maybeSingle();

       if (targetError) throw targetError;

       if (!target || !target.is_active) {
         return res.status(404).json({
           error: 'Active user not found.'
         });
       }

       if (!['student', 'captain'].includes(target.role)) {
         return res.status(403).json({
           error: 'Only student accounts can be assigned Captain access.'
         });
       }

       if (!target.program) {
         return res.status(400).json({
           error: 'User does not have an assigned program.'
         });
       }

       if (make_captain) {
         const { data: existing, error: existingError } =
           await supabase
             .from('captain_assignments')
             .select('id')
             .eq('captain_user_id', target.id)
             .eq('active', true)
             .limit(1);

         if (existingError) throw existingError;

         if (existing?.length) {
           return res.status(409).json({
             error: 'User already has an active Captain assignment.'
           });
         }

         const { error: insertError } = await supabase
           .from('captain_assignments')
           .insert({
             captain_user_id: target.id,
             program: target.program,
             scope: 'program',
             assigned_by_user_id: req.user.id,
             active: true
           });

         if (insertError) throw insertError;

         const { error: roleError } = await supabase
           .from('app_users')
           .update({ role: 'captain' })
           .eq('id', target.id);

         if (roleError) throw roleError;
       } else {
         const { error: revokeError } = await supabase
           .from('captain_assignments')
           .update({ active: false })
           .eq('captain_user_id', target.id)
           .eq('active', true);

         if (revokeError) throw revokeError;

         const { error: roleError } = await supabase
           .from('app_users')
           .update({ role: 'student' })
           .eq('id', target.id);

         if (roleError) throw roleError;
       }

       const { error: auditError } = await supabase
         .from('audit_logs')
         .insert({
           actor_user_id: req.user.id,
           actor_name: req.user.full_name,
           actor_role: req.user.role,
           action: make_captain
             ? 'CAPTAIN_ASSIGNED'
             : 'CAPTAIN_REVOKED',
           target_type: 'user',
           target_id: target.id,
           metadata: {
             program: target.program,
             scope: 'program'
           }
         });

       if (auditError) {
         console.error('Captain audit error:', auditError.message);
       }

       return res.json({
         success: true,
         message: make_captain
           ? 'Captain assigned successfully.'
           : 'Captain access revoked successfully.'
       });
     } catch (error) {
       console.error('Captain toggle error:', error.message);

       return res.status(503).json({
         error: 'Unable to update Captain assignment.'
       });
     }
   }
 );

 // ------------------------------------------
 // Eligibility Roster — Staff/Admin
 // ------------------------------------------


 // ==========================================
 // PART 11A — ROSTER SEARCH & FILTER
 // ==========================================

 app.get(
   '/api/admin/roster',
   authenticate,
   requireRole('staff', 'admin'),
   async (req, res) => {
     try {
       const program = String(req.query.program || 'ALL');
       const claimed = String(req.query.claimed || 'ALL');
       const search = String(req.query.search || '').trim();

       if (!['ALL', 'HSC 27', 'HSC 28'].includes(program)) {
         return res.status(400).json({
           error: 'Invalid program filter.'
         });
       }

       if (!['ALL', 'true', 'false'].includes(claimed)) {
         return res.status(400).json({
           error: 'Invalid claim status filter.'
         });
       }

       if (search.length > 100) {
         return res.status(400).json({
           error: 'Search query is too long.'
         });
       }

       const applyFilters = (query, includeSearch = true) => {
         let filtered = query;

         if (program !== 'ALL') {
           filtered = filtered.eq('program', program);
         }

         if (claimed !== 'ALL') {
           filtered = filtered.eq('is_claimed', claimed === 'true');
         }

         if (includeSearch && search) {
           const safeSearch = search.replace(
             /[%_,().\\]/g,
             ''
           );

           if (safeSearch) {
             filtered = filtered.or(
               `tms_id.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,student_name.ilike.%${safeSearch}%`
             );
           }
         }

         return filtered;
       };

       const rosterQuery = applyFilters(
         supabase
           .from('eligibility_roster')
           .select('*')
       );

       const { data: roster, error: rosterError } =
         await rosterQuery
           .order('created_at', { ascending: false })
           .limit(1000);

       if (rosterError) throw rosterError;

       // Metrics reflect the selected program/search,
       // but not the selected claimed/unclaimed filter.
       const metricBase = (query) => {
         let result = query;

         if (program !== 'ALL') {
           result = result.eq('program', program);
         }

         if (search) {
           const safeSearch = search.replace(
             /[%_,().\\]/g,
             ''
           );

           if (safeSearch) {
             result = result.or(
               `tms_id.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,student_name.ilike.%${safeSearch}%`
             );
           }
         }

         return result;
       };

       const [totalResult, claimedResult] = await Promise.all([
         metricBase(
           supabase
             .from('eligibility_roster')
             .select('*', { count: 'exact', head: true })
         ),
         metricBase(
           supabase
             .from('eligibility_roster')
             .select('*', { count: 'exact', head: true })
         ).eq('is_claimed', true)
       ]);

       if (totalResult.error) throw totalResult.error;
       if (claimedResult.error) throw claimedResult.error;

       const total = totalResult.count || 0;
       const claimedCount = claimedResult.count || 0;

       return res.json({
         success: true,
         roster: roster || [],
         metrics: {
           total,
           claimed: claimedCount,
           unclaimed: total - claimedCount
         }
       });

     } catch (error) {
       console.error('Roster fetch error:', error);

       return res.status(503).json({
         error: 'Unable to load roster.'
       });
     }
   }
 );

 // ------------------------------------------
 // Audit Logs — Staff/Admin
 // ------------------------------------------

 // ==========================================
 // PART 11B — AUDIT LOG SEARCH
 // ==========================================

 app.get(
   '/api/admin/audit-logs',
   authenticate,
   requireRole('staff', 'admin'),
   async (req, res) => {
     try {
       const search = String(req.query.search || '').trim();

       if (search.length > 100) {
         return res.status(400).json({
           error: 'Search query is too long.'
         });
       }

       let query = supabase
         .from('audit_logs')
         .select('*');

       if (search) {
         const safeSearch = search.replace(
           /[%_,().\\]/g,
           ''
         );

         if (safeSearch) {
           query = query.or(
             `action.ilike.%${safeSearch}%,actor_name.ilike.%${safeSearch}%,target_id.ilike.%${safeSearch}%`
           );
         }
       }

       const { data, error } = await query
         .order('created_at', { ascending: false })
         .limit(500);

       if (error) throw error;

       return res.json({
         success: true,
         logs: (data || []).map((log) => ({
           ...log,
           timestamp: log.created_at
         }))
       });

     } catch (error) {
       console.error('Audit log fetch error:', error);

       return res.status(503).json({
         error: 'Unable to load audit logs.'
       });
     }
   }
 );

 // ==========================================
 // PART 10 — ELIGIBILITY ROSTER IMPORT
 // ==========================================

 const ROSTER_IMPORT_LIMIT = 500;

 function normalizeRosterPhone(value) {
   let phone = String(value || '').replace(/\D/g, '');

   if (phone.startsWith('880')) {
     phone = '0' + phone.slice(3);
   }

   return phone;
 }

 function isValidRosterPhone(phone) {
   return /^01[3-9]\d{8}$/.test(phone);
 }

 app.post(
   '/api/admin/roster',
   authenticate,
   requireRole('staff', 'admin'),
   async (req, res) => {
     try {
       const entries = req.body?.entries;

       if (!Array.isArray(entries) || entries.length === 0) {
         return res.status(400).json({
           error: 'Roster entries are required.'
         });
       }

       if (entries.length > ROSTER_IMPORT_LIMIT) {
         return res.status(400).json({
           error: `Maximum ${ROSTER_IMPORT_LIMIT} records per import.`
         });
       }

       const prepared = [];
       const seen = new Set();
       const errors = [];

       // Validate every row before inserting.
       for (let index = 0; index < entries.length; index++) {
         const entry = entries[index];

         const tmsId = cleanText(entry?.tms_id);
         const phone = normalizeRosterPhone(entry?.phone);
         const program = cleanText(entry?.program);
         const studentName =
           cleanText(entry?.student_name) || 'Pre-approved Student';

         if (!tmsId || tmsId.length > 100) {
           errors.push(`Row ${index + 1}: Invalid TMS ID.`);
           continue;
         }

         if (!isValidRosterPhone(phone)) {
           errors.push(`Row ${index + 1}: Invalid phone number.`);
           continue;
         }

         if (!['HSC 27', 'HSC 28'].includes(program)) {
           errors.push(`Row ${index + 1}: Invalid program.`);
           continue;
         }

         if (studentName.length > 200) {
           errors.push(`Row ${index + 1}: Student name is too long.`);
           continue;
         }

         const key = `${tmsId}|${phone}|${program}`;

         if (seen.has(key)) {
           errors.push(`Row ${index + 1}: Duplicate entry in import.`);
           continue;
         }

         seen.add(key);

         prepared.push({
           tms_id: tmsId,
           phone,
           program,
           student_name: studentName
         });
       }

       if (errors.length > 0) {
         return res.status(400).json({
           error: 'Roster validation failed.',
           details: errors.slice(0, 50)
         });
       }

       // Check existing roster records.
       const { data: existingRows, error: lookupError } =
         await supabase
           .from('eligibility_roster')
           .select('tms_id, phone, program, is_claimed')
           .in('tms_id', [...new Set(prepared.map(r => r.tms_id))]);

       if (lookupError) throw lookupError;

       const existingIds = new Set(
         (existingRows || []).map(row => row.tms_id)
       );

       const newRows = prepared.filter(
         row => !existingIds.has(row.tms_id)
       );

       const skipped = prepared.length - newRows.length;

       if (newRows.length === 0) {
         return res.json({
           success: true,
           message: 'All records already exist.',
           imported: 0,
           skipped,
           total: prepared.length
         });
       }

       // Insert new entries only.
       // Existing claimed/unclaimed records are never overwritten.
       const { data: insertedRows, error: insertError } =
         await supabase
           .from('eligibility_roster')
           .insert(newRows)
           .select('tms_id');

       if (insertError) {
         console.error('Roster insert error:', insertError.message);

         return res.status(409).json({
           error:
             'Roster import failed. Check for duplicate IDs or phone numbers.'
         });
       }

       const imported = insertedRows?.length || 0;

       // Best-effort audit log.
       const { error: auditError } = await supabase
         .from('audit_logs')
         .insert({
           actor_user_id: req.user.id,
           actor_name: req.user.full_name,
           actor_role: req.user.role,
           action: 'ROSTER_IMPORTED',
           target_type: 'eligibility_roster',
           metadata: {
             imported,
             skipped,
             total: prepared.length
           }
         });

       if (auditError) {
         console.error('Roster audit error:', auditError.message);
       }

       return res.status(201).json({
         success: true,
         message: 'Roster import completed.',
         imported,
         skipped,
         total: prepared.length
       });

     } catch (error) {
       console.error('Roster import error:', error);

       return res.status(503).json({
         error: 'Unable to import roster records.'
       });
     }
   }
 );

 // ==========================================
 // PART 12 — CAPTAIN REGISTRATION
 // ==========================================

 function normalizeCaptainPhone(value) {
   let phone = String(value || '').replace(/\D/g, '');

   if (phone.startsWith('880')) {
     phone = '0' + phone.slice(3);
   }

   return phone;
 }

 function hashCaptainInvite(code) {
   return crypto
     .createHash('sha256')
     .update(String(code))
     .digest('hex');
 }


app.post('/api/auth/captain-register', async (req, res) => {
  try {
    const phone = normalizeCaptainPhone(req.body?.phone);
    const invitationCode = String(
      req.body?.invitation_code || ''
    ).trim();
    const password = String(req.body?.password || '');

    if (
      !/^01[3-9]\d{8}$/.test(phone) ||
      !/^\d{8}$/.test(invitationCode) ||
      password.length < 10 ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({
        error: 'Invalid registration information.'
      });
    }

    const invitationHash = hashCaptainInvite(invitationCode);
    const passwordHash = await bcrypt.hash(password, 12);


const { data: result, error } = await supabase.rpc(
  'register_captain_atomic',
  {
    p_phone: phone,
    p_invitation_hash: invitationHash,
    p_password_hash: passwordHash
  }
);

if (error) {
  console.error('Captain registration failed:', error.message);

  return res.status(409).json({
    error: 'Registration could not be completed. Contact Admin.'
  });
}

if (!result?.success) {
  return res.status(403).json({
    error: 'Invalid, expired or locked registration code.'
  });
}

return res.status(201).json({
  success: true,
  user_id: result.user_id,
  message: 'Captain registration completed. Please log in.'
});


  } catch (error) {
    console.error('Captain registration error:', error);

    return res.status(500).json({
      error: 'Unable to complete Captain registration.'
    });
  }
});


// ==========================================
// PART 14 — CAPTAIN INVITATION MANAGEMENT
// ==========================================

// Admin-only: list pre-approved captains
app.get(
  '/api/admin/captain-roster',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('captain_roster')
        .select(
          'id, program, subject, full_name, login_phone, reference_ids, claimed_user_id, is_active, invitation_expires_at, created_at'
        )
        .order('program')
        .order('subject');

      if (error) throw error;

      return res.json({
        success: true,
        captains: (data || []).map(row => ({
          ...row,
          registration_status: row.claimed_user_id
            ? 'Registered'
            : 'Not Registered'
        }))
      });
    } catch (error) {
      console.error('Captain roster error:', error.message);

      return res.status(503).json({
        error: 'Unable to load Captain roster.'
      });
    }
  }
);

// Admin-only: generate a single-use registration code
app.post(
  '/api/admin/captain-roster/:id/invite',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    try {
      const id = req.params.id;

      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
      ) {
        return res.status(400).json({
          error: 'Invalid Captain ID.'
        });
      }

      const { data: captain, error: lookupError } =
        await supabase
          .from('captain_roster')
          .select('id, full_name, login_phone, claimed_user_id, is_active')
          .eq('id', id)
          .maybeSingle();

      if (lookupError) throw lookupError;

      if (
        !captain ||
        !captain.is_active ||
        captain.claimed_user_id
      ) {
        return res.status(409).json({
          error: 'Captain is unavailable or already registered.'
        });
      }

      const code = String(
        crypto.randomInt(0, 100000000)
      ).padStart(8, '0');

      const codeHash = hashCaptainInvite(code);

      const expiresAt = new Date(
        Date.now() + 15 * 60 * 1000
      ).toISOString();

      const { data: updated, error: updateError } =
        await supabase
          .from('captain_roster')
          .update({
            invitation_code_hash: codeHash,
            invitation_expires_at: expiresAt,
            invitation_attempts: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('is_active', true)
          .is('claimed_user_id', null)
          .select('id')
          .maybeSingle();

      if (updateError) throw updateError;

      if (!updated) {
        return res.status(409).json({
          error: 'Captain registration status changed.'
        });
      }

      // Never put the registration code in audit logs.
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          actor_user_id: req.user.id,
          actor_name: req.user.full_name,
          actor_role: req.user.role,
          action: 'CAPTAIN_INVITATION_ISSUED',
          target_type: 'captain_roster',
          target_id: id,
          metadata: {
            login_phone: captain.login_phone,
            expires_at: expiresAt
          }
        });

      if (auditError) {
        console.error('Invitation audit error:', auditError.message);
      }

      res.set('Cache-Control', 'no-store');

      return res.json({
        success: true,
        captain_name: captain.full_name,
        login_phone: captain.login_phone,
        registration_code: code,
        expires_at: expiresAt,
        message: 'Share this code privately with the Captain.'
      });
    } catch (error) {
      console.error('Captain invitation error:', error.message);

      return res.status(503).json({
        error: 'Unable to generate registration code.'
      });
    }
  }
);

 // ==========================================
 // PART 9 — HEALTH CHECK & SERVER STARTUP
 // ==========================================

 // ------------------------------------------
 // API Health Check
 // ------------------------------------------

 app.get('/api/health', (req, res) => {
   return res.status(200).json({
     success: true,
     status: 'ok',
     service: 'Connect 10MS API',
     timestamp: new Date().toISOString()
   });
 });

 // ------------------------------------------
 // Global Error Handler
 // ------------------------------------------

 app.use((error, req, res, next) => {
   console.error('Unhandled server error:', error);

   if (res.headersSent) {
     return next(error);
   }

   return res.status(500).json({
     success: false,
     error: 'An unexpected server error occurred.'
   });
 });

 // ------------------------------------------
 // Serve React Production Build
 // ------------------------------------------

 const DIST_DIR = path.join(__dirname, '../dist');

 if (fs.existsSync(DIST_DIR)) {
   app.use(express.static(DIST_DIR));

   app.use((req, res) => {
     if (
       req.path.startsWith('/api/') ||
       req.path.startsWith('/uploads/')
     ) {
       return res.status(404).json({
         error: 'Endpoint not found.'
       });
     }

     return res.sendFile(
       path.join(DIST_DIR, 'index.html')
     );
   });
 } else {
   app.use((req, res) => {
     if (req.path.startsWith('/api/')) {
       return res.status(404).json({
         error: 'Endpoint not found.'
       });
     }

     return res.send(
       'Connect 10MS API is running.'
     );
   });
 }

 // ------------------------------------------
 // Start Express Server
 // ------------------------------------------

 app.listen(PORT, () => {
   console.log('======================================');
   console.log(' Connect 10MS Server');
   console.log(` Port: ${PORT}`);
   console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
   console.log('======================================');
 });
