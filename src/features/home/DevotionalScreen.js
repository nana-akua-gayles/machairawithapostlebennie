import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Share, ActivityIndicator, Image, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ArrowLeft, Bookmark, Share2, Type, RotateCcw, Compass, BookOpen, Download, Hand, HandHelping, MessageSquare, Send, Trash2, User as UserIcon } from 'lucide-react-native';
import { AppText } from '../../components/AppText';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../config/supabaseClient';
import { decodeEntities, processDevotionalHtml} from './formatDevotionalHtml';
import DevotionalViewer from './DevotionalViewer';

const DEVOTIONAL_RED = '#DC2626';

export default function DevotionalScreen({ route, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { episodeId = 18613 } = route.params || {};

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [fontSizeOffset, setFontSizeOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [authorImageError, setAuthorImageError] = useState(false);
  
  const [devotionalData, setDevotionalData] = useState({
    title: '', authorName: '', authorImageUrl: null, imageUrl: null, dateString: '', episodeNumber: null,});
  const [rawHtmlContent, setRawHtmlContent] = useState('');
  const [footerCards, setFooterCards] = useState({ digDeeper: null, prayer: null, bibleReading: null, declarations: [],});

  const [currentUser, setCurrentUser] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    async function getUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUser(user);
    }
    getUserData();
  }, []);


  useEffect(() => {
    async function checkBookmarkStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !devotionalData.episodeNumber) return;

        const { data, error } = await supabase
          .from('saved_devotionals')
          .select('id')
          .eq('user_id', user.id)
          .eq('episode_number', devotionalData.episodeNumber)
          .maybeSingle();

        if (data && !error) {
          setIsBookmarked(true);
        }
      } catch (err) {
        console.error('Error checking bookmark status:', err);
      }
    }

    checkBookmarkStatus();
  }, [devotionalData.episodeNumber]);

// Fetch comments for current episode
  const fetchComments = useCallback(async (epNum) => {
    if (!epNum) return;
    try {
      setLoadingComments(true);
      const { data, error } = await supabase
        .from('devotional_comments')
        .select(`
          id, content, created_at, user_id,
          profiles ( name, avatar_url )
        `)
        .eq('episode_number', epNum)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Error fetching comments:', err.message || err);
    } finally {
      setLoadingComments(false);
    }
  }, []);

  useEffect(() => {
    if (devotionalData.episodeNumber) {
      fetchComments(devotionalData.episodeNumber);
    }
  }, [devotionalData.episodeNumber, fetchComments]);

  // Submit a new comment
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to post a comment.');
      return;
    }

    const commentText = newComment.trim();
    setNewComment('');
    setSubmittingComment(true);

    try {
      const { data, error } = await supabase
        .from('devotional_comments')
        .insert({
          user_id: currentUser.id,
          episode_number: devotionalData.episodeNumber,
          content: commentText,
        })
        .select(`
          id, content, created_at, user_id,
          profiles ( name, avatar_url )
        `)
        .single();

      if (error) throw error;
      setComments((prev) => [data, ...prev]);
    } catch (err) {
      console.error('Error submitting comment:', err.message || err);
      Alert.alert('Error', 'Unable to post comment. Please try again.');
      setNewComment(commentText);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Delete a comment
  const handleDeleteComment = async (commentId) => {
    try {
      setComments((prev) => prev.filter((c) => c.id !== commentId));

      const { error } = await supabase
        .from('devotional_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting comment:', err.message || err);
      Alert.alert('Error', 'Could not delete comment.');
      if (devotionalData.episodeNumber) fetchComments(devotionalData.episodeNumber);
    }
  };


  const handleToggleBookmark = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !devotionalData.episodeNumber) return;

      const previousState = isBookmarked;
      setIsBookmarked(!previousState); 

      if (previousState) {
        const { error } = await supabase
          .from('saved_devotionals')
          .delete()
          .eq('user_id', user.id)
          .eq('episode_number', devotionalData.episodeNumber);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saved_devotionals')
          .insert({
            user_id: user.id,
            episode_number: devotionalData.episodeNumber,
          });

        if (error) throw error;
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err.message || err);
      setIsBookmarked(isBookmarked); 
    }
  };

  const handleInternalLinkPress = useCallback((targetEpisodeId) => {
    navigation.push('Devotional', { episodeId: targetEpisodeId });
  }, [navigation]);

  const loadDevotional = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setImageError(false);
      setAuthorImageError(false);

      const targetQuery = String(episodeId);

      let { data } = await supabase
        .from('devotionals')
        .select('*')
        .eq('id', targetQuery)
        .maybeSingle();

      if (!data && !isNaN(episodeId)) {
        const resNum = await supabase
          .from('devotionals')
          .select('*')
          .eq('episode_number', parseInt(episodeId, 10))
          .maybeSingle();
        data = resNum.data;
      }

      if (!data) {
        const { data: fallbackData } = await supabase
          .from('devotionals')
          .select('*')
          .limit(1);
        data = fallbackData?.[0];
      }

      if (!data) {
        throw new Error('Devotional not found in Supabase.');
      }

      const rawContent = data.content || '';

      const stripHtmlEntities = (text) => {
        if (!text) return '';
        return text
          .replace(/<[^>]*>?/gm, '')
          .replace(/&#8211;|&ndash;/g, '-')
          .replace(/&#8212;|&mdash;/g, '—')
          .replace(/&#8216;|&#8217;|&lsquo;|&rsquo;/g, "'")
          .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&nbsp;/g, ' ')
          .trim();
      };

      let extractedTitle = data.title || data.name || data.episode_title || '';
      let extractedAuthorName = data.author || data.author_name || 'APOSTLE BENJAMIN NANA AMISSAH ANSAH';
      let extractedEpisodeNumber = data.episode_number || episodeId || null;
      
      let extractedImage = null;
      const rawColumnValue = data.image_url;
      
      if (rawColumnValue) {
        let cleanUrl = '';
        if (typeof rawColumnValue === 'string') {
          cleanUrl = rawColumnValue.trim().replace(/^["']|["']$/g, '');
        } else if (typeof rawColumnValue === 'object' && rawColumnValue.url) {
          cleanUrl = String(rawColumnValue.url).trim();
        }

        if (cleanUrl) {
          extractedImage = cleanUrl;
        }
      }

      let extractedAuthorImage = null;
      const rawAuthorImageValue = data.author_image_url || data.author_image || data.speaker_image_url;
      
      if (rawAuthorImageValue) {
        let cleanAuthorUrl = '';
        if (typeof rawAuthorImageValue === 'string') {
          cleanAuthorUrl = rawAuthorImageValue.trim().replace(/^["']|["']$/g, '');
        } else if (typeof rawAuthorImageValue === 'object' && rawAuthorImageValue.url) {
          cleanAuthorUrl = String(rawAuthorImageValue.url).trim();
        }

        if (cleanAuthorUrl) {
          extractedAuthorImage = cleanAuthorUrl;
        }
      }

      if (!extractedTitle) {
        const titleMatch = rawContent.match(/<h[34][^>]*>([\s\S]*?)<\/h[34]>/i);
        if (titleMatch && titleMatch[1]) {
          extractedTitle = titleMatch[1];
        }
      }

      extractedTitle = stripHtmlEntities(extractedTitle);

      let extractedDate = '';
      const rawDateSource = data.publish_date || data.date || data.created_at;
      if (rawDateSource) {
        const parsedDate = new Date(rawDateSource);
        if (!isNaN(parsedDate.getTime())) {
          extractedDate = parsedDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        }
      }
      
      if (!extractedDate) {
        const dateMatch = rawContent.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{1,2},?\s*\d{4}/i) ||
                          rawContent.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{1,2},?\s*\d{4}/i);
        if (dateMatch) {
          extractedDate = dateMatch[0];
        }
      }

      const extractedUpdatedDate = data.updated_at || data.updated_date ? new Date(data.updated_at || data.updated_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

      setDevotionalData({ title: extractedTitle, authorName: extractedAuthorName, authorImageUrl: extractedAuthorImage,
        imageUrl: extractedImage, dateString: extractedDate, updatedDateString: extractedUpdatedDate, episodeNumber: extractedEpisodeNumber,});

      const formattedHtml = processDevotionalHtml(rawContent, { title: extractedTitle, includeFooter: false,});

setRawHtmlContent(formattedHtml);
      let digDeeperText = null; let prayerText = null; let bibleReadingText = null; let extractedDeclarations = [];

      const digDeeperMatch = rawContent.match(/DIG\s*DEEPER([\s\S]*?)(?=WE\s*PRAY|BIBLE\s*READING|DECLARE)/i);
      if (digDeeperMatch && digDeeperMatch[1]) {
        digDeeperText = stripHtmlEntities(digDeeperMatch[1]).trim();
      }

      const prayerMatch = rawContent.match(/WE\s*PRAY([\s\S]*?)(?=BIBLE\s*READING|DECLARE)/i);
      if (prayerMatch && prayerMatch[1]) {
        prayerText = stripHtmlEntities(prayerMatch[1]).trim();
      }

      const bibleMatch = rawContent.match(/BIBLE\s*READING[^]*?(\d{3}[\s\S]*?)(?=DECLARE)/i);
      if (bibleMatch && bibleMatch[1]) {
        bibleReadingText = stripHtmlEntities(bibleMatch[1]).trim();
      } else {
        const fallbackBibleMatch = rawContent.match(/BIBLE\s*READING\s*IN\s*THE\s*YEAR\s*\d{4}\s*([^\n]+[\s\S]*?)(?=DECLARE)/i);
        if (fallbackBibleMatch && fallbackBibleMatch[1]) {
          bibleReadingText = stripHtmlEntities(fallbackBibleMatch[1]).trim();
        }
      }

      const declareMatch = rawContent.match(/DECLARE\s*THESE\s*WORDS\s*:?([\s\S]*)$/i);
      if (declareMatch && declareMatch[1]) {
        const rawDeclText = stripHtmlEntities(declareMatch[1]);
        const rawItems = rawDeclText.split(/(?=[–\-—•])/);
        
        rawItems.forEach((item) => {
          const cleaned = item.replace(/^[–\-—•\*\s:]+/, '').trim();
          if (cleaned && !extractedDeclarations.includes(cleaned)) {
            extractedDeclarations.push(cleaned);
          }
        });
      }

      setFooterCards({ digDeeper: digDeeperText || null,  prayer: prayerText || null, bibleReading: bibleReadingText || null, declarations: extractedDeclarations,});
    } catch (err) {
      console.error('Error fetching devotional:', err);
      setError('Unable to load devotional content at this time.');
    } finally {
      setLoading(false);
    }
  }, [episodeId]);

  useEffect(() => { loadDevotional();}, [loadDevotional]);

  const handleToggleFontSize = useCallback(() => {
    setFontSizeOffset((prev) => {
      if (prev === 0) return 2;
      if (prev === 2) return 4;
      return 0; });}, []);

  const handleShare = useCallback(async () => {
    try {
      const shareTitle = devotionalData.title ? `"${devotionalData.title}"` : 'Devotional';
      const episodeLabel = devotionalData.episodeNumber ? `Episode ${devotionalData.episodeNumber}` : '';
      
      const cleanExcerpt = rawHtmlContent
        .replace(/<[^>]*>?/gm, '')
        .replace(/&#8211;|&ndash;/g, '-')
        .replace(/&#8212;|&mdash;/g, '—')
        .replace(/&#8216;|&#8217;|&lsquo;|&rsquo;/g, "'")
        .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 150);

      const excerptText = cleanExcerpt ? `\n\n"${cleanExcerpt}..."` : '';

      await Share.share({
        title: devotionalData.title || 'Devotional',
        message: `Check out this devotional ${episodeLabel ? `(${episodeLabel})` : ''}: ${shareTitle}${excerptText}\n\nRead more on Machaira App!`,
      });
    } catch (err) {
      console.error(err);
    }
  }, [devotionalData, rawHtmlContent]);

  const handleDownloadPdf = useCallback(async () => {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body>
            
            <div>
              ${rawHtmlContent}
            </div>

            ${footerCards.digDeeper ? `
              <div>
                <div>DIG DEEPER</div>
                <div>${footerCards.digDeeper}</div>
              </div>
            ` : ''}

            ${footerCards.prayer ? `
              <div>
                <div>WE PRAY</div>
                <div>${footerCards.prayer}</div>
              </div>
            ` : ''}

            ${footerCards.bibleReading ? `
              <div>
                <div>BIBLE READING IN THE YEAR</div>
                <div>${footerCards.bibleReading}</div>
              </div>
            ` : ''}

            ${footerCards.declarations.length > 0 ? `
              <div>
                <div>DECLARE THESE WORDS</div>
                <div>
                  <ul>
                    ${footerCards.declarations.map(d => `<li><em>${d}</em></li>`).join('')}
                  </ul>
                </div>
              </div>
            ` : ''}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `${devotionalData.title || 'Devotional'}.pdf`,
        });
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  }, [devotionalData, rawHtmlContent, footerCards]);

  const currentBaseFontSize = 16 + fontSizeOffset;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 12), backgroundColor: colors.background, borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressedOpacity]}
          hitSlop={12}
        >
          <ArrowLeft color={colors.text} size={22} />
        </Pressable>

        <View style={styles.headerRightActions}>
          <Pressable
            onPress={handleToggleFontSize}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressedOpacity]}
            hitSlop={12}
          >
            <Type color={fontSizeOffset !== 0 ? DEVOTIONAL_RED : colors.text} size={20} />
          </Pressable>
          <Pressable
            onPress={handleToggleBookmark}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressedOpacity]}
            hitSlop={12}
          >
            <Bookmark
              color={isBookmarked ? DEVOTIONAL_RED : colors.text}
              fill={isBookmarked ? DEVOTIONAL_RED : 'transparent'}
              size={20}
            />
          </Pressable>
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressedOpacity]}
            hitSlop={12}
          >
            <Share2 color={colors.text} size={20} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={DEVOTIONAL_RED} />
          <AppText style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading devotional...
          </AppText>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <AppText type="bold" style={[styles.errorTitle, { color: colors.text }]}>
            Something went wrong
          </AppText>
          <AppText style={[styles.errorSub, { color: colors.textSecondary }]}>
            {error}
          </AppText>
          <Pressable
            onPress={loadDevotional}
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && styles.pressedOpacity,
            ]}
          >
            <RotateCcw color="#ffffff" size={16} style={styles.retryIcon} />
            <AppText type="bold" style={styles.retryText}>
              Try Again
            </AppText>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={true} 
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 140 },
          ]}
        >
          <View style={[styles.titleSection, { borderColor: colors.border }]}>
            <View style={styles.topMetaBar}>
              <Pressable 
                onPress={handleDownloadPdf}
                style={({ pressed }) => [styles.downloadPdfButton, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressedOpacity]}
                hitSlop={8}
              >
                <Download color={DEVOTIONAL_RED} size={14} style={styles.downloadIcon} />
                <AppText type="semibold" style={styles.downloadPdfText}>Download PDF</AppText>
              </Pressable>
            </View>

            <AppText 
              type="bold" 
              style={[styles.mainTitle, { color: colors.text, fontSize: 24 + fontSizeOffset }]}
            >
              {devotionalData.title}
            </AppText>

            {devotionalData.updatedDateString ? (
              <AppText style={[styles.updatedDateText, { color: colors.textSecondary }]}>
                {`Updated on ${devotionalData.updatedDateString}`}
              </AppText>
            ) : null}

            <View style={styles.authorSectionRow}>
              <View style={styles.authorBadgeRow}>
                <AppText style={[styles.byText, { color: colors.text }]}>By </AppText>
                <Image
                  source={require('../../../assets/images/Apostle1.jpg')}
                  style={[styles.authorAvatar, { borderColor: colors.border }]}
                  resizeMode="cover"
                />
                <AppText type="semibold" style={[styles.authorText, { color: colors.text }]}>
                  {devotionalData.authorName ? devotionalData.authorName.toUpperCase() : 'APOSTLE BENJAMIN NANA AMISSAH ANSAH'}
                </AppText>
              </View>
            </View>

            <View style={[styles.headerDivider, { backgroundColor: colors.border }]} />
          </View>

          <AppText 
            type="bold" 
            style={[styles.orgHeaderTitle, { color: DEVOTIONAL_RED, fontSize: 17 + fontSizeOffset }]}
          >
            CHRIST COMMONWEALTH GLOBAL
          </AppText>

          <AppText 
            type="bold" 
            style={[styles.orgSubtitleText, { color: DEVOTIONAL_RED, fontSize: 17 + fontSizeOffset }]}
          >
            Love Life Agency
          </AppText>

          <View style={styles.imageContainer}>
            <Image
              source={require('../../../assets/images/episodeBg.jpg')}
              style={styles.epBg}
              resizeMode="cover"
            />
          </View>

          <View style={styles.dateBadgeContainer}>
            <AppText style={[styles.dateBadgeText, { color: DEVOTIONAL_RED }]}>
              {devotionalData.dateString ? devotionalData.dateString.toUpperCase() : ''}
            </AppText>
          </View>

          <AppText 
            type="bold" 
            style={[styles.titleText, { color: colors.text, fontSize: 21 + fontSizeOffset, marginBottom: 11, textAlign: 'center' }]}
          >
            {devotionalData.title.replace(/^episode\s*\d+[:\s-]*|^ep\.?\s*\d+[:\s-]*/i, '').trim()}
          </AppText>
          <View style={styles.doubleLineContainer}>
            <View style={[styles.titleLine]} />
            <View style={[styles.titleLine]} />
          </View>

          <DevotionalViewer 
            htmlContent={rawHtmlContent} 
            title={devotionalData.title}
            baseFontSize={currentBaseFontSize}
            onInternalLinkPress={handleInternalLinkPress}
          />

          <View style={styles.footerContainer}>
            {footerCards.digDeeper && (
              <View style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.actionCardHeader}>
                  <Compass color={DEVOTIONAL_RED} size={18} style={styles.actionCardIcon} />
                  <AppText type="bold" style={[styles.actionCardTitle, { color: DEVOTIONAL_RED, fontSize: 13 + fontSizeOffset }]}>
                    DIG DEEPER
                  </AppText>
                </View>
                <AppText style={[styles.actionCardBody, { color: colors.textSecondary, fontSize: currentBaseFontSize - 1 }]}>
                  {footerCards.digDeeper}
                </AppText>
              </View>
            )}

            {footerCards.prayer && (
              <View style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.actionCardHeader}>
                  <HandHelping color={DEVOTIONAL_RED} size={18} style={styles.actionCardIcon} />
                  <AppText type="bold" style={[styles.actionCardTitle, { color: DEVOTIONAL_RED, fontSize: 13 + fontSizeOffset }]}>
                    WE PRAY
                  </AppText>
                </View>
                <AppText style={[styles.actionCardBody, { color: colors.textSecondary, fontSize: currentBaseFontSize - 1 }]}>
                  {footerCards.prayer}
                </AppText>
              </View>
            )}

            {footerCards.bibleReading && (
              <View style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.actionCardHeader}>
                  <BookOpen color={DEVOTIONAL_RED} size={18} style={styles.actionCardIcon} />
                  <AppText type="bold" style={[styles.actionCardTitle, { color: DEVOTIONAL_RED, fontSize: 13 + fontSizeOffset }]}>
                    BIBLE READING IN THE YEAR
                  </AppText>
                </View>
                <AppText style={[styles.actionCardBody, { color: colors.textSecondary, fontSize: currentBaseFontSize - 1 }]}>
                  {footerCards.bibleReading}
                </AppText>
              </View>
            )}

            {footerCards.declarations.length > 0 && (
              <View style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.actionCardHeader}>
                  <Hand color={DEVOTIONAL_RED} size={18} style={styles.actionCardIcon} />
                  <AppText type="bold" style={[styles.actionCardTitle, { color: DEVOTIONAL_RED, fontSize: 13 + fontSizeOffset }]}>
                    DECLARE THESE WORDS
                  </AppText>
                </View>
                <View style={styles.declarationList}>
                  {footerCards.declarations.map((decl, dIdx) => (
                    <View key={dIdx} style={styles.declarationRow}>
                      <View style={[styles.bulletIndicator, { backgroundColor: DEVOTIONAL_RED }]} />
                      <AppText type="italic" style={[styles.declarationText, { color: colors.text, fontSize: currentBaseFontSize - 1 }]}>
                        {decl}
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.commentsSection}>
              {/* Header with pill count badge */}
              <View style={styles.commentHeaderRow}>
                <View style={styles.headerTitleGroup}>
                  <View style={styles.iconCircle}>
                    <MessageSquare color={DEVOTIONAL_RED} size={18} />
                  </View>
                  <AppText type="bold" style={[styles.commentSectionTitle, { color: colors.text }]}>
                    Discussion
                  </AppText>
                </View>
                <View style={[styles.badgePill, { backgroundColor: DEVOTIONAL_RED + '15' }]}>
                  <AppText type="bold" style={{ color: DEVOTIONAL_RED, fontSize: 12 }}>
                    {comments.length}
                  </AppText>
                </View>
              </View>

              <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.commentInput, { color: colors.text }]}
                  placeholder="Share your insights..."
                  placeholderTextColor={colors.textSecondary + '80'}
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                />
                <Pressable
                  onPress={handleAddComment}
                  disabled={submittingComment || !newComment.trim()}
                  style={({ pressed }) => [
                    styles.sendButton,
                    { 
                      backgroundColor: newComment.trim() ? DEVOTIONAL_RED : colors.border,
                      transform: [{ scale: pressed ? 0.92 : 1 }] 
                    }
                  ]}
                >
                  {submittingComment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Send color="#fff" size={15} style={{ marginLeft: -2 }} />
                  )}
                </Pressable>
              </View>

              {/* Comments Feed */}
              {loadingComments ? (
                <View style={styles.loaderBox}>
                  <ActivityIndicator size="small" color={DEVOTIONAL_RED} />
                </View>
              ) : comments.length === 0 ? (
                <View style={[styles.emptyComments, { backgroundColor: colors.card + '50', borderColor: colors.border }]}>
                  <View style={styles.emptyIconCircle}>
                    <MessageSquare color={colors.textSecondary} size={22} />
                  </View>
                  <AppText type="semibold" style={{ color: colors.text, fontSize: 15, marginTop: 8 }}>
                    No responses yet
                  </AppText>
                  <AppText style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 4 }}>
                    Be the first to share how this devotional spoke to you today.
                  </AppText>
                </View>
              ) : (
                <View style={styles.commentsList}>
                  {comments.map((comment) => {
                    const authorName = comment.profiles?.name || 'Member';
                    const avatarUrl = comment.profiles?.avatar_url;
                    const isOwner = currentUser?.id === comment.user_id;
                    const formattedTime = comment.created_at
                      ? new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '';

                    return (
                      <View 
                        key={comment.id} 
                        style={[
                          styles.commentCard, 
                          { 
                            backgroundColor: colors.card, 
                            borderColor: isOwner ? DEVOTIONAL_RED + '40' : colors.border,
                            borderLeftWidth: isOwner ? 3 : 1,
                            borderLeftColor: isOwner ? DEVOTIONAL_RED : colors.border,
                          }
                        ]}
                      >
                        <View style={styles.commentTopRow}>
                          <View style={styles.userInfo}>
                            {avatarUrl ? (
                              <Image source={{ uri: avatarUrl }} style={styles.userAvatar} />
                            ) : (
                              <View style={[styles.userAvatarPlaceholder, { backgroundColor: DEVOTIONAL_RED + '15' }]}>
                                <AppText type="bold" style={{ color: DEVOTIONAL_RED, fontSize: 13 }}>
                                  {authorName.charAt(0).toUpperCase()}
                                </AppText>
                              </View>
                            )}
                            <View style={{ marginLeft: 10 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <AppText type="bold" style={{ color: colors.text, fontSize: 14 }}>
                                  {authorName}
                                </AppText>
                                {isOwner && (
                                  <View style={styles.youTag}>
                                    <AppText type="bold" style={{ color: DEVOTIONAL_RED, fontSize: 9 }}>YOU</AppText>
                                  </View>
                                )}
                              </View>
                              <AppText style={{ color: colors.textSecondary, fontSize: 11, marginTop: 1 }}>
                                {formattedTime}
                              </AppText>
                            </View>
                          </View>

                          {isOwner && (
                            <Pressable
                              onPress={() => handleDeleteComment(comment.id)}
                              hitSlop={12}
                              style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.5 }]}
                            >
                              <Trash2 size={15} color={colors.textSecondary} />
                            </Pressable>
                          )}
                        </View>
                        
                        <AppText style={[styles.commentText, { color: colors.text }]}>
                          {comment.content}
                        </AppText>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          
          
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerNavTitle: { fontSize: 16 },
  headerRightActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 4 },
  pressedOpacity: { opacity: 0.6 },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorTitle: { fontSize: 18, marginBottom: 8 },
  errorSub: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: DEVOTIONAL_RED },
  retryIcon: { marginRight: 8 },
  retryText: { color: '#ffffff' },
  scrollContent: { paddingHorizontal: 30, paddingTop: 16 },
  titleSection: { marginBottom: 24, alignItems: 'flex-start', paddingHorizontal: 4 },
  topMetaBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', width: '100%', marginBottom: 14, paddingHorizontal: 2 },
  downloadPdfButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  downloadIcon: { marginRight: 6 },
  downloadPdfText: { fontSize: 11, color: DEVOTIONAL_RED, letterSpacing: 0.5 },
  authorSectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginTop: 4 },
  authorBadgeRow: { flexDirection: 'row', alignItems: 'center' },
  authorAvatar: { width: 35, height: 35, borderRadius: 25, marginRight: 8, borderWidth: 1 },
  authorText: { fontSize: 11, letterSpacing: 1.5 },
  orgHeaderTitle: { fontSize: 17, marginBottom: 6, textAlign: 'center' },
  orgSubtitleText: { fontSize: 17, textAlign: 'center' },
  imageContainer: { width: '100%', marginVertical: 10, alignItems: 'center', marginTop: 15 },
  epBg: { width: '100%', height: 180, borderRadius: 8 },
  dateBadgeContainer: { width: '100%', marginBottom: 30, marginTop: 20, alignItems: 'flex-end' },
  dateBadgeText: { fontSize: 12, letterSpacing: 1, textAlign: 'right', fontStyle: 'italic' },
  mainTitle: { fontSize: 24, textAlign: 'left', lineHeight: 32, marginBottom: 10 },
  subtitleText: { fontSize: 15, textAlign: 'left', lineHeight: 22, marginBottom: 16 },
  updatedDateText: { fontSize: 12, marginBottom: 8 },
  byText: { fontSize: 12 },
  headerDivider: { width: 48, height: 2, borderRadius: 1, marginTop: 16, opacity: 0.3 },
  doubleLineContainer: { width: '100%' },
  titleLine: { height: 2, borderRadius: 1, width: '100%', backgroundColor: 'black', marginBottom: 3 },
  titleText: { fontSize: 21 },
  footerContainer: { marginTop: 20, gap: 14 },
  actionCard: { padding: 16, borderRadius: 12, borderWidth: 1 },
  actionCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  actionCardIcon: { marginRight: 8 },
  actionCardTitle: { fontSize: 13, letterSpacing: 0.8 },
  actionCardBody: { lineHeight: 22, marginTop: 4 },
  declarationList: { marginTop: 8, gap: 8 },
  declarationRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 },
  bulletIndicator: { width: 5, height: 5, borderRadius: 2.5, marginTop: 8, marginRight: 10 },
  declarationText: { flex: 1, lineHeight: 22 },
  commentsSection: { marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(150, 150, 150, 0.15)' },
  commentHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  headerTitleGroup: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 35, height: 35, borderRadius: 16, backgroundColor: DEVOTIONAL_RED + '12', justify: 'center', alignItems: 'center',
    marginRight: 10, padding: 6},
  commentSectionTitle: { fontSize: 18, letterSpacing: -0.3 },
  badgePill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12,},
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderRadius: 20, paddingLeft: 16, paddingRight: 6,
    paddingVertical: 6, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04,
    shadowRadius: 8, elevation: 2,},
  commentInput: { flex: 1, fontSize: 14, minHeight: 38, maxHeight: 90,  paddingTop: 6, paddingBottom: 6 },
  sendButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',  marginLeft: 8 },
  loaderBox: { paddingVertical: 24, alignItems: 'center' },
  emptyComments: { padding: 24, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  emptyIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(150, 150, 150, 0.1)',
    justifyContent: 'center', alignItems: 'center',},
  commentsList: { gap: 12 },
  commentCard: { padding: 14, borderRadius: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,},
  commentTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  userAvatar: { width: 32, height: 32, borderRadius: 16 },
  userAvatarPlaceholder: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  youTag: { backgroundColor: DEVOTIONAL_RED + '15', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, marginLeft: 6,},
  deleteBtn: { padding: 4 },
  commentText: { fontSize: 14, lineHeight: 21, letterSpacing: -0.1 },
});