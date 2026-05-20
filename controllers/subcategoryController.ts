import { Request, Response } from 'express';
import { supabase } from '../utils/SupabaseClient.js';
import { toPublicUrl } from '../utils/media.js';

const buildSubcategoryPayload = (body: any) => {
  const payload: Record<string, any> = {};
  const assign = (key: string, value: any) => {
    if (value !== undefined) payload[key] = value;
  };

  assign('category_id', body.categoryId ?? body.category_id);
  assign('subcategory_name', body.name ?? body.subcategoryName ?? body.subcategory_name);
  assign('image_url', body.imageURL ?? body.image_url);

  return payload;
};

const formatSubcategory = (subcategory: any, categoryName?: string) => ({
  id: subcategory.id,
  category_id: subcategory.category_id,
  categoryId: subcategory.category_id,
  categoryName: categoryName ?? subcategory.categoryName ?? null,
  subcategory_name: subcategory.subcategory_name,
  subcategoryName: subcategory.subcategory_name,
  name: subcategory.subcategory_name,
  imageURL: toPublicUrl(subcategory.image_url),
  created_at: subcategory.created_at,
});

const attachCategoryNames = async (subcategories: any[]) => {
  const categoryIds = Array.from(
    new Set(subcategories.map((item) => item.category_id).filter(Boolean))
  );

  if (categoryIds.length === 0) {
    return subcategories.map((item) => formatSubcategory(item));
  }

  const { data, error } = await supabase
    .from('categories')
    .select('id, categories_name')
    .in('id', categoryIds);

  if (error) {
    throw error;
  }

  const categoryNameById = new Map(
    (data ?? []).map((category: any) => [category.id, category.categories_name])
  );

  return subcategories.map((item) =>
    formatSubcategory(item, categoryNameById.get(item.category_id))
  );
};

export const getSubcategories = async (req: Request, res: Response) => {
  try {
    const rawSearch = (req.query.search ?? req.query.q ?? '').toString().trim();
    const categoryId = (req.query.categoryId ?? req.query.category_id ?? '').toString().trim();
    const page = Math.max(parseInt((req.query.page ?? '1') as string, 10) || 1, 1);
    const limit = Math.max(parseInt((req.query.limit ?? '10') as string, 10) || 10, 1);
    const shouldPaginate =
      req.query.paged === 'true' ||
      req.query.page !== undefined ||
      req.query.limit !== undefined ||
      rawSearch.length > 0;

    let query = supabase.from('subcategories').select('*', {
      count: shouldPaginate ? 'exact' : undefined,
    });

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    if (rawSearch.length > 0) {
      query = query.or(
        `id.ilike.%${rawSearch}%,category_id.ilike.%${rawSearch}%,subcategory_name.ilike.%${rawSearch}%`
      );
    }
    if (shouldPaginate) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const formatted = await attachCategoryNames(data ?? []);
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
    res.status(500).json({ message: 'Error fetching subcategories', error: error.message });
  }
};

export const getSubcategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('subcategories')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    const [formatted] = await attachCategoryNames([data]);
    res.status(200).json(formatted);
  } catch (error: any) {
    res.status(500).json({
      message: 'Error fetching subcategory',
      error: error.message,
    });
  }
};

export const createSubcategory = async (req: Request, res: Response) => {
  try {
    const payload = buildSubcategoryPayload(req.body || {});

    if (!payload.category_id || !payload.subcategory_name) {
      return res.status(400).json({ message: 'Category and subcategory name are required' });
    }

    const { data, error } = await supabase
      .from('subcategories')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(formatSubcategory(data));
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating subcategory', error: error.message });
  }
};

export const updateSubcategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const payload = buildSubcategoryPayload(req.body || {});

    const { data, error } = await supabase
      .from('subcategories')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    res.status(200).json(formatSubcategory(data));
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating subcategory', error: error.message });
  }
};

export const deleteSubcategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('subcategories')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    res.status(200).json({ message: 'Subcategory deleted', data: formatSubcategory(data) });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting subcategory', error: error.message });
  }
};
