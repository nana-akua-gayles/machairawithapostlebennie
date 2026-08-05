import { useState, useCallback, useRef } from 'react';
import { supabase } from '../../config/supabaseClient';

const PAGE_SIZE = 10;

export const useWrittenTestimonies = (currentUserId) => {
  const [testimonies, setTestimonies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Use refs to prevent callback re-creations and infinite re-render loops
  const lastCursorRef = useRef(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const fetchTestimonies = useCallback(async (category = 'All', reset = false) => {
    // Prevent simultaneous fetches or pulling past end of list
    if (loadingRef.current || (!reset && !hasMoreRef.current)) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      let query = supabase
        .from('writtentestimonies')
        .select(`
          *,
          profiles:user_id ( name, avatar_url ),
          written_testimony_likes ( user_id ),
          written_testimony_comments ( id )
        `)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      // Filter by category
      if (category && category !== 'All') {
        query = query.eq('category', category);
      }

      // Apply Cursor Pagination for infinite scroll
      if (!reset && lastCursorRef.current) {
        query = query.lt('created_at', lastCursorRef.current);
      }

      const { data, error } = await query;
      if (error) throw error;

      const formattedData = (data || []).map(item => {
        const likesArr = Array.isArray(item.written_testimony_likes) ? item.written_testimony_likes : [];
        const commentsArr = Array.isArray(item.written_testimony_comments) ? item.written_testimony_comments : [];

        return {
          ...item,
          likes_count: item.likes_count ?? likesArr.length,
          comments_count: item.comments_count ?? commentsArr.length,
          hasLiked: likesArr.some(l => l.user_id === currentUserId)
        };
      });

      if (reset) {
        setTestimonies(formattedData);
      } else {
        setTestimonies(prev => [...prev, ...formattedData]);
      }

      if (data && data.length > 0) {
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

  const toggleLike = async (testimonyId, currentlyLiked) => {
    if (!currentUserId) return;

    // Optimistic UI Update
    setTestimonies(prev => prev.map(post => {
      if (post.id === testimonyId) {
        return {
          ...post,
          hasLiked: !currentlyLiked,
          likes_count: currentlyLiked ? Math.max(0, (post.likes_count || 0) - 1) : (post.likes_count || 0) + 1
        };
      }
      return post;
    }));

    if (currentlyLiked) {
      const { error } = await supabase
        .from('written_testimony_likes')
        .delete()
        .eq('testimony_id', testimonyId)
        .eq('user_id', currentUserId);

      if (error) {
        setTestimonies(prev => prev.map(post => 
          post.id === testimonyId ? { ...post, hasLiked: true, likes_count: (post.likes_count || 0) + 1 } : post
        ));
      }
    } else {
      const { error } = await supabase
        .from('written_testimony_likes')
        .insert({ testimony_id: testimonyId, user_id: currentUserId });

      if (error) {
        setTestimonies(prev => prev.map(post => 
          post.id === testimonyId ? { ...post, hasLiked: false, likes_count: Math.max(0, (post.likes_count || 0) - 1) } : post
        ));
      }
    }
  };

  return {
    testimonies,
    loading,
    hasMore,
    fetchTestimonies,
    toggleLike,
    setTestimonies
  };
};