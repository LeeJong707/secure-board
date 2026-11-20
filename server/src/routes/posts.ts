import { Router } from "express";
import { pool } from "../db/pool.js";
import { positiveId } from "../validation.js";
import { requireLogin } from "../requireLogin.js";

export const postRouter = Router();

postRouter.get("/", async (req, res) => {
  const rawQ = req.query.q;

  if (rawQ !== undefined && typeof rawQ !== "string") {
    return res.status(400).json({ message: "q must be a string" });
  }

  const q = rawQ ?? "";
  if (q.length > 50) {
    return res.status(400).json({ message: "q must be 50 characters or fewer" });
  }

  const [rows] = await pool.execute(
    `SELECT p.id, p.user_id, p.title, p.content, p.created_at, u.name AS authorName
     FROM posts p JOIN users u ON p.user_id=u.id
     WHERE p.title LIKE ?
     ORDER BY p.id DESC`,
    [`%${q}%`]
  );
  res.json(rows);
});

postRouter.get("/:id", async (req, res) => {
  const id = positiveId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id must be a positive integer" });
  }

  const [rows]: any = await pool.execute(
    `SELECT p.*, u.name AS authorName
     FROM posts p JOIN users u ON p.user_id=u.id
     WHERE p.id = ?`,
    [id]
  );
  if (rows.length === 0) return res.status(404).json({ message: "not found" });

  const [attachments] = await pool.execute(
    "SELECT id, original_name, stored_name, size FROM attachments WHERE post_id = ?",
    [id]
  );
  res.json({ ...rows[0], attachments });
});

postRouter.post("/", requireLogin, async (req, res) => {
  const actor = req.session.user!;
const { title, content } = req.body ?? {};

  if (typeof title !== "string" || typeof content !== "string") {
    return res.status(400).json({ message: "title and content must be strings" });
  }
  if (title.length < 1 || title.length > 100 || content.length < 1 || content.length > 5000) {
    return res.status(400).json({ message: "title must be 1-100 characters and content 1-5000" });
  }


  const [result]: any = await pool.execute(
    "INSERT INTO posts(user_id, title, content) VALUES (?, ?, ?)",
    [actor.id, title, content]
  );
  res.json({ message: "created", id: result.insertId });
});

postRouter.put("/:id", requireLogin, async (req, res) => {
  const id = positiveId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id must be a positive integer" });
  }

  const { title, content } = req.body ?? {};
  if (typeof title !== "string" || typeof content !== "string") {
    return res.status(400).json({ message: "title and content must be strings" });
  }
  if (title.length < 1 || title.length > 100 || content.length < 1 || content.length > 5000) {
    return res.status(400).json({ message: "title must be 1-100 characters and content 1-5000" });
  }

    const actor = req.session.user!;
  const [rows]: any = await pool.execute(
    "SELECT user_id FROM posts WHERE id = ?",
    [id]
  );

  if (!rows.length) {
    return res.status(404).json({ message: "not found" });
  }

  if (rows[0].user_id !== actor.id && actor.role !== "ADMIN") {
    return res.status(403).json({ message: "forbidden" });
  }

  await pool.execute(
    "UPDATE posts SET title = ?, content = ? WHERE id = ?",
    [title, content, id]
  );
  res.json({ message: "updated" });
});

postRouter.delete("/:id", requireLogin, async (req, res) => {
  const id = positiveId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "id must be a positive integer" });
  }

  const actor = req.session.user!;
  const [rows]: any = await pool.execute(
    "SELECT user_id FROM posts WHERE id = ?",
    [id]
  );

  if (!rows.length) {
    return res.status(404).json({ message: "not found" });
  }

  if (rows[0].user_id !== actor.id && actor.role !== "ADMIN") {
    return res.status(403).json({ message: "forbidden" });
  }

  await pool.execute("DELETE FROM posts WHERE id = ?", [id]);
  res.json({ message: "deleted" });
});
