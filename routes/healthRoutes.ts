import { Router } from 'express';
import supabase from '../utils/SupabaseClient.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const { count, error } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true });

    if (error) {
      res.status(500).json({ status: 'error', message: error.message });
      return;
    }

    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Health check failed' });
  }
});

export default router;
