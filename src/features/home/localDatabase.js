import * as SQLite from 'expo-sqlite';

// Single shared database connection for the whole app.
let dbInstance = null;

export async function getDatabase() {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync('machaira.db');
  await runMigrations(dbInstance);
  return dbInstance;
}

/**
 * MIGRATION SYSTEM
 *
 * Each entry in MIGRATIONS is run exactly once, in order, the first time
 * a device's local database version is behind it. SQLite's built-in
 * `PRAGMA user_version` (a plain integer stored in the database file
 * itself) tracks how far a given device has gotten -- no separate
 * tracking table needed, and it survives app updates without requiring
 * a reinstall.
 *
 * RULES FOR ADDING A NEW MIGRATION:
 *  - Never edit an existing migration once it has shipped to users --
 *    devices that already ran it won't re-run it, so an edit would only
 *    affect fresh installs, silently diverging from upgraded devices.
 *  - Add a new function at the END of the MIGRATIONS array instead.
 *  - Each migration should be safe to run on a database that already has
 *    the target schema (use IF NOT EXISTS / check-before-ALTER) as a
 *    defensive fallback, but should not rely on that -- the version
 *    check above is what actually prevents re-running.
 *  - Keep each migration small and focused on one change, so a failure
 *    partway through future schema work is easy to diagnose.
 */
const MIGRATIONS = [
  // Migration 1: initial schema.
  async (db) => {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS devotionals (
        id INTEGER PRIMARY KEY,
        title TEXT,
        content TEXT,
        pure_content TEXT,
        category TEXT,
        episode_number INTEGER,
        flyer_url TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_devotionals_episode_number ON devotionals(episode_number);
      CREATE INDEX IF NOT EXISTS idx_devotionals_created_at ON devotionals(created_at);

      CREATE TABLE IF NOT EXISTS sync_meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  },

  // Migration 2: offline bookmark queue.
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_bookmark_actions (
        episode_number INTEGER PRIMARY KEY,
        action TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  },

  // Migration 3: add audio_url to devotionals, for devices whose local
  // table was already created by migration 1 before this column existed.
  // Also resets the sync watermark so the NEXT sync does a full refresh
  // instead of only pulling rows changed since last time -- otherwise,
  // rows that were already cached locally before this column existed
  // would keep audio_url as null forever, since incremental sync only
  // looks at what changed in Supabase, not what's missing locally.
  async (db) => {
    const hasColumn = await columnExists(db, 'devotionals', 'audio_url');
    if (!hasColumn) {
      await db.execAsync(`ALTER TABLE devotionals ADD COLUMN audio_url TEXT;`);
      await db.runAsync('DELETE FROM sync_meta WHERE key = ?', ['last_sync_at']);
    }
  },
];

async function columnExists(db, tableName, columnName) {
  const columns = await db.getAllAsync(`PRAGMA table_info(${tableName})`);
  return columns.some((col) => col.name === columnName);
}

async function runMigrations(db) {
  const result = await db.getFirstAsync('PRAGMA user_version');
  let currentVersion = result ? result.user_version : 0;

  console.log(`[DB migrations] current version: ${currentVersion}, target: ${MIGRATIONS.length}`);

  if (currentVersion >= MIGRATIONS.length) {
    console.log('[DB migrations] already up to date, nothing to run');
    return;
  }

  for (let i = currentVersion; i < MIGRATIONS.length; i++) {
    console.log(`[DB migrations] running migration ${i + 1}...`);
    await MIGRATIONS[i](db);
    // Bump the version after each individual migration succeeds, not
    // just once at the end -- if migration 3 throws, migrations 1 and 2
    // are still recorded as applied, so a retry on next launch resumes
    // from 3 instead of re-running everything.
    await db.execAsync(`PRAGMA user_version = ${i + 1}`);
    console.log(`[DB migrations] migration ${i + 1} complete, version now ${i + 1}`);
  }
}

export async function getLastSyncTimestamp() {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    'SELECT value FROM sync_meta WHERE key = ?',
    ['last_sync_at']
  );
  return row ? row.value : null;
}

export async function setLastSyncTimestamp(isoString) {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO sync_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    ['last_sync_at', isoString]
  );
}

export async function getLocalDevotionalCount() {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT COUNT(*) as count FROM devotionals');
  return row ? row.count : 0;
}

export async function queueBookmarkAction(episodeNumber, action) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO pending_bookmark_actions (episode_number, action, created_at)
     VALUES (?, ?, ?)
     ON CONFLICT(episode_number) DO UPDATE SET action = excluded.action, created_at = excluded.created_at`,
    [episodeNumber, action, new Date().toISOString()]
  );
}

export async function getPendingBookmarkActions() {
  const db = await getDatabase();
  return db.getAllAsync('SELECT * FROM pending_bookmark_actions ORDER BY created_at ASC');
}

export async function clearPendingBookmarkAction(episodeNumber) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM pending_bookmark_actions WHERE episode_number = ?', [episodeNumber]);
}
