
import { supabase } from './supabaseClient.js';

async function testConnection() {
  const { data, error } = await supabase
    .from('app_users')
    .select('id')
    .limit(1);

  if (error) {
    console.error('Supabase connection failed:', error.message);
    process.exitCode = 1;
    return;
  }

  console.log('Supabase connection successful!');
  console.log('Query result:', data);
}

testConnection();
