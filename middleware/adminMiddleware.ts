import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/SupabaseClient.js';

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('uid', userId)
      .single();

    if (error || !data) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (data.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  } catch {
    return res.status(403).json({ message: 'Admin access required' });
  }
};
