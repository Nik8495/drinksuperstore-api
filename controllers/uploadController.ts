import { Request, Response } from 'express';
import { uploadFile } from '../utils/storageClient.js';

const STORAGE_BUCKET = 'media-assets';

export const uploadMedia = async (req: Request, res: Response) => {
  const file = (req as any).file as
    | { originalname?: string; mimetype?: string; buffer?: Buffer }
    | undefined;

  if (!file?.buffer) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  const folder =
    typeof (req.body as any)?.folder === 'string' && (req.body as any).folder.trim()
      ? (req.body as any).folder.trim()
      : 'misc';

  const safeName = (file.originalname || 'upload').replace(/\s+/g, '-');
  const path = `${folder}/${Date.now()}-${safeName}`;

  try {
    const result = await uploadFile(
      file.buffer,
      STORAGE_BUCKET,
      path,
      file.mimetype || undefined
    );
    return res.json({ path: result.path, publicUrl: result.publicUrl });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Upload failed.' });
  }
};
