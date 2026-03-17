import { Request, Response } from 'express';
import { supabase } from '../utils/SupabaseClient.js';

const buildOrderPayload = (body: any) => {
  const payload: Record<string, any> = {};
  const assign = (key: string, value: any) => {
    if (value !== undefined) payload[key] = value;
  };

  assign('user_id', body.userId ?? body.user_id);
  assign('user_email', body.userEmail ?? body.user_email);
  assign('user_name', body.userName ?? body.user_name);
  assign('payment_intent_id', body.paymentIntentId ?? body.payment_intent_id);
  assign('payment_session_id', body.paymentSessionId ?? body.payment_session_id);
  assign('payment_status', body.paymentStatus ?? body.payment_status);
  assign('status', body.status);
  assign('order_status', body.orderStatus ?? body.order_status);
  assign('currency', body.currency);
  assign('amount', body.amount);
  assign('subtotal', body.subtotal);
  assign('total_cost', body.totalCost ?? body.total_cost);
  assign('shipping_cost', body.shippingCost ?? body.shipping_cost);
  assign('shipping_address', body.shippingAddress ?? body.shipping_address);
  assign('billing_address', body.billingAddress ?? body.billing_address);
  assign('shipping_method', body.shippingMethod ?? body.shipping_method);
  assign('shipping_method_name', body.shippingMethodName ?? body.shipping_method_name);
  assign('cardholder_name', body.cardholderName ?? body.cardholder_name);
  assign('accept_offers', body.acceptOffers ?? body.accept_offers);
  assign('items', body.items);
  assign('order_date', body.orderDate ?? body.order_date);

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

const insertOrderWithFallback = async (payload: Record<string, any>) => {
  let working = { ...payload };
  let attempts = 0;
  while (attempts < 5) {
    const { data, error } = await supabase
      .from('orders')
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

  return { data: null, error: { message: 'Failed to insert order' } as any };
};

const updateOrderWithFallback = async (id: string, payload: Record<string, any>) => {
  let working = { ...payload };
  let attempts = 0;
  while (attempts < 5) {
    const { data, error } = await supabase
      .from('orders')
      .update(working)
      .eq('id', id)
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

  return { data: null, error: { message: 'Failed to update order' } as any };
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const payload = buildOrderPayload(req.body || {});

    if (!payload.user_id) {
      return res.status(400).json({ message: 'userId is required' });
    }

    if (!payload.status) payload.status = 'succeeded';
    if (!payload.order_status) payload.order_status = 'confirmed';

    const { data, error } = await insertOrderWithFallback(payload);

    if (error) throw error;

    // Link payment record to this order when available
    if (payload.payment_session_id) {
      const { error: paymentUpdateError } = await supabase
        .from('payments')
        .update({
          order_id: data.id,
          user_id: payload.user_id,
        })
        .eq('session_id', payload.payment_session_id);

      if (paymentUpdateError) {
        console.warn('Failed to link payment to order:', paymentUpdateError.message);
      }
    }

    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ message: 'Order failed', error: error.message });
  }
};

export const getUserOrders = async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateOrder = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const payload = buildOrderPayload(req.body || {});

    const { data, error } = await updateOrderWithFallback(id, payload);

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating order', error: error.message });
  }
};

export const deleteOrder = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json({ message: 'Order deleted', data });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting order', error: error.message });
  }
};
