import { supabase } from '../../config/supabaseClient';
import { getDatabase, getLastSyncTimestamp, setLastSyncTimestamp } from './localDatabase';

const PAGE_SIZE = 500;

/**
 * Syncs devotionals from Supabase into local SQLite.
 * - First run: pulls everything (paginated).
 * - Subsequent runs: only pulls rows updated since the last successful sync,
 *   using created_at as the watermark (falls back to full sync if that
 *   column isn't reliable for your data -- see note below).
 *
 * Safe to call on every app launch; it's a no-op (fast) if nothing changed.
 */
export async function syncDevotionals(onProgress) {
  const db = await getDatabase();
  const lastSync = await getLastSyncTimestamp();

  let from = 0;
  let totalSynced = 0;
  const syncStartedAt = new Date().toISOString();

  while (true) {
    let query = supabase
      .from('devotionals')
      .select('id, title, content, pure_content, category, episode_number, flyer_url, audio_url, created_at, updated_at')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    // Incremental sync: only fetch rows changed since last time. Uses
    // updated_at since that reflects edits too, not just new inserts --
    // if your real-time sync plugin doesn't reliably set updated_at,
    // this filter can be removed to always do a full resync instead
    // (safe, just slower).
    if (lastSync) {
      query = query.gt('updated_at', lastSync);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;

    await upsertBatch(db, data);
    totalSynced += data.length;

    if (onProgress) onProgress({ synced: totalSynced });

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  await setLastSyncTimestamp(syncStartedAt);
  return { totalSynced };
}

async function upsertBatch(db, rows) {
  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      await db.runAsync(
        `INSERT INTO devotionals
          (id, title, content, pure_content, category, episode_number, flyer_url, audio_url, created_at, updated_at, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           content = excluded.content,
           pure_content = excluded.pure_content,
           category = excluded.category,
           episode_number = excluded.episode_number,
           flyer_url = excluded.flyer_url,
           audio_url = excluded.audio_url,
           created_at = excluded.created_at,
           updated_at = excluded.updated_at,
           synced_at = excluded.synced_at`,
        [
          row.id,
          row.title,
          row.content,
          row.pure_content,
          row.category,
          row.episode_number,
          row.flyer_url,
          row.audio_url,
          row.created_at,
          row.updated_at,
          new Date().toISOString(),
        ]
      );
    }
  });
}

/**
 * Reads a single devotional from local SQLite by id or episode_number.
 * Returns null if not found locally (caller should fall back to Supabase).
 */
export async function getLocalDevotional({ id, episodeNumber }) {
  const db = await getDatabase();

  if (id) {
    const row = await db.getFirstAsync('SELECT * FROM devotionals WHERE id = ?', [id]);
    if (row) {
      console.log(`[getLocalDevotional] found by id=${id}, audio_url:`, row.audio_url);
      return row;
    }
  }

  if (episodeNumber) {
    const row = await db.getFirstAsync(
      'SELECT * FROM devotionals WHERE episode_number = ?',
      [episodeNumber]
    );
    if (row) {
      console.log(`[getLocalDevotional] found by episodeNumber=${episodeNumber}, audio_url:`, row.audio_url);
      return row;
    }
  }

  console.log(`[getLocalDevotional] not found locally for id=${id}, episodeNumber=${episodeNumber}`);
  return null;
}

export async function getAllLocalDevotionals() {
  const db = await getDatabase();
  return db.getAllAsync('SELECT * FROM devotionals ORDER BY episode_number DESC');
}
