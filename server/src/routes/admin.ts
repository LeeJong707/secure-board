import { Router } from "express";
import { pool } from "../db/pool.js";
import { positiveId } from "../validation.js";
import { requireAdmin } from "../requireAdmin.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get("/users", async (_req, res) => {
  const [rows] = await pool.execute("SELECT id, email, name, role FROM users");
  res.json(rows);
});

adminRouter.post("/users/:id/role", async (req, res) => {
  const id = positiveId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id must be a positive integer" });
  }

  const { role } = req.body ?? {};
  if (typeof role !== "string") {
    return res.status(400).json({ message: "role must be a string" });
  }
  if (role !== "USER" && role !== "ADMIN") {
    return res.status(400).json({ message: "role must be USER or ADMIN" });
  }

  await pool.execute("UPDATE users SET role = ? WHERE id = ?", [role, id]);
  res.json({ message: "role changed" });
});
