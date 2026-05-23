import type { NextFunction, Request, Response } from "express";

export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = process.env.API_KEY;
  const header = req.headers.authorization;

  if (!expected || !header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = header.slice("Bearer ".length);
  if (token !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
