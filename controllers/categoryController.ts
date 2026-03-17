import { Request, Response } from 'express';
import { supabase } from '../utils/SupabaseClient.js';
import { toPublicUrl } from '../utils/media.js';

const buildCategoryPayload = (body: any) => {
  const payload: Record<string, any> = {};
  const assign = (key: string, value: any) => {
    if (value !== undefined) payload[key] = value;
  };

  assign('id', body.id);
  assign('categories_name', body.name ?? body.categoriesName ?? body.categories_name);
  assign('image_url', body.imageURL ?? body.image_url);

  return payload;
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const rawSearch = (req.query.search ?? req.query.q ?? '').toString().trim();
    const page = Math.max(parseInt((req.query.page ?? '1') as string, 10) || 1, 1);
    const limit = Math.max(parseInt((req.query.limit ?? '10') as string, 10) || 10, 1);
    const shouldPaginate =
      req.query.paged === 'true' ||
      req.query.page !== undefined ||
      req.query.limit !== undefined ||
      rawSearch.length > 0;

    let query = supabase.from('categories').select('*', {
      count: shouldPaginate ? 'exact' : undefined,
    });
    if (rawSearch.length > 0) {
      query = query.or(`id.ilike.%${rawSearch}%,categories_name.ilike.%${rawSearch}%`);
    }
    if (shouldPaginate) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const formatted = data.map((c: { id: any; categories_name: any; image_url: any; }) => ({
      id: c.id,
      categories_name: c.categories_name,
      name: c.categories_name,
      imageURL: toPublicUrl(c.image_url),
    }));
    if (shouldPaginate) {
      res.status(200).json({
        data: formatted,
        page,
        limit,
        total: count ?? formatted.length,
      });
      return;
    }
    res.status(200).json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
};

export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('categories')
      .select('id, categories_name, image_url')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const formatted = {
      id: data.id,
      categories_name: data.categories_name,
      name: data.categories_name,
      imageURL: toPublicUrl(data.image_url),
    };

    res.status(200).json(formatted);
  } catch (error: any) {
    res.status(500).json({
      message: 'Error fetching category',
      error: error.message,
    });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const payload = buildCategoryPayload(req.body || {});

    if (!payload.id || !payload.categories_name) {
      return res.status(400).json({ message: 'Category id and name are required' });
    }

    const { data, error } = await supabase
      .from('categories')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating category', error: error.message });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const payload = buildCategoryPayload(req.body || {});

    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating category', error: error.message });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.status(200).json({ message: 'Category deleted', data });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting category', error: error.message });
  }
};
