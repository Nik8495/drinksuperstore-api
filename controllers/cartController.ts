import { Request, Response } from 'express';
import { supabase } from '../utils/SupabaseClient.js';
import { safeError } from '../utils/errorHandler.js';

const buildCartPayload = (body: any) => {
  const payload: Record<string, any> = {};
  const assign = (key: string, value: any) => {
    if (value !== undefined) payload[key] = value;
  };

  const userId = body.userId ?? body.user_id ?? body.id;
  assign('id', body.id ?? userId);
  assign('user_id', userId);
  assign('items', body.items);
  assign('total_amount', body.totalAmount ?? body.total_amount);
  assign('total_quantity', body.totalQuantity ?? body.total_quantity);

  return payload;
};

export const updateCart = async (req: Request, res: Response) => {
  const { items, totalAmount, totalQuantity } = req.body;
  const userId = req.body.userId ?? req.params.userId;

  try {
    const { data, error } = await supabase
      .from('carts')
      .upsert({ 
        id: userId,
        user_id: userId,
        items: items,
        total_amount: totalAmount,
        total_quantity: totalQuantity,
        updated_at: new Date()
      });

    if (error) throw error;
    res.status(200).json({ message: 'Cart updated successfully', data });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating cart', error: safeError(error) });
  }
};

export const getCart = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const { data, error } = await supabase
      .from('carts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.status(200).json(data || { items: [] });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching cart', error: safeError(error) });
  }
};

export const createCart = async (req: Request, res: Response) => {
  try {
    const payload = buildCartPayload(req.body || {});

    if (!payload.user_id) {
      return res.status(400).json({ message: 'userId is required' });
    }

    payload.created_at = new Date();
    payload.updated_at = new Date();

    const { data, error } = await supabase
      .from('carts')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Cart created', data });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating cart', error: safeError(error) });
  }
};

export const deleteCart = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const { data, error } = await supabase
      .from('carts')
      .delete()
      .eq('user_id', userId)
      .select()
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    res.status(200).json({ message: 'Cart deleted', data });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting cart', error: safeError(error) });
  }
};
