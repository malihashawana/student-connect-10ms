import bcrypt from 'bcryptjs';
import { db, saveDBSync } from './db.js';

export function seedDatabase(force = false) {
  const state = db.getState();

  // If already seeded and not force, skip
  if (!force && state.users && state.users.length > 0) {
    console.log('Database already contains users. Skipping seed.');
    return;
  }

  console.log('Seeding Connect 10ms database...');

  // Reset arrays
  state.roster = [];
  state.users = [];
  state.tickets = [];
  state.ticket_messages = [];
  state.notices = [];
  state.notifications = [];
  state.audit_logs = [];
  state.captain_assignments = [];

  const saltRounds = 10;
  const adminPasswordHash = bcrypt.hashSync('admin123', saltRounds);
  const captainPasswordHash = bcrypt.hashSync('captain123', saltRounds);
  const studentPasswordHash = bcrypt.hashSync('student123', saltRounds);

  // 1. Staff / Admin User
  const adminUser = {
    id: 'STAFF-1001',
    role: 'admin',
    staff_id: 'STAFF-1001',
    phone: '01700000000',
    email: 'admin@10ms.com',
    full_name: 'Tanvir Hossain (Lead Operations)',
    program: 'ALL',
    department: 'ALL',
    status: 'active',
    password_hash: adminPasswordHash,
    created_at: '2026-10-01T08:00:00Z'
  };
  state.users.push(adminUser);

  // Support Staff User
  const staffUser = {
    id: 'STAFF-1002',
    role: 'staff',
    staff_id: 'STAFF-1002',
    phone: '01700000002',
    email: 'support.officer@10ms.com',
    full_name: 'Anika Rahman (Issue Desk Specialist)',
    program: 'ALL',
    department: 'ALL',
    status: 'active',
    password_hash: adminPasswordHash,
    created_at: '2026-10-05T08:00:00Z'
  };
  state.users.push(staffUser);

  // 2. Captain User (HSC 28 - Science)
  const captainUser = {
    id: 'USR-2026-001',
    role: 'captain',
    phone: '01711000001',
    tms_id: 'TMS-2026-78901',
    full_name: 'Rahat Chowdhury (Captain)',
    email: 'rahat.captain@gmail.com',
    program: 'HSC 28',
    department: 'Science',
    college: 'Dhaka College',
    district: 'Dhaka',
    class_level: 'HSC 1st Year',
    academic_year: '2026-2028',
    address: 'Dhanmondi, Dhaka',
    status: 'active',
    password_hash: captainPasswordHash,
    created_at: '2026-10-10T09:30:00Z'
  };
  state.users.push(captainUser);
  state.captain_assignments.push({
    id: 'CAPT-001',
    captain_user_id: captainUser.id,
    program: 'HSC 28',
    scope: 'Science & General',
    assigned_by_user_id: adminUser.id,
    active: true,
    created_at: '2026-10-10T10:00:00Z'
  });

  // 3. Student (HSC 28 - Science)
  const studentScience = {
    id: 'USR-2026-002',
    role: 'student',
    phone: '01811000002',
    tms_id: 'TMS-2026-78902',
    full_name: 'Sadia Islam',
    email: 'sadia.islam@gmail.com',
    program: 'HSC 28',
    department: 'Science',
    college: 'Viqarunnisa Noon College',
    district: 'Dhaka',
    class_level: 'HSC 1st Year',
    academic_year: '2026-2028',
    address: 'Baily Road, Dhaka',
    status: 'active',
    password_hash: studentPasswordHash,
    created_at: '2026-10-12T11:00:00Z'
  };
  state.users.push(studentScience);

  // 4. Student (HSC 28 - Business Studies)
  const studentBusiness = {
    id: 'USR-2026-003',
    role: 'student',
    phone: '01911000003',
    tms_id: 'TMS-2026-78903',
    full_name: 'Fahim Ahsan',
    email: 'fahim.ahsan@gmail.com',
    program: 'HSC 28',
    department: 'Business Studies',
    college: 'Notre Dame College',
    district: 'Dhaka',
    class_level: 'HSC 1st Year',
    academic_year: '2026-2028',
    address: 'Motijheel, Dhaka',
    status: 'active',
    password_hash: studentPasswordHash,
    created_at: '2026-10-14T14:15:00Z'
  };
  state.users.push(studentBusiness);

  // 5. Student (HSC 27 - Humanities)
  const studentHumanities = {
    id: 'USR-2026-004',
    role: 'student',
    phone: '01611000004',
    tms_id: 'TMS-2026-78904',
    full_name: 'Nusrat Jahan',
    email: 'nusrat.jahan@gmail.com',
    program: 'HSC 27',
    department: 'Humanities',
    college: 'Holy Cross College',
    district: 'Dhaka',
    class_level: 'HSC 2nd Year',
    academic_year: '2025-2027',
    address: 'Tejgaon, Dhaka',
    status: 'active',
    password_hash: studentPasswordHash,
    created_at: '2026-10-15T16:00:00Z'
  };
  state.users.push(studentHumanities);

  // 6. Roster entries (Pre-approved list)
  // Already claimed entries matching above users:
  state.roster.push(
    {
      id: 'ROS-001',
      tms_id: 'TMS-2026-78901',
      phone: '01711000001',
      program: 'HSC 28',
      student_name: 'Rahat Chowdhury',
      is_claimed: true,
      claimed_by_user_id: captainUser.id,
      claimed_at: '2026-10-10T09:30:00Z',
      import_source: 'Admin Initial Roster'
    },
    {
      id: 'ROS-002',
      tms_id: 'TMS-2026-78902',
      phone: '01811000002',
      program: 'HSC 28',
      student_name: 'Sadia Islam',
      is_claimed: true,
      claimed_by_user_id: studentScience.id,
      claimed_at: '2026-10-12T11:00:00Z',
      import_source: 'Admin Initial Roster'
    },
    {
      id: 'ROS-003',
      tms_id: 'TMS-2026-78903',
      phone: '01911000003',
      program: 'HSC 28',
      student_name: 'Fahim Ahsan',
      is_claimed: true,
      claimed_by_user_id: studentBusiness.id,
      claimed_at: '2026-10-14T14:15:00Z',
      import_source: 'Admin Initial Roster'
    },
    {
      id: 'ROS-004',
      tms_id: 'TMS-2026-78904',
      phone: '01611000004',
      program: 'HSC 27',
      student_name: 'Nusrat Jahan',
      is_claimed: true,
      claimed_by_user_id: studentHumanities.id,
      claimed_at: '2026-10-15T16:00:00Z',
      import_source: 'Admin Initial Roster'
    }
  );

  // Ready unclaimed roster entries for testing new registration wizard:
  const unclaimedRosters = [
    { tms: 'TMS-2026-90001', phone: '01700112233', prog: 'HSC 28', name: 'Zubair Hossain' },
    { tms: 'TMS-2026-90002', phone: '01800223344', prog: 'HSC 28', name: 'Tasnim Haque' },
    { tms: 'TMS-2026-90003', phone: '01900334455', prog: 'HSC 27', name: 'Arman Mallik' },
    { tms: 'TMS-2026-90004', phone: '01500445566', prog: 'HSC 27', name: 'Afsana Mimi' },
    { tms: 'TMS-2026-90005', phone: '01300556677', prog: 'HSC 28', name: 'Kawsar Mahmud' },
    { tms: 'TMS-2026-90006', phone: '01400667788', prog: 'HSC 28', name: 'Nafis Imtiaz' }
  ];

  unclaimedRosters.forEach((ur, idx) => {
    state.roster.push({
      id: `ROS-${(idx + 5).toString().padStart(3, '0')}`,
      tms_id: ur.tms,
      phone: ur.phone,
      program: ur.prog,
      student_name: ur.name,
      is_claimed: false,
      claimed_by_user_id: null,
      claimed_at: null,
      import_source: 'bKash/Nagad Verified Batch'
    });
  });

  // 7. Seed Notices
  state.notices.push(
    {
      id: 'NOT-2026-001',
      title: 'HSC 28 অনলাইন ব্যাচ: স্পেশাল রিভিশন ক্লাস ও ডেইলি এক্সাম শিডিউল',
      content: 'সকল শিক্ষার্থীদের জানানো যাচ্ছে যে অক্টোবর মাসের সকল লাইভ ক্লাস এবং ডেইলি এক্সামের নতুন শিডিউল শিট আপডেট করা হয়েছে। শিক্ষার্থীরা তাদের ড্যাশবোর্ড থেকে রুটিন দেখে নির্ধারিত সময়ে ক্লাসে উপস্থিত থাকবেন।',
      priority: 'Urgent',
      target_program: 'HSC 28',
      target_department: 'ALL',
      is_active: true,
      publish_date: '2026-10-16T10:00:00Z',
      expiry_date: '2026-12-31T23:59:59Z',
      created_by: adminUser.full_name,
      created_at: '2026-10-16T10:00:00Z'
    },
    {
      id: 'NOT-2026-002',
      title: 'সার্ভার মেইনটেন্যান্স ও লাইভ প্লেয়ার অপটিমাইজেশন বিজ্ঞপ্তি',
      content: 'আজ রাত ১২:০০ টা থেকে ২:০০ টা পর্যন্ত ১০ মিনিট স্কুল অ্যাপ ও ওয়েব সার্ভার মেইনটেন্যান্সের কাজ চলবে। সাময়িক অসুবিধার জন্য আন্তরিকভাবে দুঃখিত।',
      priority: 'High',
      target_program: 'ALL',
      target_department: 'ALL',
      is_active: true,
      publish_date: '2026-10-20T12:00:00Z',
      expiry_date: '2026-11-30T23:59:59Z',
      created_by: staffUser.full_name,
      created_at: '2026-10-20T12:00:00Z'
    },
    {
      id: 'NOT-2026-003',
      title: 'HSC 27 ক্যান্ডিডেটদের জন্য CQ এক্সাম খাতা মূল্যায়ন গাইডলাইন',
      content: 'মানবিক ও কমার্স বিভাগের শিক্ষার্থীরা পরীক্ষার খাতা জমাদানের পর আগামী ৭২ ঘণ্টার মধ্যে টিচার্স কমেন্ট ও মার্কস ড্যাশবোর্ডে দেখতে পাবেন।',
      priority: 'Normal',
      target_program: 'HSC 27',
      target_department: 'ALL',
      is_active: true,
      publish_date: '2026-10-22T08:00:00Z',
      expiry_date: '2026-11-25T23:59:59Z',
      created_by: adminUser.full_name,
      created_at: '2026-10-22T08:00:00Z'
    }
  );

  // 8. Seed Initial Tickets
  // Ticket 1: Class Issue
  const tkt1 = {
    id: 'TKT-2026-101',
    reporter_user_id: studentScience.id,
    reporter_role: 'student',
    reporter_name: studentScience.full_name,
    reporter_phone: studentScience.phone,
    affected_scope: 'self',
    affected_student_phone: null,
    affected_student_name: null,
    category: 'Class',
    program: 'HSC 28',
    department: 'Science',
    subject: 'Higher Math 1st Paper',
    priority: 'Normal',
    status: 'In Progress',
    title: 'লাইভ ক্লাসে অডিও ও ভিডিও সিংক হচ্ছে না (ম্যাট্রিক্স ও নির্ণায়ক)',
    description: 'গতকালকের হায়ার ম্যাথ লাইভ ক্লাসে শেষের ৩০ মিনিট স্যার যখন ম্যাট্রিক্সের বিপরীত ম্যাট্রিক্স করাচ্ছিলেন তখন স্যারের কথা আগে আসছিল এবং ভিডিও ৫ সেকেন্ড পিছিয়ে যাচ্ছিল। স্লাইডও ফ্রিজ হয়ে গিয়েছিল।',
    context_details: {
      class_type: 'Live Class',
      class_date: 'October 1, 2026, Thursday',
      session_title: 'ম্যাট্রিক্সের ধারণা ও যোগ-বিয়োগ',
      problem_specific: 'Audio-Video sync issue & slide freeze'
    },
    attachments: [
      { name: 'screen_freeze_matrix.png', url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80', size: '240 KB', type: 'image/png' }
    ],
    assigned_staff_id: staffUser.id,
    assigned_staff_name: staffUser.full_name,
    resolution_notes: null,
    resolved_at: null,
    created_at: '2026-10-18T14:20:00Z',
    updated_at: '2026-10-18T16:00:00Z'
  };
  state.tickets.push(tkt1);

  state.ticket_messages.push(
    {
      id: 'MSG-001',
      ticket_id: tkt1.id,
      sender_user_id: studentScience.id,
      sender_name: studentScience.full_name,
      sender_role: 'student',
      message: 'গতকালকের হায়ার ম্যাথ লাইভ ক্লাসে শেষের ৩০ মিনিট স্যারের অডিও ও ভিডিও মিলছিল না। দয়া করে রেকর্ডেড ব্যাকআপ চেক করুন।',
      is_internal: false,
      attachments: tkt1.attachments,
      created_at: '2026-10-18T14:20:00Z'
    },
    {
      id: 'MSG-002',
      ticket_id: tkt1.id,
      sender_user_id: staffUser.id,
      sender_name: staffUser.full_name,
      sender_role: 'staff',
      message: 'প্রিয় সাদিয়া, আমরা ব্রডকাস্ট ব্যাকআপ ভিডিওটি প্রসেস করে লাইব্রেরিতে ফ্রেশ এনকোডেড ভার্সন আপলোড করে দিচ্ছি। ১ ঘণ্টার মধ্যে চেক করতে পারবেন।',
      is_internal: false,
      attachments: [],
      created_at: '2026-10-18T16:00:00Z'
    },
    {
      id: 'MSG-003',
      ticket_id: tkt1.id,
      sender_user_id: staffUser.id,
      sender_name: staffUser.full_name,
      sender_role: 'staff',
      message: 'Tech team verified: Stream ingestion buffer spiked at 21:40 GMT+6. Replaced with local teacher recording.',
      is_internal: true,
      attachments: [],
      created_at: '2026-10-18T16:05:00Z'
    }
  );

  // Ticket 2: Exam Issue (Daily Exam with Column G title!)
  const tkt2 = {
    id: 'TKT-2026-102',
    reporter_user_id: studentBusiness.id,
    reporter_role: 'student',
    reporter_name: studentBusiness.full_name,
    reporter_phone: studentBusiness.phone,
    affected_scope: 'self',
    affected_student_phone: null,
    affected_student_name: null,
    category: 'Exam',
    program: 'HSC 28',
    department: 'Business Studies',
    subject: 'Finance 1st Paper',
    priority: 'High',
    status: 'Open',
    title: 'ডেইলি এক্সাম সাবমিট করার পর অটো ০ মার্ক দেখাচ্ছে',
    description: 'ফাইন্যান্স প্রথম পত্রের অর্থায়নের সূচনা ডেইলি এক্সামে ১৫ টি প্রশ্নের মধ্যে ১৪ টির উত্তর দিয়ে সাবমিট করার পর স্কোরবোর্ডে ফলাফল ০ দেখাচ্ছে এবং উত্তরপত্র রিভিউ করা যাচ্ছে না।',
    context_details: {
      exam_type: 'Daily Exam',
      exam_date: 'October 1, 2026, Thursday',
      is_date_na: false,
      exam_title: 'অর্থায়নের ধারণা, ক্রমবিকাশ, এবং স্বরূপ', // From sheet Column G
      problem_type: 'Wrong marks computation & submission glitch'
    },
    attachments: [],
    assigned_staff_id: null,
    assigned_staff_name: null,
    resolution_notes: null,
    resolved_at: null,
    created_at: '2026-10-19T09:10:00Z',
    updated_at: '2026-10-19T09:10:00Z'
  };
  state.tickets.push(tkt2);

  // Ticket 3: Captain Escalated Issue
  const tkt3 = {
    id: 'TKT-2026-103',
    reporter_user_id: captainUser.id,
    reporter_role: 'captain',
    reporter_name: captainUser.full_name,
    reporter_phone: captainUser.phone,
    affected_scope: 'specific_student',
    affected_student_phone: studentScience.phone,
    affected_student_name: studentScience.full_name,
    category: 'App/Website',
    program: 'HSC 28',
    department: 'Science',
    subject: 'Physics 1st Paper',
    priority: 'Urgent',
    status: 'Open',
    title: '[Captain Escalation] অ্যান্ড্রয়েড অ্যাপে ভিডিও প্লেয়ারে এরর 403 দেখাচ্ছে',
    description: 'শিক্ষার্থী সাদিয়া ইসলাম আমাকে ক্যাপ্টেন হিসেবে রিপোর্ট করেছেন যে ১০ মিনিট স্কুল অ্যান্ড্রয়েড অ্যাপের ভার্সন ৪.৮.২ এ ফিজিক্স ভিডিও প্লে করতে গেলে Forbidden 403 দেখাচ্ছে। ওয়েবে লগইন কাজ করলেও অ্যাপে ভিডিও লোড হচ্ছে না। আমি ক্যাপ্টেন হিসেবে এটি আর্জেন্ট তদন্তের জন্য পাঠাচ্ছি।',
    context_details: {
      app_platform: 'Android App',
      app_version: 'v4.8.2 (Build 202610)',
      problem_type: 'Video player DRM/403 stream error',
      device_info: 'Samsung Galaxy A54, Android 14'
    },
    attachments: [
      { name: 'app_error_403.jpg', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80', size: '180 KB', type: 'image/jpeg' }
    ],
    assigned_staff_id: adminUser.id,
    assigned_staff_name: adminUser.full_name,
    resolution_notes: null,
    resolved_at: null,
    created_at: '2026-10-20T11:45:00Z',
    updated_at: '2026-10-20T11:50:00Z'
  };
  state.tickets.push(tkt3);

  // Ticket 4: Resolved Ticket
  const tkt4 = {
    id: 'TKT-2026-104',
    reporter_user_id: studentHumanities.id,
    reporter_role: 'student',
    reporter_name: studentHumanities.full_name,
    reporter_phone: studentHumanities.phone,
    affected_scope: 'self',
    affected_student_phone: null,
    affected_student_name: null,
    category: 'Others',
    program: 'HSC 27',
    department: 'Humanities',
    subject: 'Civics 2nd Paper',
    priority: 'Normal',
    status: 'Resolved',
    title: 'পৌরনীতি লেকচার শিট ডাউনলোড লিংকে ৪MD পেজ ওপেন হচ্ছে না',
    description: 'ব্রিটিশ ভারতে প্রতিনিধিত্বশীল সরকারের বিকাশ লেকচারের পিডিএফ হ্যান্ডনোট ডাউনলোড করার অপশন কাজ করছিল না।',
    context_details: {
      other_subtype: 'Study Material / Lecture Sheet Download',
      custom_notes: 'Civics Chapter 1 PDF link broken'
    },
    attachments: [],
    assigned_staff_id: staffUser.id,
    assigned_staff_name: staffUser.full_name,
    resolution_notes: 'পিডিএফ ড্রাইভ লিঙ্কটি পাবলিক রিড পারমিশন সহ আপডেট করে দেওয়া হয়েছে। এখন ড্যাশবোর্ড থেকে নির্বিঘ্নে ডাউনলোড করা যাবে।',
    resolved_at: '2026-10-21T17:30:00Z',
    created_at: '2026-10-21T13:00:00Z',
    updated_at: '2026-10-21T17:30:00Z'
  };
  state.tickets.push(tkt4);

  // 9. Seed Notifications
  state.notifications.push(
    {
      id: 'NTF-001',
      user_id: studentScience.id,
      title: 'টিকেট স্ট্যাটাস আপডেট: ইন প্রগ্রেস',
      message: 'আপনার টিকেট TKT-2026-101 (লাইভ ক্লাসে অডিও ও ভিডিও সিংক হচ্ছে না) সাপোর্ট স্পেশালিস্ট আনিকা রহমানের কাছে অ্যাসাইন করা হয়েছে।',
      type: 'ticket_reply',
      ticket_id: tkt1.id,
      is_read: false,
      created_at: '2026-10-18T16:00:00Z'
    },
    {
      id: 'NTF-002',
      user_id: studentHumanities.id,
      title: 'টিকেট সমাধান সম্পন্ন!',
      message: 'আপনার টিকেট TKT-2026-104 (পৌরনীতি লেকচার শিট ডাউনলোড লিংকে ৪MD পেজ ওপেন হচ্ছে না) সমাধান করা হয়েছে।',
      type: 'ticket_resolved',
      ticket_id: tkt4.id,
      is_read: true,
      created_at: '2026-10-21T17:30:00Z'
    },
    {
      id: 'NTF-003',
      user_id: captainUser.id,
      title: 'ক্যাপ্টেন এসকেলেশন গ্রহণ করা হয়েছে',
      message: 'আপনার সাবমিট করা টিকেট TKT-2026-103 জরুরি ভিত্তিতে রিভিউ করা হচ্ছে।',
      type: 'escalation',
      ticket_id: tkt3.id,
      is_read: false,
      created_at: '2026-10-20T11:50:00Z'
    }
  );

  // 10. Audit Logs
  state.audit_logs.push(
    {
      id: 'LOG-1001',
      actor_user_id: adminUser.id,
      actor_name: adminUser.full_name,
      actor_role: 'admin',
      action: 'CAPTAIN_PROMOTED',
      target_type: 'user',
      target_id: captainUser.id,
      metadata: { program: 'HSC 28', reason: 'Assigned as Science Captain' },
      timestamp: '2026-10-10T10:00:00Z'
    },
    {
      id: 'LOG-1002',
      actor_user_id: captainUser.id,
      actor_name: captainUser.full_name,
      actor_role: 'captain',
      action: 'TICKET_ESCALATED',
      target_type: 'ticket',
      target_id: tkt3.id,
      metadata: { priority: 'Urgent', affected_student_phone: studentScience.phone },
      timestamp: '2026-10-20T11:45:00Z'
    },
    {
      id: 'LOG-1003',
      actor_user_id: staffUser.id,
      actor_name: staffUser.full_name,
      actor_role: 'staff',
      action: 'STATUS_CHANGED',
      target_type: 'ticket',
      target_id: tkt4.id,
      metadata: { old_status: 'In Progress', new_status: 'Resolved' },
      timestamp: '2026-10-21T17:30:00Z'
    }
  );

  saveDBSync();
  console.log('Seeding completed successfully!');
}

// If executed directly
if (process.argv[1].endsWith('seed.js')) {
  seedDatabase(true);
}
