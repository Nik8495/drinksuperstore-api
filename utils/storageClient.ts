import { supabase } from './SupabaseClient.js';

export const uploadFile = async (
  file: any,
  bucket: string,
  path: string,
  contentType?: string
) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType });

  if (error) throw error;

  // Get the public URL to save in the DB
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return { path: data.path, publicUrl };
};
