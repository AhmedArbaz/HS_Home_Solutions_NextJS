'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function accountSignOut() {
  await createClient().auth.signOut();
  redirect('/');
}
