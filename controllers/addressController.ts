import { Request, Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../utils/SupabaseClient.js';

const buildAddressPayload = (body: any) => {
  const payload: Record<string, any> = {};
  const normalize = (value: any) =>
    typeof value === 'string' ? value.trim() : value;
  const assign = (key: string, value: any) => {
    if (value !== undefined) payload[key] = normalize(value);
  };

  assign('address_id', body.addressId ?? body.id);
  assign('user_id', body.userId ?? body.user_id);
  assign('full_name', body.fullName ?? body.full_name);
  assign('first_name', body.firstName ?? body.first_name);
  assign('last_name', body.lastName ?? body.last_name);
  assign('phone_number', body.phoneNumber ?? body.phone_number);
  assign('street_address', body.streetAddress ?? body.street_address);
  assign('city', body.city);
  assign('state', body.state);
  assign('postal_code', body.postalCode ?? body.postal_code);
  assign('country', body.country);
  assign('is_default', body.isDefault ?? body.is_default);

  return payload;
};

const pruneMissingColumns = (payload: Record<string, any>, message?: string) => {
  const match = message?.match(/Could not find the '(.+?)' column/);
  if (!match) {
    return { payload, removed: false };
  }
  const column = match[1];
  if (column && Object.prototype.hasOwnProperty.call(payload, column)) {
    const next = { ...payload };
    delete next[column];
    return { payload: next, removed: true };
  }
  return { payload, removed: false };
};

const insertAddressWithFallback = async (payload: Record<string, any>) => {
  let working = { ...payload };
  let attempts = 0;
  while (attempts < 5) {
    const { data, error } = await supabase
      .from('addresses')
      .insert(working)
      .select()
      .single();

    if (!error) {
      return { data, error: null };
    }

    const pruned = pruneMissingColumns(working, error.message);
    if (!pruned.removed) {
      return { data: null, error };
    }

    working = pruned.payload;
    attempts += 1;
  }

  return { data: null, error: { message: 'Failed to insert address' } as any };
};

const updateAddressWithFallback = async (id: string, payload: Record<string, any>) => {
  let working = { ...payload };
  let attempts = 0;
  while (attempts < 5) {
    const { data, error } = await supabase
      .from('addresses')
      .update(working)
      .eq('address_id', id)
      .select()
      .single();

    if (!error) {
      return { data, error: null };
    }

    const pruned = pruneMissingColumns(working, error.message);
    if (!pruned.removed) {
      return { data: null, error };
    }

    working = pruned.payload;
    attempts += 1;
  }

  return { data: null, error: { message: 'Failed to update address' } as any };
};

export const getAddressesByUserId = async (req: Request, res: Response) => {
  try {
    const userId =
      (req.params as any).userId ||
      (req.query as any).userId ||
      (req as any).user?.id;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Format to frontend model (camelCase)
    const formatted = (data ?? []).map((a: any) => ({
      id: a.address_id,
      userId: a.user_id,
      fullName: a.full_name,
      firstName: a.first_name,
      lastName: a.last_name,
      phoneNumber: a.phone_number,
      streetAddress: a.street_address,
      city: a.city,
      state: a.state,
      postalCode: a.postal_code,
      country: a.country,
      isDefault: a.is_default,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }));

    res.status(200).json(formatted);
  } catch (error: any) {
    res.status(500).json({
      message: 'Error fetching addresses',
      error: error.message,
    });
  }
};

export const createAddress = async (req: Request, res: Response) => {
  try {
    const payload = buildAddressPayload(req.body || {});

    if (!payload.user_id) {
      return res.status(400).json({ message: 'userId is required' });
    }

    if (!payload.address_id) {
      payload.address_id = crypto.randomUUID();
    }

    payload.created_at = new Date();
    payload.updated_at = new Date();

    const { data: existing, error: existingError } = await supabase
      .from('addresses')
      .select('address_id')
      .eq('user_id', payload.user_id)
      .eq('street_address', payload.street_address ?? null)
      .eq('city', payload.city ?? null)
      .eq('state', payload.state ?? null)
      .eq('postal_code', payload.postal_code ?? null)
      .eq('country', payload.country ?? null)
      .limit(1);

    if (existingError) {
      return res.status(500).json({
        message: 'Failed to validate address',
        error: existingError.message,
      });
    }

    if (existing && existing.length > 0) {
      return res.status(409).json({ message: 'Address already exists' });
    }

    const { data, error } = await insertAddressWithFallback(payload);

    if (error) throw error;
    res.status(201).json({ message: 'Address created', data });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating address', error: error.message });
  }
};

export const updateAddress = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const payload = buildAddressPayload(req.body || {});
    payload.updated_at = new Date();

    const { data, error } = await updateAddressWithFallback(id, payload);

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      return res.status(404).json({ message: 'Address not found' });
    }

    res.status(200).json({ message: 'Address updated', data });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating address', error: error.message });
  }
};

export const deleteAddress = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('addresses')
      .delete()
      .eq('address_id', id)
      .select()
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      return res.status(404).json({ message: 'Address not found' });
    }

    res.status(200).json({ message: 'Address deleted', data });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting address', error: error.message });
  }
};
