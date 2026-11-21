import type { NextFunction, Request, Response } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ message: "로그인이 필요합니다" });
  }
  if (user.role !== "ADMIN") {
    return res.status(403).json({ message: "관리자만 사용할 수 있습니다" });
  }
  next();
}
