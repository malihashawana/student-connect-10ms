
import bcrypt from 'bcryptjs';
import { supabase } from './supabaseClient.js';

export async function registerStudentInSupabase(input) {
  const clean = (value) =>
    typeof value === 'string' ? value.trim() : '';

  
let phone = clean(input.phone).replace(/\D/g, '');

if (phone.startsWith('880')) {
  phone = '0' + phone.slice(3);
}

if (!/^01[3-9]\d{8}$/.test(phone)) {
  throw new Error('INVALID_REGISTRATION_DATA');
}

  const password = input.password;

  if (
    !clean(input.tms_id) ||
    !phone ||
    !clean(input.program) ||
    !clean(input.full_name) ||
    !clean(input.department) ||
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
  ? (() => {
      let contact = clean(input.contact_phone).replace(/\D/g, '');
      if (contact.startsWith('880')) {
        contact = '0' + contact.slice(3);
      }
      return contact;
    })()
  : phone
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
