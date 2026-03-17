import { Router } from 'express';

const router = Router();

router.get('/public', (req, res) => {
  const supabaseUrl = process.env['SUPABASE_URL'] || '';
  const supabaseAnonKey = process.env['SUPABASE_ANON_KEY'] || '';

  res.json({ supabaseUrl, supabaseAnonKey });
});

export default router;
