import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from '../db';

// Create a Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Authentication functions
export async function signUp(email: string, password: string, username: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
    },
  });
  
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Session handling
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Middleware to protect routes
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    return false;
  }
  return true;
} 