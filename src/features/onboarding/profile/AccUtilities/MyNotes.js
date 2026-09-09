import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Platform, TextInput, KeyboardAvoidingView, ScrollView, Share, StatusBar, ActivityIndicator } from 'react-native';
import { ChevronLeft, Plus, FileText, Sparkles, Check, Share2, Edit3, Trash2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { AppText } from '../../../../components/AppText';
import { supabase } from '../../../../config/supabaseClient';

const PALETTES = [
  { color: '#ef4444', bg: '#fff5f5' }, 
  { color: '#8b5cf6', bg: '#f5f3ff' }, 
];

export default function MyNotesScreen({ onBack }) {
  const [localNotes, setLocalNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  
  const richTextRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('devotional_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formatted = data.map(n => ({
        id: n.id,
        title: n.title,
        body: n.body,
        tagColor: n.tag_color,
        tagBg: n.tag_bg,
        dateStamp: n.date_stamp,
        timeStamp: n.time_stamp
      }));
      setLocalNotes(formatted);
    } catch (error) {
      console.error('Error fetching notes:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingNoteId(null); 
    setNoteTitle(''); 
    setNoteBody(''); 
    setIsReadOnly(false);
    setIsWorkspaceOpen(true);
  };

  const handleOpenNote = (note) => {
    setEditingNoteId(note.id); 
    setNoteTitle(note.title); 
    setNoteBody(note.body); 
    setIsReadOnly(true);
    setIsWorkspaceOpen(true);
  };

  const handleEditNote = (note) => {
    setEditingNoteId(note.id); 
    setNoteTitle(note.title); 
    setNoteBody(note.body); 
    setIsReadOnly(false);
    setIsWorkspaceOpen(true);
  };

  const handleSave = async () => {
    if (isReadOnly) { setIsWorkspaceOpen(false); return; }
    if (!noteTitle.trim() && !noteBody.trim()) { setIsWorkspaceOpen(false); return; }
    
    const now = new Date();
    const dStamp = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
    const tStamp = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const titleVal = noteTitle || 'Untitled';

    try {
      if (editingNoteId) {
        const { error } = await supabase
          .from('devotional_notes')
          .update({ title: titleVal, body: noteBody, date_stamp: dStamp, time_stamp: tStamp })
          .eq('id', editingNoteId);

        if (error) throw error;
      } else {
        const p = PALETTES[localNotes.length % PALETTES.length];
        const { error } = await supabase
          .from('devotional_notes')
          .insert([{ 
            title: titleVal, 
            body: noteBody, 
            tag_color: p.color, 
            tag_bg: p.bg, 
            date_stamp: dStamp, 
            time_stamp: tStamp 
          }]);

        if (error) throw error;
      }

      await fetchNotes();
      setNoteTitle(''); 
      setNoteBody(''); 
      setEditingNoteId(null); 
      setIsWorkspaceOpen(false);
    } catch (error) {
      console.error('Error saving note:', error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('devotional_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchNotes();
      
      if (editingNoteId === id) {
        setIsWorkspaceOpen(false);
        setEditingNoteId(null);
      }
    } catch (error) {
      console.error('Error deleting note:', error.message);
    }
  };

  const handleShare = async (note) => {
    try { await Share.share({ title: note.title, message: `📝 *${note.title}*\n\n${note.body.replace(/<[^>]*>?/gm, '')}` }); } 
    catch (e) { console.log(e.message); }
  };

  if (isWorkspaceOpen) {
    const plainTextBody = noteBody.replace(/<[^>]*>?/gm, '').trim();
    const wordCount = plainTextBody ? plainTextBody.split(/\s+/).length : 0;

    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
          <View style={styles.headerBar}>
            <Pressable style={styles.headerActionCircle} onPress={() => setIsWorkspaceOpen(false)}>
              <ChevronLeft color="#0f172a" size={24} />
            </Pressable>
            
            <View style={styles.workspaceHeaderActions}>
              {editingNoteId && (
                <Pressable style={[styles.headerActionCircle, styles.deleteActionCircle]} onPress={() => handleDelete(editingNoteId)}>
                  <Trash2 color="#ef4444" size={20} />
                </Pressable>
              )}
              
              {!isReadOnly ? (
                <Pressable style={[styles.headerActionCircle, styles.accentSaveButton]} onPress={handleSave}>
                  <Check color="#ffffff" size={20} />
                </Pressable>
              ) : (
                <Pressable style={styles.editToggleBadge} onPress={() => setIsReadOnly(false)}>
                  <Edit3 color="#64748b" size={14} style={{ marginRight: 4 }} />
                  <AppText type="semiBold" style={styles.editToggleText}>EDIT NOTE</AppText>
                </Pressable>
              )}
            </View>
          </View>

          <ScrollView 
            ref={scrollRef} 
            style={styles.flexScrollContainer} 
            contentContainerStyle={styles.flexScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <TextInput 
              style={styles.titleInputField} 
              placeholder="Title" 
              placeholderTextColor="#cbd5e1" 
              value={noteTitle} 
              onChangeText={setNoteTitle} 
              maxLength={60} 
              editable={!isReadOnly}
            />
            <View style={styles.titleDivider} />
            
            <RichEditor
              ref={richTextRef}
              style={styles.richTextEditor}
              useContainer={true}
              initialContentHTML={noteBody}
              onChange={(text) => setNoteBody(text)}
              disabled={isReadOnly}
              onCursorPosition={(scrollY) => {
                scrollRef.current?.scrollTo({ y: scrollY + 150, animated: true });
              }}
              placeholder="Start writing your revelation..."
              editorStyle={{
                backgroundColor: 'transparent',
                color: '#334155',
                placeholderColor: '#94a3b8',
                contentCSSText: 'font-size: 18px; line-height: 34px; color: #334155; padding-top: 10px;',
              }}
            />
          </ScrollView>

          {!isReadOnly && (
            <RichToolbar
              editor={richTextRef}
              actions={[
                actions.setBold,
                actions.setItalic,
                actions.setUnderline,
                actions.hilite,
                actions.heading1,
                actions.insertOrderedList,
              ]}
              iconTint="#334155"
              selectedIconTint="#ef4444"
              style={styles.richToolbarContainer}
            />
          )}

          <View style={[styles.wordCountBadge, isReadOnly && { bottom: 30 }]}>
            <AppText type="semiBold" style={styles.wordCountText}>{wordCount} {wordCount === 1 ? 'WORD' : 'WORDS'}</AppText>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerBar}>
          <Pressable style={styles.headerActionCircle} onPress={onBack} hitSlop={12}><ChevronLeft color="#0f172a" size={22} strokeWidth={2.2} /></Pressable>
          <AppText type="bold" style={styles.headerTitle}>My Study Notes</AppText>
          <Pressable style={[styles.headerActionCircle, styles.accentPlusButton]} onPress={handleCreateNew} hitSlop={12}><Plus color="#ffffff" size={20} strokeWidth={2.5} /></Pressable>
        </View>

        {loading ? (
          <View style={styles.emptyCanvasCenter}>
            <ActivityIndicator size="large" color="#ef4444" />
          </View>
        ) : !localNotes.length ? (
          <View style={styles.emptyCanvasCenter}>
            <View style={styles.abstractGraphicContainer}>
              <View style={styles.outerGlowRing}><View style={styles.innerIconFrame}><FileText color="#ef4444" size={32} strokeWidth={1.8} /></View></View>
              <View style={styles.sparkleFloatingIcon}><Sparkles color="#ea580c" size={14} fill="#ea580c" /></View>
            </View>
            <AppText type="bold" style={styles.mainEmptyHeading}>Your Canvas is Empty</AppText>
            <AppText type="regular" style={styles.subEmptyParagraphDescription}>Every deep revelation starts with a single sentence. Write down your inspirations before you forget.</AppText>
            <Pressable style={styles.premiumCTAButton} onPress={handleCreateNew}><Plus color="#ffffff" size={16} strokeWidth={2.5} style={{ marginRight: 6 }} /><AppText type="bold" style={styles.ctaButtonTextText}>Write Your First Note</AppText></Pressable>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.notesPopulatedContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.timelineSectionHeader}>
              <AppText type="bold" style={styles.timelineHeaderText}>TODAY</AppText>
              <View style={styles.timelineHeaderLine} />
            </View>
            {localNotes.map((note) => (
              <Pressable key={note.id} style={styles.noteListCard} onPress={() => handleOpenNote(note)}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.titleBadgeContainerDashboard, { backgroundColor: note.tagBg || '#fff5f5' }]}><AppText type="bold" style={[styles.cardNoteTitle, { color: note.tagColor || '#ef4444' }]}>{note.title}</AppText></View>
                  <View style={styles.cardActionUtilityRow}>
                    <Pressable onPress={(e) => { e.stopPropagation(); handleShare(note); }} style={styles.iconUtilityButton} hitSlop={8}><Share2 color="#94a3b8" size={16} /></Pressable>
                    <Pressable onPress={(e) => { e.stopPropagation(); handleEditNote(note); }} style={styles.iconUtilityButton} hitSlop={8}><Edit3 color="#94a3b8" size={16} /></Pressable>
                    <Pressable onPress={(e) => { e.stopPropagation(); handleDelete(note.id); }} style={styles.iconUtilityButton} hitSlop={8}><Trash2 color="#ef4444" size={16} /></Pressable>
                  </View>
                </View>
                <View style={styles.scriptureBoxHighlight}>
                  <View style={[styles.leftAccentIndicatorLine, { backgroundColor: note.tagColor || '#ef4444' }]} />
                  <View style={styles.scriptureTextContentBlock}>
                    <AppText type="regular" style={styles.cardNoteBody} numberOfLines={2} ellipsizeMode="tail">
                      {note.body.replace(/<[^>]*>?/gm, '')}
                    </AppText>
                  </View>
                </View>
                <View style={styles.cardFooterTimestampRow}>
                  <AppText type="semiBold" style={styles.cardNoteDate}>{note.dateStamp || 'TODAY'}</AppText>
                  <View style={styles.timestampDotSeparator} />
                  <AppText type="regular" style={styles.cardNoteTime}>{note.timeStamp || '12:00 PM'}</AppText>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1, backgroundColor: '#ffffff' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 12 : 16, paddingBottom: 16 },
  headerActionCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  workspaceHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deleteActionCircle: { backgroundColor: '#fee2e2' },
  accentPlusButton: { backgroundColor: '#ef4444' },
  accentSaveButton: { backgroundColor: '#10b981' },
  headerTitle: { fontSize: 18, color: '#0f172a' },
  editToggleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  editToggleText: { fontSize: 11, color: '#64748b', letterSpacing: 0.5 },
  flexScrollContainer: { flex: 1 },
  flexScrollContent: { paddingHorizontal: 32, paddingTop: 10, paddingBottom: 120 },
  titleInputField: { fontSize: 25, fontWeight: '800', color: '#0f172a', marginTop: 20, marginBottom: 7, letterSpacing: -1 },
  titleDivider: { height: 1, backgroundColor: '#cbd5e1', width: '100%', marginBottom: 12 },
  richTextEditor: { minHeight: 350, backgroundColor: 'transparent' },
  richToolbarContainer: { backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingHorizontal: 16 },
  wordCountBadge: { position: 'absolute', bottom: 65, right: 32, backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, zIndex: 10 },
  wordCountText: { fontSize: 10, color: '#ffffff', letterSpacing: 0.5 },
  emptyCanvasCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingBottom: 60 },
  abstractGraphicContainer: { position: 'relative', marginBottom: 24 },
  outerGlowRing: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#fff5f5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffe4e6' },
  innerIconFrame: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', ...Platform.select({ ios: { shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 2 } }) },
  sparkleFloatingIcon: { position: 'absolute', top: 4, right: 4, backgroundColor: '#ffedd5', padding: 5, borderRadius: 10, borderWidth: 1, borderColor: '#fed7aa' },
  mainEmptyHeading: { fontSize: 20, color: '#0f172a', marginBottom: 8, textAlign: 'center', letterSpacing: -0.2 },
  subEmptyParagraphDescription: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, paddingHorizontal: 12, marginBottom: 32 },
  premiumCTAButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 }, android: { elevation: 4 } }) },
  ctaButtonTextText: { color: '#ffffff', fontSize: 14, letterSpacing: 0.2 },
  notesPopulatedContainer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  timelineSectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 16 },
  timelineHeaderText: { fontSize: 11, color: '#64748b', letterSpacing: 1.2, fontWeight: '700' },
  timelineHeaderLine: { flex: 1, height: 1, backgroundColor: '#f1f5f9', marginLeft: 10 },
  noteListCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, padding: 16, marginBottom: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6 }, android: { elevation: 1 } }) },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleBadgeContainerDashboard: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, maxWidth: '75%' },
  cardNoteTitle: { fontSize: 11, letterSpacing: 0.2 },
  cardActionUtilityRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconUtilityButton: { padding: 2 },
  scriptureBoxHighlight: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 10, overflow: 'hidden', marginBottom: 12 },
  leftAccentIndicatorLine: { width: 4 },
  scriptureTextContentBlock: { flex: 1, padding: 12 },
  cardNoteBody: { fontSize: 14, color: '#334155', lineHeight: 22 },
  cardFooterTimestampRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
  cardNoteDate: { fontSize: 10, color: '#64748b', letterSpacing: 0.3 },
  timestampDotSeparator: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#cbd5e1', marginHorizontal: 6 },
  cardNoteTime: { fontSize: 10, color: '#94a3b8' }
});