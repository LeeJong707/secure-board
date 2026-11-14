import { Router } from "express";
import { pool } from "../db/pool.js";
import { positiveId } from "../validation.js";
import { requireLogin } from "../requireLogin.js";

export const commentRouter = Router({ mergeParams: true });

commentRouter.get("/", async (req, res) => {
  const params = req.params as Record<string, string>;
  const postId = positiveId(params.postId);
  if (postId === null) {
    return res.status(400).json({ message: "postId must be a positive integer" });
  }

  const [rows] = await pool.execute(
    `SELECT c.id, c.user_id, c.content, c.created_at, u.name AS authorName
     FROM comments c JOIN users u ON c.user_id=u.id
     WHERE c.post_id = ?
     ORDER BY c.id`,
    [postId]
  );
  res.json(rows);
});

commentRouter.post("/", requireLogin, async (req, res) => {
  const params = req.params as Record<string, string>;
  const postId = positiveId(params.postId);
  if (postId === null) {
    return res.status(400).json({ message: "postId must be a positive integer" });
  }

  const user = req.session.user as any;
  const { content } = req.body ?? {};
  if (typeof content !== "string") {
    return res.status(400).json({ message: "content must be a string" });
  }
  if (content.length < 1 || content.length > 500) {
    return res.status(400).json({ message: "comment must be 1-500 characters" });
  }

  await pool.execute(
    "INSERT INTO comments(post_id, user_id, content) VALUES (?, ?, ?)",
    [postId, user?.id ?? 1, content]
  );
  res.json({ message: "created" });
});

commentRouter.delete("/:commentId", requireLogin, async (req, res) => {
  const params = req.params as Record<string, string>;
  const postId = positiveId(params.postId);
  const commentId = positiveId(params.commentId);
  if (postId === null || commentId === null) {
    return res.status(400).json({ message: "postId and commentId must be positive integers" });
  }

  await pool.execute("DELETE FROM comments WHERE id = ?", [commentId]);
  res.json({ message: "deleted" });
});
