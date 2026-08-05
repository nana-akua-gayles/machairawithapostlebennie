// Base API URL
const WP_BASE_URL = 'https://machairawithapostlebennie.org/wp-json/wp/v2'; 
// Note: If that domain redirects or doesn't return data, try:
// const WP_BASE_URL = 'https://christcommonwealth.org/wp-json/wp/v2';

/**
 * Utility to strip HTML tags from WordPress post content/excerpt strings
 */
const stripHtml = (html = '') => {
  return html.replace(/<[^>]*>?/gm, '').trim();
};

/**
 * Fetch the latest list of Devotionals / Posts
 */
export const fetchLatestDevotionals = async (page = 1, perPage = 10) => {
  try {
    const response = await fetch(
      `${WP_BASE_URL}/posts?_embed=1&page=${page}&per_page=${perPage}`
    );
    if (!response.ok) throw new Error('Failed to fetch posts');
    
    const posts = await response.json();
    
    return posts.map(post => ({
      id: String(post.id),
      title: stripHtml(post.title?.rendered),
      rawContent: post.content?.rendered,
      excerpt: stripHtml(post.excerpt?.rendered),
      date: new Date(post.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      featuredImage: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
      webUrl: post.link,
    }));
  } catch (error) {
    console.error('wpService error [fetchLatestDevotionals]:', error);
    throw error;
  }
};

/**
 * Fetch a single Devotional by Post ID
 */
export const fetchDevotionalById = async (postId) => {
  try {
    const response = await fetch(`${WP_BASE_URL}/posts/${postId}?_embed=1`);
    if (!response.ok) throw new Error(`Post ${postId} not found`);
    
    const post = await response.json();
    
    return {
      id: String(post.id),
      title: stripHtml(post.title?.rendered),
      content: post.content?.rendered,
      date: new Date(post.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      featuredImage: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
      webUrl: post.link,
    };
  } catch (error) {
    console.error('wpService error [fetchDevotionalById]:', error);
    throw error;
  }
};