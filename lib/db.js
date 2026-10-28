import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let DatabaseSync = null;

const MIGRATION_001 = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT,
  name TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  google_id TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  is_remember_me INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS email_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token_hash);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);
`;

const MIGRATION_002 = `
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT 'avatar-1',
  is_kids INTEGER NOT NULL DEFAULT 0,
  maturity_rating TEXT NOT NULL DEFAULT 'All',
  language TEXT NOT NULL DEFAULT 'en',
  pin_hash TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

CREATE TABLE IF NOT EXISTS profile_watchlist (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_title TEXT NOT NULL,
  item_data TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(profile_id, item_title)
);

CREATE INDEX IF NOT EXISTS idx_profile_watchlist_profile_id ON profile_watchlist(profile_id);

CREATE TABLE IF NOT EXISTS profile_playback_history (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_title TEXT NOT NULL,
  tmdb_id TEXT,
  season INTEGER NOT NULL DEFAULT 1,
  episode INTEGER NOT NULL DEFAULT 1,
  progress INTEGER NOT NULL DEFAULT 0,
  item_data TEXT,
  updated_at INTEGER NOT NULL,
  UNIQUE(profile_id, item_title)
);

CREATE INDEX IF NOT EXISTS idx_profile_playback_history_profile_id ON profile_playback_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_playback_history_updated_at ON profile_playback_history(updated_at);
`;

const MIGRATION_003 = `
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  points INTEGER NOT NULL DEFAULT 0,
  first_attempt_at INTEGER NOT NULL,
  last_attempt_at INTEGER NOT NULL,
  blocked_until INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked_until ON rate_limits(blocked_until);

CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  code_verifier TEXT NOT NULL,
  return_url TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
`;

const EMBEDDED_MIGRATIONS = [
  { version: "001_initial_auth", sql: MIGRATION_001 },
  { version: "002_profiles_and_activity", sql: MIGRATION_002 },
  { version: "003_rate_limits", sql: MIGRATION_003 }
];

export function createMemoryDb(filePath = null) {
  const store = {
    users: [],
    profiles: [],
    sessions: [],
    email_verifications: [],
    password_resets: [],
    rate_limits: [],
    profile_watchlist: [],
    profile_playback_history: [],
    oauth_states: [],
    schema_migrations: []
  };

  if (filePath && existsSync(filePath)) {
    try {
      const data = JSON.parse(readFileSync(filePath, "utf8"));
      Object.assign(store, data);
    } catch {}
  }

  function save() {
    if (filePath) {
      try {
        const dir = dirname(filePath);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        writeFileSync(filePath, JSON.stringify(store, null, 2), "utf8");
      } catch {}
    }
  }

  return {
    exec(sql) {
      // DDL is accepted silently
    },
    prepare(rawSql) {
      const sql = rawSql.replace(/\s+/g, " ").trim();

      return {
        get(...params) {
          // 1. rate_limits
          if (/SELECT \* FROM rate_limits WHERE key = \?/i.test(sql)) {
            const key = params[0];
            return store.rate_limits.find(r => r.key === key);
          }

          // 2. users
          if (/SELECT id FROM users WHERE email = \?/i.test(sql)) {
            const email = String(params[0] || "").toLowerCase();
            const u = store.users.find(r => r.email.toLowerCase() === email);
            return u ? { id: u.id } : undefined;
          }
          if (/SELECT \* FROM users WHERE email = \?/i.test(sql)) {
            const email = String(params[0] || "").toLowerCase();
            return store.users.find(r => r.email.toLowerCase() === email);
          }
          if (/SELECT .* FROM users WHERE id = \?/i.test(sql)) {
            const id = params[0];
            const u = store.users.find(r => r.id === id);
            return u ? { ...u } : undefined;
          }
          if (/SELECT \* FROM users WHERE google_id = \? OR email = \?/i.test(sql)) {
            const gid = params[0];
            const email = String(params[1] || "").toLowerCase();
            return store.users.find(r => (gid && r.google_id === gid) || r.email.toLowerCase() === email);
          }

          // 3. sessions join users
          if (/SELECT s\.\*, u\.email, u\.name, u\.email_verified, u\.created_at as user_created_at FROM sessions s JOIN users u/i.test(sql)) {
            const tokenHash = params[0];
            const now = params[1];
            const session = store.sessions.find(s => s.token_hash === tokenHash && s.expires_at > now);
            if (!session) return undefined;
            const user = store.users.find(u => u.id === session.user_id);
            if (!user) return undefined;
            return {
              ...session,
              email: user.email,
              name: user.name,
              email_verified: user.email_verified,
              user_created_at: user.created_at
            };
          }

          // 4. email_verifications
          if (/SELECT \* FROM email_verifications WHERE token_hash = \? AND expires_at > \?/i.test(sql)) {
            const th = params[0];
            const now = params[1];
            return store.email_verifications.find(e => e.token_hash === th && e.expires_at > now);
          }

          // 5. password_resets
          if (/SELECT \* FROM password_resets WHERE token_hash = \? AND used = 0 AND expires_at > \?/i.test(sql)) {
            const th = params[0];
            const now = params[1];
            return store.password_resets.find(p => p.token_hash === th && p.used === 0 && p.expires_at > now);
          }

          // 6. profiles
          if (/SELECT \* FROM profiles WHERE id = \? AND user_id = \?/i.test(sql)) {
            const id = params[0];
            const uid = params[1];
            return store.profiles.find(p => p.id === id && p.user_id === uid);
          }
          if (/SELECT \* FROM profiles WHERE id = \?/i.test(sql)) {
            const id = params[0];
            return store.profiles.find(p => p.id === id);
          }
          if (/SELECT id, user_id, name, avatar, is_kids, maturity_rating, language, \(pin_hash IS NOT NULL\) AS has_pin, is_primary, created_at, updated_at FROM profiles WHERE id = \?/i.test(sql)) {
            const id = params[0];
            const p = store.profiles.find(r => r.id === id);
            return p ? { ...p, has_pin: Boolean(p.pin_hash) ? 1 : 0 } : undefined;
          }
          if (/SELECT COUNT\(\*\) AS count FROM profiles WHERE user_id = \?/i.test(sql)) {
            const uid = params[0];
            const count = store.profiles.filter(p => p.user_id === uid).length;
            return { count };
          }
          if (/SELECT pin_hash FROM profiles WHERE id = \? AND user_id = \?/i.test(sql)) {
            const id = params[0];
            const uid = params[1];
            const p = store.profiles.find(r => r.id === id && r.user_id === uid);
            return p ? { pin_hash: p.pin_hash } : undefined;
          }

          // 7. watchlist
          if (/SELECT id FROM profile_watchlist WHERE profile_id = \? AND item_title = \?/i.test(sql)) {
            const pid = params[0];
            const title = params[1];
            const item = store.profile_watchlist.find(w => w.profile_id === pid && w.item_title === title);
            return item ? { id: item.id } : undefined;
          }

          // 8. oauth_states
          if (/SELECT \* FROM oauth_states WHERE state = \? AND expires_at > \?/i.test(sql)) {
            const st = params[0];
            const now = params[1];
            return store.oauth_states.find(o => o.state === st && o.expires_at > now);
          }

          // 9. schema_migrations
          if (/SELECT version FROM schema_migrations WHERE version = \?/i.test(sql)) {
            const v = params[0];
            return store.schema_migrations.find(m => m.version === v);
          }

          return undefined;
        },

        all(...params) {
          // profiles for user
          if (/FROM profiles WHERE user_id = \?/i.test(sql)) {
            const uid = params[0];
            return store.profiles
              .filter(p => p.user_id === uid)
              .map(p => ({ ...p, has_pin: Boolean(p.pin_hash) ? 1 : 0 }))
              .sort((a, b) => (b.is_primary - a.is_primary) || (a.created_at - b.created_at));
          }

          // sessions for user
          if (/FROM sessions WHERE user_id = \? AND expires_at > \?/i.test(sql)) {
            const uid = params[0];
            const now = params[1];
            return store.sessions
              .filter(s => s.user_id === uid && s.expires_at > now)
              .sort((a, b) => b.last_active_at - a.last_active_at);
          }

          // watchlist for profile
          if (/FROM profile_watchlist WHERE profile_id = \?/i.test(sql)) {
            const pid = params[0];
            return store.profile_watchlist
              .filter(w => w.profile_id === pid)
              .sort((a, b) => b.created_at - a.created_at);
          }

          // history for profile
          if (/FROM profile_playback_history WHERE profile_id = \?/i.test(sql)) {
            const pid = params[0];
            return store.profile_playback_history
              .filter(h => h.profile_id === pid)
              .sort((a, b) => b.updated_at - a.updated_at)
              .slice(0, 50);
          }

          return [];
        },

        run(...params) {
          // 1. rate_limits
          if (/INSERT INTO rate_limits/i.test(sql)) {
            const [key, first, last] = [params[0], params[1], params[2]];
            store.rate_limits = store.rate_limits.filter(r => r.key !== key);
            store.rate_limits.push({ key, points: 1, first_attempt_at: first, last_attempt_at: last, blocked_until: 0 });
            save();
            return { changes: 1 };
          }
          if (/UPDATE rate_limits SET points = 1, first_attempt_at = \?, last_attempt_at = \?, blocked_until = 0 WHERE key = \?/i.test(sql)) {
            const [first, last, key] = [params[0], params[1], params[2]];
            const r = store.rate_limits.find(x => x.key === key);
            if (r) { Object.assign(r, { points: 1, first_attempt_at: first, last_attempt_at: last, blocked_until: 0 }); save(); return { changes: 1 }; }
            return { changes: 0 };
          }
          if (/UPDATE rate_limits SET points = \?, last_attempt_at = \?, blocked_until = \? WHERE key = \?/i.test(sql)) {
            const [pts, last, block, key] = [params[0], params[1], params[2], params[3]];
            const r = store.rate_limits.find(x => x.key === key);
            if (r) { Object.assign(r, { points: pts, last_attempt_at: last, blocked_until: block }); save(); return { changes: 1 }; }
            return { changes: 0 };
          }
          if (/UPDATE rate_limits SET points = \?, last_attempt_at = \? WHERE key = \?/i.test(sql)) {
            const [pts, last, key] = [params[0], params[1], params[2]];
            const r = store.rate_limits.find(x => x.key === key);
            if (r) { Object.assign(r, { points: pts, last_attempt_at: last }); save(); return { changes: 1 }; }
            return { changes: 0 };
          }
          if (/DELETE FROM rate_limits WHERE key = \?/i.test(sql)) {
            const key = params[0];
            const lenBefore = store.rate_limits.length;
            store.rate_limits = store.rate_limits.filter(x => x.key !== key);
            save();
            return { changes: lenBefore - store.rate_limits.length };
          }

          // 2. users
          if (/INSERT INTO users/i.test(sql)) {
            store.users.push({
              id: params[0],
              email: params[1],
              password_hash: params[2],
              name: params[3],
              email_verified: sql.includes("email_verified, google_id, created_at, updated_at) VALUES (?, ?, NULL, ?, 1, ?, ?, ?)") ? 1 : 0,
              google_id: params[4] && sql.includes("google_id") ? params[4] : null,
              created_at: params[params.length - 2],
              updated_at: params[params.length - 1]
            });
            save();
            return { changes: 1 };
          }
          if (/UPDATE users SET email_verified = 1, updated_at = \? WHERE id = \?/i.test(sql)) {
            const [up, id] = [params[0], params[1]];
            const u = store.users.find(x => x.id === id);
            if (u) { u.email_verified = 1; u.updated_at = up; save(); return { changes: 1 }; }
            return { changes: 0 };
          }
          if (/UPDATE users SET password_hash = \?, updated_at = \? WHERE id = \?/i.test(sql)) {
            const [hash, up, id] = [params[0], params[1], params[2]];
            const u = store.users.find(x => x.id === id);
            if (u) { u.password_hash = hash; u.updated_at = up; save(); return { changes: 1 }; }
            return { changes: 0 };
          }
          if (/UPDATE users SET google_id = \?, email_verified = 1, updated_at = \? WHERE id = \?/i.test(sql)) {
            const [gid, up, id] = [params[0], params[1], params[2]];
            const u = store.users.find(x => x.id === id);
            if (u) { u.google_id = gid; u.email_verified = 1; u.updated_at = up; save(); return { changes: 1 }; }
            return { changes: 0 };
          }

          // 3. profiles
          if (/INSERT INTO profiles/i.test(sql)) {
            if (params.length === 11) {
              const [id, user_id, name, avatar, is_kids, maturity_rating, language, pin_hash, is_primary, created_at, updated_at] = params;
              store.profiles.push({ id, user_id, name, avatar, is_kids: is_kids ? 1 : 0, maturity_rating, language, pin_hash, is_primary: is_primary ? 1 : 0, created_at, updated_at });
            } else {
              const [id, user_id, name, created_at, updated_at] = params;
              store.profiles.push({ id, user_id, name, avatar: "avatar-1", is_kids: 0, maturity_rating: "All", language: "en", pin_hash: null, is_primary: 1, created_at, updated_at });
            }
            save();
            return { changes: 1 };
          }
          if (/UPDATE profiles SET name = \?, avatar = \?, is_kids = \?, maturity_rating = \?, language = \?, pin_hash = \?, updated_at = \? WHERE id = \?/i.test(sql)) {
            const [name, avatar, is_kids, maturity_rating, language, pin_hash, updated_at, id] = params;
            const p = store.profiles.find(x => x.id === id);
            if (p) {
              Object.assign(p, { name, avatar, is_kids: is_kids ? 1 : 0, maturity_rating, language, pin_hash, updated_at });
              save();
              return { changes: 1 };
            }
            return { changes: 0 };
          }
          if (/DELETE FROM profiles WHERE id = \?/i.test(sql)) {
            const id = params[0];
            const before = store.profiles.length;
            store.profiles = store.profiles.filter(x => x.id !== id);
            save();
            return { changes: before - store.profiles.length };
          }

          // 4. sessions
          if (/INSERT INTO sessions/i.test(sql)) {
            const [id, user_id, token_hash, created_at, expires_at, last_active_at, ip_address, user_agent, is_remember_me] = params;
            store.sessions.push({ id, user_id, token_hash, created_at, expires_at, last_active_at, ip_address, user_agent, is_remember_me });
            save();
            return { changes: 1 };
          }
          if (/UPDATE sessions SET last_active_at = \? WHERE id = \?/i.test(sql)) {
            const [last, id] = [params[0], params[1]];
            const s = store.sessions.find(x => x.id === id);
            if (s) { s.last_active_at = last; save(); return { changes: 1 }; }
            return { changes: 0 };
          }
          if (/DELETE FROM sessions WHERE token_hash = \?/i.test(sql)) {
            const th = params[0];
            const before = store.sessions.length;
            store.sessions = store.sessions.filter(x => x.token_hash !== th);
            save();
            return { changes: before - store.sessions.length };
          }
          if (/DELETE FROM sessions WHERE user_id = \? AND token_hash != \?/i.test(sql)) {
            const [uid, th] = [params[0], params[1]];
            const before = store.sessions.length;
            store.sessions = store.sessions.filter(x => !(x.user_id === uid && x.token_hash !== th));
            save();
            return { changes: before - store.sessions.length };
          }
          if (/DELETE FROM sessions WHERE user_id = \?/i.test(sql)) {
            const uid = params[0];
            const before = store.sessions.length;
            store.sessions = store.sessions.filter(x => x.user_id !== uid);
            save();
            return { changes: before - store.sessions.length };
          }

          // 5. email_verifications
          if (/INSERT INTO email_verifications/i.test(sql)) {
            const [id, user_id, token_hash, expires_at, created_at] = params;
            store.email_verifications.push({ id, user_id, token_hash, expires_at, created_at });
            save();
            return { changes: 1 };
          }
          if (/DELETE FROM email_verifications WHERE user_id = \?/i.test(sql)) {
            const uid = params[0];
            store.email_verifications = store.email_verifications.filter(x => x.user_id !== uid);
            save();
            return { changes: 1 };
          }
          if (/DELETE FROM email_verifications WHERE id = \?/i.test(sql)) {
            const id = params[0];
            store.email_verifications = store.email_verifications.filter(x => x.id !== id);
            save();
            return { changes: 1 };
          }

          // 6. password_resets
          if (/INSERT INTO password_resets/i.test(sql)) {
            const [id, user_id, token_hash, expires_at, created_at] = params;
            store.password_resets.push({ id, user_id, token_hash, expires_at, used: 0, created_at: created_at || Date.now() });
            save();
            return { changes: 1 };
          }
          if (/DELETE FROM password_resets WHERE user_id = \?/i.test(sql)) {
            const uid = params[0];
            store.password_resets = store.password_resets.filter(x => x.user_id !== uid);
            save();
            return { changes: 1 };
          }
          if (/UPDATE password_resets SET used = 1 WHERE id = \?/i.test(sql)) {
            const id = params[0];
            const p = store.password_resets.find(x => x.id === id);
            if (p) { p.used = 1; save(); return { changes: 1 }; }
            return { changes: 0 };
          }

          // 7. watchlist
          if (/INSERT INTO profile_watchlist/i.test(sql)) {
            const [id, profile_id, item_title, item_data, created_at] = params;
            store.profile_watchlist = store.profile_watchlist.filter(w => !(w.profile_id === profile_id && w.item_title === item_title));
            store.profile_watchlist.push({ id, profile_id, item_title, item_data, created_at });
            save();
            return { changes: 1 };
          }
          if (/DELETE FROM profile_watchlist WHERE id = \?/i.test(sql)) {
            const id = params[0];
            const before = store.profile_watchlist.length;
            store.profile_watchlist = store.profile_watchlist.filter(x => x.id !== id);
            save();
            return { changes: before - store.profile_watchlist.length };
          }

          // 8. playback history
          if (/INSERT INTO profile_playback_history/i.test(sql)) {
            const [id, profile_id, item_title, tmdb_id, season, episode, progress, item_data, updated_at] = params;
            const existing = store.profile_playback_history.find(h => h.profile_id === profile_id && h.item_title === item_title);
            if (existing) {
              Object.assign(existing, { tmdb_id, season, episode, progress, item_data, updated_at });
            } else {
              store.profile_playback_history.push({ id, profile_id, item_title, tmdb_id, season, episode, progress, item_data, updated_at });
            }
            save();
            return { changes: 1 };
          }

          // 9. oauth_states
          if (/INSERT INTO oauth_states/i.test(sql)) {
            const [state, code_verifier, return_url, created_at, expires_at] = params;
            store.oauth_states.push({ state, code_verifier, return_url, created_at, expires_at });
            save();
            return { changes: 1 };
          }
          if (/DELETE FROM oauth_states WHERE state = \?/i.test(sql)) {
            const state = params[0];
            store.oauth_states = store.oauth_states.filter(x => x.state !== state);
            save();
            return { changes: 1 };
          }

          // schema_migrations insert
          if (/INSERT INTO schema_migrations/i.test(sql)) {
            const [version, applied_at] = params;
            store.schema_migrations.push({ version, applied_at });
            save();
            return { changes: 1 };
          }

          return { changes: 0 };
        }
      };
    },
    close() {}
  };
}

let dbInstance = null;

export function getDb(customPath = null) {
  if (dbInstance && !customPath) return dbInstance;

  const isVercel = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.NODE_ENV === "production" && !process.env.LOCAL_DEV
  );

  const defaultSqlitePath = isVercel ? "/tmp/ustream.db" : join(process.cwd(), "data", "ustream.db");
  const dbPath = customPath || process.env.DATABASE_PATH || defaultSqlitePath;

  // Try SQLite DatabaseSync if available
  if (DatabaseSync) {
    try {
      if (dbPath !== ":memory:") {
        const dir = dirname(resolve(dbPath));
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      }

      const db = new DatabaseSync(dbPath);
      db.exec("PRAGMA foreign_keys = ON;");
      if (dbPath !== ":memory:") {
        try {
          db.exec("PRAGMA journal_mode = WAL;");
        } catch {}
      }

      runMigrations(db);

      if (!customPath) {
        dbInstance = db;
      }
      return db;
    } catch (err) {
      console.warn("[DatabaseSync init error, falling back to memory store]:", err.message);
    }
  }

  // Fallback to high-performance MemoryDb with persistence
  const fallbackJsonPath = isVercel ? "/tmp/ustream-auth-db.json" : join(process.cwd(), "data", "ustream-auth-db.json");
  const memDb = createMemoryDb(customPath === ":memory:" ? null : fallbackJsonPath);
  if (!customPath) {
    dbInstance = memDb;
  }
  return memDb;
}

export function runMigrations(db) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at INTEGER NOT NULL
      );
    `);

    const checkStmt = db.prepare("SELECT version FROM schema_migrations WHERE version = ?");
    const insertStmt = db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)");

    for (const m of EMBEDDED_MIGRATIONS) {
      const existing = checkStmt.get(m.version);
      if (!existing) {
        db.exec(m.sql);
        insertStmt.run(m.version, Date.now());
      }
    }
  } catch (err) {
    console.warn("[runMigrations error]:", err.message);
  }
}

export function closeDb() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;
  }
}

export const createDatabase = getDb;
export default getDb;
