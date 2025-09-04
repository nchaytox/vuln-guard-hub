import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pgGetUserByUsername, pgCreateUser } from './db-postgres.js';

export const login = async (req, res) => {
  const rawUsername = String(req.body?.username ?? '');
  const rawPassword = String(req.body?.password ?? '');
  const usernameTrimmed = rawUsername.trim();
  const password = rawPassword;

  // Case-insensitive lookup handled in pgGetUserByUsername
  const user = await pgGetUserByUsername(usernameTrimmed || rawUsername);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: 'Server misconfigured (JWT secret missing)' });
  const token = jwt.sign({ username: user.username }, secret, { expiresIn: '2h' });
  res.json({ token });
};

export const register = async (req, res) => {
  const rawUsername = String(req.body?.username ?? '');
  const rawPassword = String(req.body?.password ?? '');
  const usernameNormalized = rawUsername.trim().toLowerCase();
  const password = rawPassword;

  if (!usernameNormalized || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  try {
    // ensure unique (case-insensitive)
    const exists = await pgGetUserByUsername(usernameNormalized);
    if (exists) {
      return res.status(409).json({ error: 'User already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    await pgCreateUser(usernameNormalized, hashed);
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server misconfigured (JWT secret missing)' });
    const token = jwt.sign({ username: usernameNormalized }, secret, { expiresIn: '2h' });
    return res.status(201).json({ token });
  } catch (err) {
    // Unique violation
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'User already exists' });
    }
    return res.status(500).json({ error: 'Registration failed' });
  }
};
