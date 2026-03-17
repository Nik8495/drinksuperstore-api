import { Request, Response } from 'express';
import { supabase } from '../utils/SupabaseClient.js';

const TABLE = 'inventory_reservations';

const tableExists = async (): Promise<boolean> => {
  const { error } = await supabase.from(TABLE).select('product_id').limit(0);
  // If the table isn't in the schema cache, Supabase returns a message containing the table name
  if (error && error.message?.includes(TABLE)) {
    return false;
  }
  return true;
};

const cleanupExpired = async () => {
  try {
    await supabase
      .from(TABLE)
      .delete()
      .lt('expires_at', new Date().toISOString());
  } catch {
    // ignore if table doesn't exist
  }
};

export const reserveStock = async (req: Request, res: Response) => {
  try {
    const { productId, userId, quantity, ttlMinutes } = req.body || {};

    if (!productId || !userId || !quantity || Number(quantity) <= 0) {
      return res.status(400).json({ message: 'productId, userId and quantity are required' });
    }

    // Check if reservation table exists; if not, skip reservation and just validate stock
    const hasTable = await tableExists();

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('quantity_available')
      .eq('id', productId)
      .single();

    if (productError) {
      return res.status(500).json({ message: 'Failed to load product', error: productError.message });
    }

    const quantityAvailable = product?.quantity_available;

    if (quantityAvailable === null || quantityAvailable === undefined) {
      return res.status(200).json({ message: 'No stock tracking for this product', reserved: false });
    }

    if (!hasTable) {
      // No reservation table — just do a simple stock check
      if (Number(quantity) > Number(quantityAvailable)) {
        return res.status(409).json({
          message: 'Insufficient stock',
          available: Number(quantityAvailable),
        });
      }
      return res.status(200).json({ message: 'Stock available (reservations disabled)', reserved: false });
    }

    await cleanupExpired();

    await supabase
      .from(TABLE)
      .delete()
      .eq('product_id', productId)
      .eq('user_id', userId);

    const { data: reservations, error: reservationsError } = await supabase
      .from(TABLE)
      .select('quantity')
      .eq('product_id', productId)
      .gt('expires_at', new Date().toISOString());

    if (reservationsError) {
      return res.status(500).json({ message: 'Failed to check reservations', error: reservationsError.message });
    }

    const reservedQty = (reservations || []).reduce(
      (sum: number, row: any) => sum + (Number(row?.quantity) || 0),
      0
    );

    const available = Number(quantityAvailable) - reservedQty;

    if (Number(quantity) > available) {
      return res.status(409).json({
        message: 'Insufficient stock to reserve',
        available,
      });
    }

    const ttl = Number(ttlMinutes) || 15;
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from(TABLE)
      .insert({
        product_id: productId,
        user_id: userId,
        quantity: Number(quantity),
        expires_at: expiresAt,
      });

    if (insertError) {
      return res.status(500).json({ message: 'Failed to reserve stock', error: insertError.message });
    }

    return res.status(200).json({ message: 'Stock reserved', expiresAt });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Failed to reserve stock',
      error: error?.message || 'Unknown error',
    });
  }
};

export const releaseStock = async (req: Request, res: Response) => {
  try {
    const { productId, userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const hasTable = await tableExists();
    if (!hasTable) {
      return res.status(200).json({ message: 'Stock released (reservations disabled)' });
    }

    await cleanupExpired();

    let query = supabase
      .from(TABLE)
      .delete()
      .eq('user_id', userId);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { error } = await query;

    if (error) {
      return res.status(500).json({ message: 'Failed to release stock', error: error.message });
    }

    return res.status(200).json({ message: 'Stock released' });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Failed to release stock',
      error: error?.message || 'Unknown error',
    });
  }
};
