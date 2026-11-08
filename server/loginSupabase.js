
import bcrypt from 'bcryptjs';
import { supabase } from './supabaseClient.js';

function normalizePhone(value) {
  let phone = String(value || '').replace(/[\s-]/g, '');
  if (phone.startsWith('+880')) phone = '0' + phone.slice(4);
  else if (phone.startsWith('880')) phone = '0' + phone.slice(3);
  return phone;
}

export async function loginStudentFromSupabase(phone, password) {
  const cleanPhone = normalizePhone(phone);

  if (!cleanPhone || typeof password !== 'string') {
    throw new Error('INVALID_CREDENTIALS');
  }

  const { data: user, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('phone', cleanPhone)
    .in('role', ['student', 'captain'])
    .maybeSingle();

  if (error) {
    throw new Error('DATABASE_ERROR');
  }

  if (!user || !user.password_hash) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordMatches) {
    throw new Error('INVALID_CREDENTIALS');
  }

  if (!user.is_active) {
    throw new Error('ACCOUNT_DEACTIVATED');
  }

  const { password_hash, ...safeUser } = user;

  return {
    ...safeUser,
    name: user.full_name,
    department: user.academic_group,
    status: 'active'
  };
}
