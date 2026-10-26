import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let dbInstance = null;

export function getDb(customPath = null) {
  if (dbInstance && !customPath) return dbInstance;

  const dbPath = customPath || process.env.DATABASE_PATH || join(process.cwd(), "data", "ustream.db");

  if (dbPath !== ":memory:") {
    const dir = dirname(resolve(dbPath));
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);

  // Enable foreign keys & WAL mode (if file-based)
  db.exec("PRAGMA foreign_keys = ON;");
  if (dbPath !== ":memory:") {
    try {
      db.exec("PRAGMA journal_mode = WAL;");
    } catch {}
  }

  // Run migrations
  runMigrations(db);

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

  const migrations = [
    { version: "001_initial_auth", file: "001_initial_auth.sql" },
    { version: "002_profiles_and_activity", file: "002_profiles_and_activity.sql" },
    { version: "003_rate_limits", file: "003_rate_limits.sql" }
  ];

  const checkStmt = db.prepare("SELECT version FROM schema_migrations WHERE version = ?");
  const insertStmt = db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)");

  for (const m of migrations) {
    const existing = checkStmt.get(m.version);
    if (!existing) {
      const sqlPath = join(__dirname, "migrations", m.file);
      const sql = readFileSync(sqlPath, "utf8");
      db.exec(sql);
      insertStmt.run(m.version, Date.now());
    }
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
