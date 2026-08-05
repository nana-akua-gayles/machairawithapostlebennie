import { supabase } from './supabaseClient';

export async function fetchDevotionals(page = 0, limit = 20) {
    const { data, error } = await supabase
        .from('devotionals')
        .select('*')
        .order('publish_date', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

    if (error) {
        console.error('Error fetching devotionals:', error.message);
        return [];
    }
    return data;
}

export async function fetchDevotionalById(id) {
    const { data, error } = await supabase
        .from('devotionals')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching devotional detail:', error.message);
        return null;
    }
    return data;
}