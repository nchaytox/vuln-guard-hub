import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vulntrack';

let pool;

export async function connectDB({ retries = 20, delayMs = 3000 } = {}) {
  pool = new Pool({ connectionString: DATABASE_URL });

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          -- Optional profile columns
          ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
          CREATE TABLE IF NOT EXISTS scans (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            target TEXT NOT NULL,
            result JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS idx_scans_user_created_at ON scans(user_id, created_at DESC);
          -- Migration: normalize usernames to lowercase and de-duplicate if needed
          WITH normalized AS (
            SELECT id, username, lower(username) AS uname,
                   ROW_NUMBER() OVER (PARTITION BY lower(username) ORDER BY id) AS rn
            FROM users
          ),
          renamed AS (
            UPDATE users u
            SET username = CASE
              WHEN n.rn = 1 THEN n.uname
              ELSE n.uname || '_' || u.id::text
            END
            FROM normalized n
            WHERE u.id = n.id
              AND u.username <> CASE WHEN n.rn = 1 THEN n.uname ELSE n.uname || '_' || u.id::text END
            RETURNING 1
          )
          SELECT 1;
          -- Enforce case-insensitive uniqueness going forward
          CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users ((lower(username)));

          -- DAST tables removed
        `);
      } finally {
        client.release();
      }
      console.log('✅ Connected to Postgres');
      return;
    } catch (err) {
      attempt += 1;
      const msg = err && err.message ? err.message : String(err);
      if (attempt > retries) {
        console.error(`❌ Postgres connection failed after ${retries} retries:`, msg);
        process.exit(1);
      }
      console.warn(`⚠️ Postgres connect attempt ${attempt} failed: ${msg}. Retrying in ${Math.round(delayMs/1000)}s...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export function getPool() {
  if (!pool) throw new Error('DB not initialized');
  return pool;
}

export async function pgGetUserByUsername(username) {
  const res = await getPool().query(
    'SELECT id, username, password, created_at FROM users WHERE LOWER(username) = LOWER($1)',
    [username]
  );
  return res.rows[0] || null;
}

export async function pgCreateUser(username, passwordHash) {
  const res = await getPool().query(
    'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
    [username, passwordHash]
  );
  return res.rows[0].id;
}

export async function pgCreateScan({ username, type, target, result }) {
  const user = await pgGetUserByUsername(username);
  if (!user) throw new Error('User not found');
  const res = await getPool().query(
    'INSERT INTO scans (user_id, type, target, result) VALUES ($1, $2, $3, $4::jsonb) RETURNING id, created_at',
    [user.id, type, target, JSON.stringify(result)]
  );
  return res.rows[0];
}

export async function pgListScansByUsername(username, { limit = 20, offset = 0 } = {}) {
  const user = await pgGetUserByUsername(username);
  if (!user) return [];
  const res = await getPool().query(
    'SELECT id, type, target, result, created_at FROM scans WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [user.id, limit, offset]
  );
  return res.rows;
}

export async function pgGetProfile(username) {
  const res = await getPool().query(
    'SELECT username, email, display_name, created_at FROM users WHERE LOWER(username) = LOWER($1)',
    [username]
  );
  return res.rows[0] || null;
}

export async function pgUpdateUser(username, { email, displayName, passwordHash } = {}) {
  const fields = [];
  const params = [];
  let idx = 1;
  if (typeof email !== 'undefined') { fields.push(`email = $${idx++}`); params.push(email); }
  if (typeof displayName !== 'undefined') { fields.push(`display_name = $${idx++}`); params.push(displayName); }
  if (typeof passwordHash !== 'undefined') { fields.push(`password = $${idx++}`); params.push(passwordHash); }
  if (fields.length === 0) return 0;
  params.push(username);
  const sql = `UPDATE users SET ${fields.join(', ')} WHERE LOWER(username) = LOWER($${idx})`;
  const res = await getPool().query(sql, params);
  return res.rowCount || 0;
}

export async function pgListScans(username, { type, start, end, limit = 20, offset = 0 } = {}) {
  const user = await pgGetUserByUsername(username);
  if (!user) return [];
  const where = ['user_id = $1'];
  const params = [user.id];
  let idx = params.length + 1;
  if (type) {
    where.push(`type = $${idx++}`);
    params.push(type);
  }
  if (start) {
    where.push(`created_at >= $${idx++}`);
    params.push(new Date(start));
  }
  if (end) {
    where.push(`created_at <= $${idx++}`);
    params.push(new Date(end));
  }
  const sql = `SELECT id, type, target, result, created_at FROM scans WHERE ${where.join(' AND ')}
               ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
  params.push(limit, offset);
  const res = await getPool().query(sql, params);
  return res.rows;
}

export async function pgListAllScans(username, { type, start, end } = {}) {
  const user = await pgGetUserByUsername(username);
  if (!user) return [];
  const where = ['user_id = $1'];
  const params = [user.id];
  let idx = params.length + 1;
  if (type) {
    where.push(`type = $${idx++}`);
    params.push(type);
  }
  if (start) {
    where.push(`created_at >= $${idx++}`);
    params.push(new Date(start));
  }
  if (end) {
    where.push(`created_at <= $${idx++}`);
    params.push(new Date(end));
  }
  const sql = `SELECT id, type, target, result, created_at FROM scans WHERE ${where.join(' AND ')}` +
              `
               ORDER BY created_at DESC`;
  const res = await getPool().query(sql, params);
  return res.rows;
}


export async function pgGetScanByIdForUser(username, id) {
  const user = await pgGetUserByUsername(username);
  if (!user) return null;
  const res = await getPool().query(
    'SELECT id, type, target, result, created_at FROM scans WHERE id = $1 AND user_id = $2',
    [id, user.id]
  );
  return res.rows[0] || null;
}
