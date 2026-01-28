import { supabase } from '@/lib/createSupabaseClient';

export const signInWithGoogle = async (): Promise<void> => {
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;

  if (!redirectTo) {
    throw new Error('Unable to determine redirect URL for Google sign-in');
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });

  if (error) {
    throw error;
  }

  if (data?.url) {
    window.location.href = data.url;
  }
};

export const exchangeCodeForSession = async (code: string) => {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    throw error;
  }

  return data.session;
};

export const signInWithPassword = async (email: string, password: string, captchaToken: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken },
  });
  if (error) throw error;
  return data.session;
};

export const signUpWithPassword = async (email: string, password: string, captchaToken: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { captchaToken },
  });
  if (error) throw error;
  return data;
};

export const signInWithOtp = async (email: string, captchaToken: string) => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      captchaToken,
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
};

export const verifyOtp = async (email: string, token: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (error) throw error;
  return data.session;
};

export const resetPassword = async (email: string, captchaToken: string) => {
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined;

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
    captchaToken,
  });

  if (error) {
    throw error;
  }

  return data;
};

export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
  return data;
};
