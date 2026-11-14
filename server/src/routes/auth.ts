import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "../db/pool.js";

export const authRouter = Router();

const LOGIN_FAILED = "이메일 또는 비밀번호가 올바르지 않습니다";
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 10);

const MAX_FAILS = 5;
const LOCK_MS = 5 * 60 * 1000;
const loginFails = new Map<string, { count: number; lockedUntil: number }>();

authRouter.post("/register", async (req, res) => {
  const { email, password, name } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
    return res.status(400).json({ message: "email, password and name must be strings" });
  }
  if (name.length < 1 || name.length > 30) {
    return res.status(400).json({ message: "name must be 1-30 characters" });
  }

    if (password.length < 8) {
    return res.status(400).json({ message: "password must be at least 8 characters" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.execute(
    "INSERT INTO users(email, password_hash, name, role) VALUES (?, ?, ?, 'USER')",
    [email, passwordHash, name]
  );

  res.json({ message: "registered" });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "email and password must be strings" });
  }

  const key = email.toLowerCase();
  const fail = loginFails.get(key);
  if (fail && fail.lockedUntil > Date.now()) {
    return res.status(429).json({ message: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요" });
  }
  if (fail && fail.lockedUntil !== 0) {
    loginFails.delete(key);
  }

  const [rows]: any = await pool.execute(
    `SELECT id, email, name, role, password_hash FROM users
     WHERE email = ?`,
    [email]
  );

  const row = rows[0];
  const passwordOk = await bcrypt.compare(password, row ? row.password_hash : DUMMY_HASH);
  if (!row || !passwordOk) {
    const current = loginFails.get(key) ?? { count: 0, lockedUntil: 0 };
    current.count += 1;
    if (current.count >= MAX_FAILS) {
      current.lockedUntil = Date.now() + LOCK_MS;
    }
    loginFails.set(key, current);
    return res.status(401).json({ message: LOGIN_FAILED });
  }

  loginFails.delete(key);

    const user = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role
  };

  req.session.user = user;
  res.cookie("lastLoginUser", JSON.stringify(user), { httpOnly: false });
  res.json(user);
});

authRouter.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "not logged in" });
  } 
    
  
  res.json(req.session.user);
});


authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ message: "logout" }));
});
