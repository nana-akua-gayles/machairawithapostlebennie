// Supabase Edge Function: notify-new-message
//
// SETUP (you'll need to do this in your Supabase project — not something I
// can deploy from here):
//   1. supabase functions new notify-new-message
//      (then replace the generated index.ts with this file's contents)
//   2. supabase functions deploy notify-new-message
//   3. Database > Webhooks > create a webhook on `group_messages` INSERT
//      that calls this function's URL.
//   4. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as function secrets
//      (service role is required to read all members' push tokens).
//
// This is a starting point, not a finished notification system — you'll
// likely want to de-duplicate rapid messages, respect per-user mute
// settings, and handle Expo's push receipt/error responses.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  try {
    const payload = await req.json();
    const message = payload.record; 

    if (!message?.group_id || !message?.user_id) {
      return new Response('Missing message fields', { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const [{ data: sender }, { data: group }, { data: members }] = await Promise.all([
      supabase.from('profiles').select('name').eq('id', message.user_id).single(),
      supabase.from('groups').select('name').eq('id', message.group_id).single(),
      supabase
        .from('group_members')
        .select('user_id, profiles:user_id (expo_push_token)')
        .eq('group_id', message.group_id),
    ]);

    const recipients = (members || [])
      .filter((m: any) => m.user_id !== message.user_id && m.profiles?.expo_push_token)
      .map((m: any) => m.profiles.expo_push_token);

    if (recipients.length === 0) {
      return new Response('No recipients with push tokens', { status: 200 });
    }

    const title = message.is_announcement
      ? `📌 ${group?.name || 'Group'} announcement`
      : group?.name || 'New message';
    const body = message.is_announcement
      ? message.content
      : `${sender?.name || 'Someone'}: ${message.content}`;

    const notifications = recipients.map((token: string) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: { groupId: message.group_id, messageId: message.id },
    }));

    const expoRes = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(notifications),
    });

    if (!expoRes.ok) {
      const errText = await expoRes.text();
      console.error('Expo push error:', errText);
      return new Response('Expo push failed', { status: 502 });
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('notify-new-message error:', err);
    return new Response('Internal error', { status: 500 });
  }
});