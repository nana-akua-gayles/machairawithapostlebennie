import { supabase } from '../../config/supabaseClient';
import { getPendingBookmarkActions, clearPendingBookmarkAction } from './localDatabase';

let inFlightReplay = null;

export async function replayPendingBookmarkActions(userId) {
  if (!userId) return { replayed: 0 };

  if (inFlightReplay) {
    return inFlightReplay;
  }

  inFlightReplay = runReplay(userId).finally(() => {
    inFlightReplay = null;
  });

  return inFlightReplay;
}

async function runReplay(userId) {
  const pending = await getPendingBookmarkActions();
  if (pending.length === 0) return { replayed: 0 };

  let replayed = 0;

  for (const action of pending) {
    try {
      if (action.action === 'add') {
        await supabase
          .from('saved_devotionals')
          .insert({ user_id: userId, episode_number: action.episode_number });
      } else if (action.action === 'remove') {
        await supabase
          .from('saved_devotionals')
          .delete()
          .eq('user_id', userId)
          .eq('episode_number', action.episode_number);
      }
      await clearPendingBookmarkAction(action.episode_number);
      replayed++;
    } catch (err) {

      console.warn('Bookmark replay stopped early:', err.message || err);
      break;
    }
  }

  return { replayed };
}
