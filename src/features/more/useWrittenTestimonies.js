import { useState, useCallback, useRef } from 'react';
import { supabase } from '../../config/supabaseClient';

const PAGE_SIZE = 10;

export const useWrittenTestimonies = (currentUserId) => {
  const [testimonies, setTestimonies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const lastCursorRef = useRef(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const likeInFlight = useRef(new Set());

  const fetchTestimonies = useCallback(async (category = 'All', reset = false) => {
    if (loadingRef.current || (!reset && !hasMoreRef.current)) return;
    loadingRef.current = true;
    setLoading(true);
    if (reset) { lastCursorRef.current = null; hasMoreRef.current = true; }

    try {
      let query = supabase.from('writtentestimonies').select(`*, profiles:user_id ( name, avatar_url ), written_testimony_likes!left ( user_id )`);
      if (currentUserId) query = query.eq('written_testimony_likes.user_id', currentUserId);
      query = query.order('created_at', { ascending: false }).limit(PAGE_SIZE);
      if (category && category !== 'All') query = query.eq('category', category);
      if (!reset && lastCursorRef.current) query = query.lt('created_at', lastCursorRef.current);

      const { data, error } = await query;
      if (error) throw error;

      const formattedData = (data || []).map(item => ({
        ...item,
        likes_count: item.likes_count ?? 0,
        comments_count: item.comments_count ?? 0,
        hasLiked: Array.isArray(item.written_testimony_likes) && item.written_testimony_likes.some(l => l.user_id === currentUserId)
      }));

      setTestimonies(prev => reset ? formattedData : [...prev, ...formattedData]);

      if (data?.length > 0) {
        lastCursorRef.current = data[data.length - 1].created_at;
        const moreAvailable = data.length === PAGE_SIZE;
        hasMoreRef.current = moreAvailable;
        setHasMore(moreAvailable);
      } else {
        hasMoreRef.current = false;
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error fetching testimonies:', err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [currentUserId]);

  const toggleLike = useCallback(async (testimonyId) => {
    if (!currentUserId || likeInFlight.current.has(testimonyId)) return;
    likeInFlight.current.add(testimonyId);

    let wasLiked = false;
    setTestimonies(prev => prev.map(item => {
      if (item.id !== testimonyId) return item;
      wasLiked = !!item.hasLiked;
      return { ...item, hasLiked: !wasLiked, likes_count: wasLiked ? Math.max(0, (item.likes_count || 0) - 1) : (item.likes_count || 0) + 1 };
    }));

    try {
      const { error } = wasLiked
        ? await supabase.from('written_testimony_likes').delete().eq('testimony_id', testimonyId).eq('user_id', currentUserId)
        : await supabase.from('written_testimony_likes').insert({ testimony_id: testimonyId, user_id: currentUserId });
      if (error) throw error;
    } catch (err) {
      console.error('Error toggling like:', err);
      setTestimonies(prev => prev.map(item => item.id === testimonyId
        ? { ...item, hasLiked: wasLiked, likes_count: wasLiked ? (item.likes_count || 0) + 1 : Math.max(0, (item.likes_count || 0) - 1) }
        : item));
    } finally {
      likeInFlight.current.delete(testimonyId);
    }
  }, [currentUserId]);

  return { testimonies, loading, hasMore, fetchTestimonies, toggleLike, setTestimonies };
};
