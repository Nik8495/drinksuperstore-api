import { Request, Response } from 'express';
import crypto from 'crypto';
import { supabase, supabaseAnon } from '../utils/SupabaseClient.js';

type SignupBody = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
};

type LoginBody = {
  email?: string;
  password?: string;
};

type GuestSignupBody = {
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
};

type PasswordResetBody = {
  email?: string;
  redirectTo?: string;
};

type PasswordUpdateBody = {
  newPassword?: string;
};

type ExchangeCodeBody = {
  code?: string;
};

const findAuthUserByEmail = async (email: string) => {
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      return { user: null, error };
    }

    const users = data?.users || [];
    const match = users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (match) {
      return { user: match, error: null };
    }

    if (users.length < perPage) {
      return { user: null, error: null };
    }

    page += 1;
  }
};

export const signUp = async (req: Request, res: Response) => {
  const { email, password, firstName, lastName }: SignupBody = req.body || {};

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  try {
    const { data: adminData, error: adminError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
        },
      });

    if (adminError || !adminData.user) {
      return res.status(400).json({
        message: 'Unable to create auth user',
        error: adminError?.message,
      });
    }

    const profilePayload = {
      uid: adminData.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
    };

    const { error: profileError } = await supabase
      .from('users')
      .upsert(profilePayload, { onConflict: 'uid' });

    if (profileError) {
      return res.status(500).json({
        message: 'Auth user created, but profile insert failed',
        error: profileError.message,
      });
    }

    // Sign in immediately to return session tokens
    const { data: sessionData, error: signInError } =
      await supabaseAnon.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError || !sessionData.session || !sessionData.user) {
      return res.status(401).json({
        message: 'User created, but sign-in failed',
        error: signInError?.message,
      });
    }

    let profile = { ...profilePayload, role: 'customer' } as any;
    const { data: loadedProfile, error: profileLoadError } = await supabase
      .from('users')
      .select('*')
      .eq('uid', adminData.user.id)
      .single();
    if (!profileLoadError && loadedProfile) {
      profile = loadedProfile;
    }

    return res.status(201).json({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      user: sessionData.user,
      profile,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Signup failed',
      error: error?.message || 'Unknown error',
    });
  }
};

export const createGuestUser = async (req: Request, res: Response) => {
  const { email, firstName, lastName, phoneNumber }: GuestSignupBody =
    req.body || {};

  if (!email || !firstName || !lastName) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  try {
    const { data: existing, error: existingError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      return res.status(500).json({
        message: 'Failed to check existing user',
        error: existingError.message,
      });
    }

    if (existing) {
      if (phoneNumber) {
        await supabase
          .from('users')
          .update({ phone_number: phoneNumber })
          .eq('uid', existing.uid);
      }

      return res.status(200).json({
        uid: existing.uid,
        email: existing.email,
        firstName: existing.first_name,
        lastName: existing.last_name,
        phoneNumber: existing.phone_number ?? null,
        createdAt: existing.created_at,
        role: existing.role ?? 'customer',
      });
    }

    const uid = crypto.randomUUID();
    const payload: Record<string, any> = {
      uid,
      email,
      first_name: firstName,
      last_name: lastName,
      created_at: new Date(),
    };
    const { data, error } = await supabase
      .from('users')
      .insert(payload)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        message: 'Failed to create guest user',
        error: error.message,
      });
    }

    return res.status(201).json({
      uid: data.uid,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      phoneNumber: data.phone_number ?? null,
      createdAt: data.created_at,
      role: data.role ?? 'customer',
    });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Failed to create guest user',
      error: error?.message || 'Unknown error',
    });
  }
};

export const signIn = async (req: Request, res: Response) => {
  const { email, password }: LoginBody = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const { data: sessionData, error } =
      await supabaseAnon.auth.signInWithPassword({
        email,
        password,
      });

    if (error || !sessionData.session || !sessionData.user) {
      return res.status(401).json({
        message: 'Invalid credentials',
        error: error?.message,
      });
    }

    const userId = sessionData.user.id;
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('uid', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      return res.status(500).json({
        message: 'Failed to load user profile',
        error: profileError.message,
      });
    }

    return res.status(200).json({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      user: sessionData.user,
      profile: profile || null,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Login failed',
      error: error?.message || 'Unknown error',
    });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('uid', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({
        message: 'Failed to load user profile',
        error: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      uid: data.uid,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      phoneNumber: data.phone_number ?? null,
      createdAt: data.created_at,
      role: data.role ?? null,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Failed to load user profile',
      error: error?.message || 'Unknown error',
    });
  }
};

export const updateUserDetails = async (req: Request, res: Response) => {
  const { id } = req.params;
  const authUserId = (req as any).user?.id;

  if (!authUserId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (authUserId !== id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { firstName, lastName, phoneNumber } = req.body || {};

  try {
    const payload: Record<string, any> = {};
    if (firstName !== undefined) payload.first_name = firstName;
    if (lastName !== undefined) payload.last_name = lastName;
    if (phoneNumber !== undefined) payload.phone_number = phoneNumber;

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('uid', id)
      .select()
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({
        message: 'Failed to update user profile',
        error: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      uid: data.uid,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      phoneNumber: data.phone_number ?? null,
      createdAt: data.created_at,
      role: data.role ?? null,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Failed to update user profile',
      error: error?.message || 'Unknown error',
    });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  const { email, redirectTo }: PasswordResetBody = req.body || {};

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('uid,email,first_name,last_name')
      .ilike('email', normalizedEmail)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      return res.status(500).json({
        message: 'Failed to verify user email',
        error: profileError.message,
      });
    }

    if (!profile) {
      return res.status(404).json({
        message: 'No account found with that email address.',
      });
    }

    const { user: existingAuthUser, error: authUserError } =
      await findAuthUserByEmail(normalizedEmail);

    if (authUserError) {
      return res.status(500).json({
        message: 'Failed to verify authentication user',
        error: authUserError.message,
      });
    }

    let authUserId = existingAuthUser?.id;

    if (!authUserId) {
      const tempPassword = `Tmp!${crypto
        .randomBytes(24)
        .toString('base64url')}A1`;

      const { data: createdUser, error: createError } =
        await supabase.auth.admin.createUser({
          email: normalizedEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name: profile.first_name,
            last_name: profile.last_name,
          },
        });

      if (createError || !createdUser?.user) {
        const { error: resetError } =
          await supabaseAnon.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo:
              redirectTo ||
              process.env['SUPABASE_PASSWORD_RESET_REDIRECT'] ||
              undefined,
          });

        if (!resetError) {
          return res.status(200).json({ message: 'Password reset email sent' });
        }

        return res.status(500).json({
          message: 'Failed to provision auth user for password reset',
          error: createError?.message || resetError.message,
        });
      }

      authUserId = createdUser.user.id;
    }

    if (authUserId && profile.uid !== authUserId) {
      const oldUid = profile.uid;

      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ uid: authUserId })
        .eq('uid', oldUid);

      if (userUpdateError) {
        return res.status(500).json({
          message: 'Failed to sync user profile for password reset',
          error: userUpdateError.message,
        });
      }

      const { error: ordersError } = await supabase
        .from('orders')
        .update({ user_id: authUserId })
        .eq('user_id', oldUid);

      if (ordersError) {
        return res.status(500).json({
          message: 'Failed to sync order history for password reset',
          error: ordersError.message,
        });
      }

      const { error: addressesError } = await supabase
        .from('addresses')
        .update({ user_id: authUserId })
        .eq('user_id', oldUid);

      if (addressesError) {
        return res.status(500).json({
          message: 'Failed to sync addresses for password reset',
          error: addressesError.message,
        });
      }

      const { error: cartsError } = await supabase
        .from('carts')
        .update({ user_id: authUserId, id: authUserId })
        .or(`user_id.eq.${oldUid},id.eq.${oldUid}`);

      if (cartsError) {
        return res.status(500).json({
          message: 'Failed to sync cart for password reset',
          error: cartsError.message,
        });
      }

      const { error: paymentsError } = await supabase
        .from('payments')
        .update({ user_id: authUserId })
        .eq('user_id', oldUid);

      if (paymentsError) {
        return res.status(500).json({
          message: 'Failed to sync payments for password reset',
          error: paymentsError.message,
        });
      }
    }

    const { error } = await supabaseAnon.auth.resetPasswordForEmail(
      normalizedEmail,
      {
      redirectTo:
        redirectTo || process.env['SUPABASE_PASSWORD_RESET_REDIRECT'] || undefined,
      }
    );

    if (error) {
      return res.status(400).json({
        message: 'Failed to send password reset email',
        error: error.message,
      });
    }

    return res.status(200).json({ message: 'Password reset email sent' });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Failed to send password reset email',
      error: error?.message || 'Unknown error',
    });
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  const { newPassword }: PasswordUpdateBody = req.body || {};
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!newPassword) {
    return res.status(400).json({ message: 'newPassword is required.' });
  }

  try {
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error || !data?.user) {
      return res.status(400).json({
        message: 'Failed to update password',
        error: error?.message,
      });
    }

    return res.status(200).json({ message: 'Password updated' });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Failed to update password',
      error: error?.message || 'Unknown error',
    });
  }
};

export const refreshSession = async (req: Request, res: Response) => {
  const { refresh_token } = req.body || {};

  if (!refresh_token) {
    return res.status(400).json({ message: 'refresh_token is required.' });
  }

  try {
    const { data, error } = await supabaseAnon.auth.refreshSession({
      refresh_token,
    });

    if (error || !data?.session) {
      return res.status(401).json({
        message: 'Failed to refresh session',
        error: error?.message,
      });
    }

    return res.status(200).json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Failed to refresh session',
      error: error?.message || 'Unknown error',
    });
  }
};

export const exchangeAuthCodeForSession = async (req: Request, res: Response) => {
  const { code }: ExchangeCodeBody = req.body || {};

  if (!code) {
    return res.status(400).json({ message: 'code is required.' });
  }

  try {
    const { data, error } = await supabaseAnon.auth.exchangeCodeForSession(code);

    if (error || !data?.session?.access_token) {
      return res.status(400).json({
        message: 'Failed to exchange code for session',
        error: error?.message,
      });
    }

    return res.status(200).json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Failed to exchange code for session',
      error: error?.message || 'Unknown error',
    });
  }
};
