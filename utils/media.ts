import { supabase } from './SupabaseClient.js';

const STORAGE_BUCKET = 'media-assets';

const isAbsoluteUrl = (value: string) =>
  /^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:');

export const toPublicUrl = (value?: string | null) => {
  if (!value) return null;
  if (isAbsoluteUrl(value)) return value;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(value);
  return data?.publicUrl || value;
};

export const toPublicUrls = (values?: Array<string | null> | null) => {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => (value ? toPublicUrl(value) : null))
    .filter((value): value is string => !!value);
};
