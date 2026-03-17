import { Request, Response } from 'express';
import { supabase } from '../utils/SupabaseClient.js';
import { toPublicUrl } from '../utils/media.js';

const buildBrandPayload = (body: any) => {
  const payload: Record<string, any> = {};
  const assign = (key: string, value: any) => {
    if (value !== undefined) payload[key] = value;
  };

  assign('id', body.id);
  assign('brand_name', body.brandName ?? body.brand_name ?? body.name);
  assign('logo_url', body.logoURL ?? body.logo_url ?? body.imageURL ?? body.image_url);

  return payload;
};

export const getBrands = async (req: Request, res: Response) => {
  try {
    const rawSearch = (req.query.search ?? req.query.q ?? '').toString().trim();
    const page = Math.max(parseInt((req.query.page ?? '1') as string, 10) || 1, 1);
    const limit = Math.max(parseInt((req.query.limit ?? '10') as string, 10) || 10, 1);
    const shouldPaginate =
      req.query.paged === 'true' ||
      req.query.page !== undefined ||
      req.query.limit !== undefined ||
      rawSearch.length > 0;

    let query = supabase.from('brands').select('*', {
      count: shouldPaginate ? 'exact' : undefined,
    });
    if (rawSearch.length > 0) {
      query = query.or(`id.ilike.%${rawSearch}%,brand_name.ilike.%${rawSearch}%`);
    }
    if (shouldPaginate) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    const formatted = (data ?? []).map((b: any) => ({
      id: b.id,
      brand_name: b.brand_name,
      name: b.brand_name,
      brandName: b.brand_name,
      logoURL: toPublicUrl(b.logo_url),
      imageURL: toPublicUrl(b.logo_url),
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
    res.status(500).json({ message: 'Error fetching brands', error: error.message });
  }
};

export const getBrandById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    res.status(200).json({
      id: data.id,
      brand_name: data.brand_name,
      name: data.brand_name,
      brandName: data.brand_name,
      logoURL: toPublicUrl(data.logo_url),
      imageURL: toPublicUrl(data.logo_url),
    });
  } catch (error: any) {
    res.status(500).json({
      message: 'Error fetching brand',
      error: error.message,
    });
  }
};

export const createBrand = async (req: Request, res: Response) => {
  try {
    const payload = buildBrandPayload(req.body || {});

    if (!payload.id || !payload.brand_name) {
      return res.status(400).json({ message: 'Brand id and name are required' });
    }

    const { data, error } = await supabase
      .from('brands')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating brand', error: error.message });
  }
};

export const updateBrand = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const payload = buildBrandPayload(req.body || {});

    const { data, error } = await supabase
      .from('brands')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating brand', error: error.message });
  }
};

export const deleteBrand = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('brands')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    res.status(200).json({ message: 'Brand deleted', data });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting brand', error: error.message });
  }
};
