import { Request, Response, NextFunction } from 'express';

/**
 * Ensures the :userId param (or query) matches the authenticated user.
 * Must be used AFTER the `protect` middleware.
 */
export const requireOwnership = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authUser = (req as any).user;
  if (!authUser?.id) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const requestedUserId =
    (req.params as any).userId ||
    (req.query as any).userId ||
    req.body?.userId ||
    req.body?.user_id;

  if (requestedUserId && requestedUserId !== authUser.id) {
    return res.status(403).json({ message: 'Access denied' });
  }

  next();
};
