
import bcrypt from 'bcryptjs';
import { supabase } from './supabaseClient.js';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePhone(value) {
  let phone = String(value || '').replace(/\D/g, '');

  if (phone.startsWith('880')) {
    phone = '0' + phone.slice(3);
  }

  return phone;
}

export async function registerByPhoneInSupabase(input) {
  const fullName = clean(input?.full_name);
  const phone = normalizePhone(input?.phone);
  const password = input?.password;

  if (
    fullName.length < 2 ||
    fullName.length > 200 ||
    !/^01[3-9]\d{8}$/.test(phone) ||
    typeof password !== 'string' ||
    password.length < 8 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    throw new Error('INVALID_REGISTRATION_DATA');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase.rpc(
    'register_by_phone_atomic',
    {
      p_full_name: fullName,
      p_phone: phone,
      p_password_hash: passwordHash
    }
  );

  if (error) {
    const knownErrors = [
      'INVALID_REGISTRATION_DATA',
      'PHONE_ALREADY_REGISTERED',
      'PHONE_NOT_APPROVED',
      'MULTIPLE_STUDENT_PROGRAMS'
    ];

    const matchedError = knownErrors.find(code =>
      error.message?.includes(code)
    );

    if (matchedError) {
      throw new Error(matchedError);
    }

    console.error('Registration RPC error:', error.message);
    throw new Error('REGISTRATION_DATABASE_ERROR');
  }

  if (!data?.user?.id) {
    throw new Error('REGISTRATION_DATABASE_ERROR');
  }

  return {
    user: data.user,
    captain_assignment: data.captain_assignment || null
  };
}

// Legacy registration kept for existing backend compatibility.
export async function registerStudentInSupabase(input) {
  const phone = normalizePhone(input?.phone);
  const password = input?.password;

  if (
    !clean(input?.tms_id) ||
    !/^01[3-9]\d{8}$/.test(phone) ||
    !clean(input?.program) ||
    !clean(input?.full_name) ||
    !clean(input?.department) ||
    typeof password !== 'string' ||
    password.length < 6
  ) {
    throw new Error('INVALID_REGISTRATION_DATA');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase.rpc(
    'claim_roster_and_register',
    {
      p_tms_id: clean(input.tms_id),
      p_phone: phone,
      p_program: clean(input.program),
      p_password_hash: passwordHash,
      p_full_name: clean(input.full_name),
      p_department: clean(input.department),
      p_email: clean(input.email),
      p_college: clean(input.college),
      p_district: clean(input.district),
      p_class_level: clean(input.class_level),
      p_academic_year: clean(input.academic_year),
      p_address: clean(input.address),
      p_contact_phone: input.contact_phone
        ? normalizePhone(input.contact_phone)
        : phone
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
