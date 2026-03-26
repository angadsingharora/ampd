import { supabase } from '../lib/supabase';

export function isEduEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith('.edu');
}

export async function signUp(
  email: string,
  password: string,
  username: string,
): Promise<{ needsVerification: boolean }> {
  const trimmedEmail = email.trim().toLowerCase();

  if (!isEduEmail(trimmedEmail)) {
    throw new Error('Only .edu email addresses are allowed.');
  }

  if (username.length < 3 || username.length > 20) {
    throw new Error('Username must be 3–20 characters.');
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new Error('Username can only contain letters, numbers, and underscores.');
  }

  const { error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: { username },
    },
  });

  if (error) throw error;

  return { needsVerification: true };
}

export async function signIn(
  email: string,
  password: string,
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    if (error.message.includes('Email not confirmed')) {
      throw new Error('Please verify your email before signing in.');
    }
    throw error;
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
  });
  if (error) throw error;
}
