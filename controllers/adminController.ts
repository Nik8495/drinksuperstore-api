import { Request, Response } from 'express';
import { supabase } from '../utils/SupabaseClient.js';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const rawSearch = (req.query.search ?? req.query.q ?? '').toString().trim();
    const page = Math.max(parseInt((req.query.page ?? '1') as string, 10) || 1, 1);
    const limit = Math.max(parseInt((req.query.limit ?? '10') as string, 10) || 10, 1);
    const shouldPaginate =
      req.query.paged === 'true' ||
      req.query.page !== undefined ||
      req.query.limit !== undefined ||
      rawSearch.length > 0;

    let query = supabase
      .from('users')
      .select('uid, email, first_name, last_name, role, created_at', {
        count: shouldPaginate ? 'exact' : undefined,
      })
      .order('created_at', { ascending: false });

    if (rawSearch.length > 0) {
      const filters = [
        `uid.ilike.%${rawSearch}%`,
        `email.ilike.%${rawSearch}%`,
        `first_name.ilike.%${rawSearch}%`,
        `last_name.ilike.%${rawSearch}%`,
        `role.ilike.%${rawSearch}%`,
      ];
      query = query.or(filters.join(','));
    }

    if (shouldPaginate) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({ message: 'Failed to fetch users', error: error.message });
    }

    if (shouldPaginate) {
      return res.status(200).json({
        data: data || [],
        page,
        limit,
        total: count ?? (data || []).length,
      });
    }

    return res.status(200).json(data || []);
  } catch (error: any) {
    return res.status(500).json({
      message: 'Failed to fetch users',
      error: error?.message || 'Unknown error',
    });
  }
};

export const deleteUserById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: 'User id is required' });
  }

  try {
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('uid', id);

    if (authError && profileError) {
      return res.status(500).json({
        message: 'Failed to delete user',
        error: authError.message || profileError.message,
      });
    }

    return res.status(200).json({ message: 'User deleted' });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Failed to delete user',
      error: error?.message || 'Unknown error',
    });
  }
};

const normalizeDateFilter = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const text = String(value).trim();
  if (!text || text === 'undefined' || text === 'null') return undefined;
  return text;
};

export const getAllOrders = async (req: Request, res: Response) => {
  const from = normalizeDateFilter(req.query.from);
  const to = normalizeDateFilter(req.query.to);

  try {
    const rawSearch = (req.query.search ?? req.query.q ?? '').toString().trim();
    const page = Math.max(parseInt((req.query.page ?? '1') as string, 10) || 1, 1);
    const limit = Math.max(parseInt((req.query.limit ?? '10') as string, 10) || 10, 1);
    const shouldPaginate =
      req.query.paged === 'true' ||
      req.query.page !== undefined ||
      req.query.limit !== undefined ||
      rawSearch.length > 0;

    let query = supabase.from('orders').select('*', {
      count: shouldPaginate ? 'exact' : undefined,
    }).order('order_date', {
      ascending: false,
    });

    if (from) {
      query = query.gte('order_date', from);
    }
    if (to) {
      query = query.lte('order_date', to);
    }

    if (rawSearch.length > 0) {
      const filters: string[] = [
        `user_id.ilike.%${rawSearch}%`,
        `user_email.ilike.%${rawSearch}%`,
        `user_name.ilike.%${rawSearch}%`,
        `status.ilike.%${rawSearch}%`,
        `order_status.ilike.%${rawSearch}%`,
        `payment_status.ilike.%${rawSearch}%`,
        `payment_intent_id.ilike.%${rawSearch}%`,
        `shipping_method.ilike.%${rawSearch}%`,
        `shipping_method_name.ilike.%${rawSearch}%`,
        `shipping_address.ilike.%${rawSearch}%`,
        `billing_address.ilike.%${rawSearch}%`,
      ];
      const numeric = Number(rawSearch);
      if (Number.isFinite(numeric)) {
        filters.push(`id.eq.${numeric}`);
        filters.push(`amount.eq.${numeric}`);
        filters.push(`total_cost.eq.${numeric}`);
        filters.push(`subtotal.eq.${numeric}`);
      }
      query = query.or(filters.join(','));
    }

    if (shouldPaginate) {
      const fromIdx = (page - 1) * limit;
      const toIdx = fromIdx + limit - 1;
      query = query.range(fromIdx, toIdx);
    }

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
    }

    if (shouldPaginate) {
      return res.status(200).json({
        data: data || [],
        page,
        limit,
        total: count ?? (data || []).length,
      });
    }

    return res.status(200).json(data || []);
  } catch (error: any) {
    return res.status(500).json({
      message: 'Failed to fetch orders',
      error: error?.message || 'Unknown error',
    });
  }
};

export const getAllPayments = async (req: Request, res: Response) => {
  try {
    const rawSearch = (req.query.search ?? req.query.q ?? '').toString().trim();
    const page = Math.max(parseInt((req.query.page ?? '1') as string, 10) || 1, 1);
    const limit = Math.max(parseInt((req.query.limit ?? '10') as string, 10) || 10, 1);
    const shouldPaginate =
      req.query.paged === 'true' ||
      req.query.page !== undefined ||
      req.query.limit !== undefined ||
      rawSearch.length > 0;

    let userIds: string[] = [];
    if (rawSearch.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('uid')
        .or(`first_name.ilike.%${rawSearch}%,last_name.ilike.%${rawSearch}%`);
      if (usersError) {
        return res.status(500).json({ message: 'Failed to search users', error: usersError.message });
      }
      userIds = (usersData || []).map((u: any) => u.uid).filter(Boolean);
    }

    let query = supabase
      .from('payments')
      .select('id, user_id, order_id, amount_total, currency, status, payment_status, created_at, users:users(first_name,last_name)', {
        count: shouldPaginate ? 'exact' : undefined,
      })
      .order('created_at', { ascending: false });

    if (rawSearch.length > 0) {
      const filters: string[] = [
        `user_id.ilike.%${rawSearch}%`,
        `session_id.ilike.%${rawSearch}%`,
        `payment_intent_id.ilike.%${rawSearch}%`,
        `status.ilike.%${rawSearch}%`,
        `payment_status.ilike.%${rawSearch}%`,
        `customer_email.ilike.%${rawSearch}%`,
      ];
      if (userIds.length > 0) {
        filters.push(`user_id.in.(${userIds.join(',')})`);
      }
      const numeric = Number(rawSearch);
      if (Number.isFinite(numeric)) {
        filters.push(`order_id.eq.${numeric}`);
        filters.push(`amount_total.eq.${numeric}`);
      }
      query = query.or(filters.join(','));
    }

    if (shouldPaginate) {
      const fromIdx = (page - 1) * limit;
      const toIdx = fromIdx + limit - 1;
      query = query.range(fromIdx, toIdx);
    }

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({ message: 'Failed to fetch payments', error: error.message });
    }

    if (shouldPaginate) {
      return res.status(200).json({
        data: data || [],
        page,
        limit,
        total: count ?? (data || []).length,
      });
    }

    return res.status(200).json(data || []);
  } catch (error: any) {
    return res.status(500).json({
      message: 'Failed to fetch payments',
      error: error?.message || 'Unknown error',
    });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (error) throw error;

    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({
      message: 'Failed to fetch order',
      error: error?.message || 'Unknown error',
    });
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  const from = normalizeDateFilter(req.query.from);
  const to = normalizeDateFilter(req.query.to);

  try {
    const usersQuery = supabase
      .from('users')
      .select('uid', { count: 'exact', head: true });
    const productsQuery = supabase
      .from('products')
      .select('id', { count: 'exact', head: true });

    let ordersQuery = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true });
    let ordersTotalQuery = supabase
      .from('orders')
      .select('total_cost');

    if (from) {
      ordersQuery = ordersQuery.gte('order_date', from);
      ordersTotalQuery = ordersTotalQuery.gte('order_date', from);
    }
    if (to) {
      ordersQuery = ordersQuery.lte('order_date', to);
      ordersTotalQuery = ordersTotalQuery.lte('order_date', to);
    }

    const [
      { count: userCount },
      { count: productCount },
      { count: orderCount },
      { data: orderTotals, error: totalsError },
    ] = await Promise.all([usersQuery, productsQuery, ordersQuery, ordersTotalQuery]);

    if (totalsError) {
      throw totalsError;
    }

    const totalSales = (orderTotals || []).reduce(
      (sum: number, row: any) => sum + (Number(row?.total_cost) || 0),
      0
    );

    return res.status(200).json({
      users: userCount || 0,
      products: productCount || 0,
      orders: orderCount || 0,
      totalSales,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Failed to fetch dashboard stats',
      error: error?.message || 'Unknown error',
    });
  }
};
