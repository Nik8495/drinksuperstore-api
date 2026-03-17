import { Request, Response } from 'express';
import { supabase } from '../utils/SupabaseClient.js';
import { toPublicUrls } from '../utils/media.js';

const buildProductPayload = (body: any) => {
  const payload: Record<string, any> = {};
  const assign = (key: string, value: any) => {
    if (value !== undefined) payload[key] = value;
  };

  const normalizeImageUrls = (value: any) => {
    if (value === undefined) return undefined;
    if (Array.isArray(value)) {
      return value.map((item) => (typeof item === 'string' ? item : null)).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value ? [value] : [];
    }
    return undefined;
  };

  assign('id', body.id);
  assign('name', body.name);
  assign('description', body.description);
  assign('brand_id', body.brandId ?? body.brand_id);
  assign('category_id', body.categoryId ?? body.category_id);
  assign('sub_category_id', body.subCategoryId ?? body.sub_category_id);
  assign('country_of_origin', body.countryOfOrigin ?? body.country_of_origin);
  assign('flavour', body.flavour);
  assign(
    'image_urls',
    normalizeImageUrls(
      body.imageURLs ?? body.image_urls ?? body.imageURL ?? body.image_url
    )
  );
  assign('limited_edition', body.limitedEdition ?? body.limited_edition);
  assign('is_new', body.isNew ?? body.is_new);
  assign('is_on_sale', body.isOnSale ?? body.is_on_sale);
  assign('price', body.price);
  assign('price_ex_tax', body.priceExTax ?? body.price_ex_tax);
  assign('quantity_available', body.quantityAvailable ?? body.quantity_available);
  assign('size', body.size);
  assign('strength', body.strength);

  return payload;
};

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const rawSearch = (req.query.search ?? req.query.q ?? '').toString().trim();
    const brandFilter = (req.query.brandId ?? req.query.brand ?? '').toString().trim();
    const categoryFilter = (req.query.categoryId ?? req.query.category ?? '').toString().trim();
    const page = Math.max(parseInt((req.query.page ?? '1') as string, 10) || 1, 1);
    const limit = Math.max(parseInt((req.query.limit ?? '12') as string, 10) || 12, 1);
    const shouldPaginate =
      req.query.paged === 'true' ||
      req.query.page !== undefined ||
      req.query.limit !== undefined ||
      rawSearch.length > 0;

    let brandIds: string[] = [];
    let categoryIds: string[] = [];

    if (rawSearch.length > 0) {
      const [brandResult, categoryResult] = await Promise.all([
        supabase
          .from('brands')
          .select('id')
          .ilike('brand_name', `%${rawSearch}%`),
        supabase
          .from('categories')
          .select('id')
          .ilike('categories_name', `%${rawSearch}%`),
      ]);

      if (brandResult.error) {
        throw brandResult.error;
      }
      if (categoryResult.error) {
        throw categoryResult.error;
      }

      brandIds = (brandResult.data || []).map((b: any) => b.id).filter(Boolean);
      categoryIds = (categoryResult.data || []).map((c: any) => c.id).filter(Boolean);
    }

    let query = supabase.from('products').select('*', {
      count: shouldPaginate ? 'exact' : undefined,
    });

    if (rawSearch.length > 0) {
      const filters: string[] = [`name.ilike.%${rawSearch}%`];
      filters.push(`id.ilike.%${rawSearch}%`);
      filters.push(`description.ilike.%${rawSearch}%`);
      filters.push(`size.ilike.%${rawSearch}%`);
      filters.push(`flavour.ilike.%${rawSearch}%`);
      filters.push(`country_of_origin.ilike.%${rawSearch}%`);
      filters.push(`strength.ilike.%${rawSearch}%`);
      if (brandIds.length > 0) {
        filters.push(`brand_id.in.(${brandIds.join(',')})`);
      }
      if (categoryIds.length > 0) {
        filters.push(`category_id.in.(${categoryIds.join(',')})`);
      }
      const numeric = Number(rawSearch);
      if (Number.isFinite(numeric)) {
        filters.push(`price.eq.${numeric}`);
        filters.push(`price_ex_tax.eq.${numeric}`);
        filters.push(`quantity_available.eq.${numeric}`);
      }
      query = query.or(filters.join(','));
    }

    // Apply direct brand/category filters (from query params)
    if (brandFilter) {
      query = query.eq('brand_id', brandFilter);
    }
    if (categoryFilter) {
      query = query.eq('category_id', categoryFilter);
    }

    if (shouldPaginate) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const formattedData = data.map(product => {
      const imageUrls = toPublicUrls(
        product.image_urls ?? (product.image_url ? [product.image_url] : [])
      );
      return {
      id: product.id,
      name: product.name,
      description: product.description,
      brandId: product.brand_id,
      categoryId: product.category_id,
      subCategoryId: product.sub_category_id,
      country_of_origin: product.country_of_origin,
      flavour: product.flavour,
      imageURLs: imageUrls,
      imageURL: imageUrls[0] ?? null,
      limitedEdition: product.limited_edition,
      isNew: product.is_new,
      isOnSale: product.is_on_sale,
      price: product.price,
      priceExTax: product.price_ex_tax,
      quantityAvailable: product.quantity_available,
      size: product.size,
      strength: product.strength
      };
    });

    if (shouldPaginate) {
      res.status(200).json({
        data: formattedData,
        page,
        limit,
        total: count ?? formattedData.length,
      });
      return;
    }

    res.status(200).json(formattedData);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const imageUrls = toPublicUrls(
      data.image_urls ?? (data.image_url ? [data.image_url] : [])
    );
    const formattedProduct = {
      id: data.id,
      name: data.name,
      description: data.description,
      brandId: data.brand_id,
      categoryId: data.category_id,
      subCategoryId: data.sub_category_id,
      country_of_origin: data.country_of_origin,
      flavour: data.flavour,
      imageURLs: imageUrls,
      imageURL: imageUrls[0] ?? null,
      limitedEdition: data.limited_edition,
      isNew: data.is_new,
      isOnSale: data.is_on_sale,
      price: data.price,
      priceExTax: data.price_ex_tax,
      quantityAvailable: data.quantity_available,
      size: data.size,
      strength: data.strength,
    };

    res.status(200).json(formattedProduct);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const payload = buildProductPayload(req.body || {});

    if (!payload.id || !payload.name) {
      return res.status(400).json({ message: 'Product id and name are required' });
    }

    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const payload = buildProductPayload(req.body || {});
    payload.updated_at = new Date();

    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({ message: 'Product deleted', data });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
};
