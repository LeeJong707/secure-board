import type { NextFunction, Request, Response } from "express";

export function requireLogin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ message: "로그인이 필요합니다" });
  }
  next();
}
