import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Platform, TextInput, KeyboardAvoidingView, ScrollView, Share, StatusBar } from 'react-native';
import { ArrowLeft, Plus, FileText, Sparkles, Check, Share2, Edit3 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../../../components/AppText';

const PALETTES = [
  { color: '#ef4444', bg: '#fff5f5' }, 
  { color: '#8b5cf6', bg: '#f5f3ff' }, 
];

export default function MyNotesScreen({ notes = [], onBack, onSaveNote }) {
  const [localNotes, setLocalNotes] = useState(notes);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');

  const currentPalette = editingNoteId 
    ? (localNotes.find(n => n.id === editingNoteId) || PALETTES[0])
    : PALETTES[localNotes.length % PALETTES.length];

  const handleCreateNew = () => {
    setEditingNoteId(null); setNoteTitle(''); setNoteBody(''); setIsWorkspaceOpen(true);
  };

  const handleEditNote = (note) => {
    setEditingNoteId(note.id); setNoteTitle(note.title); setNoteBody(note.body); setIsWorkspaceOpen(true);
  };

  const handleSave = () => {
    if (!noteTitle.trim() && !noteBody.trim()) { setIsWorkspaceOpen(false); return; }
    const now = new Date();
    const dStamp = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
    const tStamp = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (editingNoteId) {
      const updated = localNotes.map(n => n.id === editingNoteId ? { ...n, title: noteTitle || 'Untitled', body: noteBody, dateStamp: dStamp, timeStamp: tStamp } : n);
      setLocalNotes(updated); if (onSaveNote) onSaveNote(updated);
    } else {
      const p = PALETTES[localNotes.length % PALETTES.length];
      const updated = [{ id: Date.now().toString(), title: noteTitle || 'Untitled', body: noteBody, dateStamp: dStamp, timeStamp: tStamp, tagColor: p.color, tagBg: p.bg }, ...localNotes];
      setLocalNotes(updated); if (onSaveNote) onSaveNote(updated);
    }
    setNoteTitle(''); setNoteBody(''); setEditingNoteId(null); setIsWorkspaceOpen(false);
  };

  const handleShare = async (note) => {
    try { await Share.share({ title: note.title, message: `📝 *${note.title}*\n\n${note.body}\n\n_${note.dateStamp} at ${note.timeStamp}_` }); } 
    catch (e) { console.log(e.message); }
  };

  if (isWorkspaceOpen) {
  const wordCount = noteBody.trim() ? noteBody.trim().split(/\s+/).length : 0;
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.headerBar}>
          <Pressable style={styles.headerActionCircle} onPress={() => setIsWorkspaceOpen(false)}><ArrowLeft color="#0f172a" size={24} /></Pressable>
          <Pressable style={[styles.headerActionCircle, styles.accentSaveButton]} onPress={handleSave}><Check color="#ffffff" size={20} /></Pressable>
        </View>

        <ScrollView style={styles.editorWorkspace} showsVerticalScrollIndicator={false}>
          <TextInput 
            style={styles.titleInputField} 
            placeholder="Title" 
            placeholderTextColor="#cbd5e1" 
            value={noteTitle} 
            onChangeText={setNoteTitle} 
            maxLength={60} 
          />
          
        <View style={styles.titleDivider} />
          <TextInput 
            style={styles.bodyInputField} 
            placeholder="Start writing your revelation..." 
            placeholderTextColor="#94a3b8" 
            value={noteBody} 
            onChangeText={setNoteBody} 
            multiline 
            textAlignVertical="top" 
          />
        </ScrollView>

        {/* Floating Word Count Badge */}
        <View style={styles.wordCountBadge}>
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
          <Pressable style={styles.headerActionCircle} onPress={onBack} hitSlop={12}><ArrowLeft color="#0f172a" size={22} strokeWidth={2.2} /></Pressable>
          <AppText type="bold" style={styles.headerTitle}>My Study Notes</AppText>
          <Pressable style={[styles.headerActionCircle, styles.accentPlusButton]} onPress={handleCreateNew} hitSlop={12}><Plus color="#ffffff" size={20} strokeWidth={2.5} /></Pressable>
        </View>

        {!localNotes.length ? (
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
              <View key={note.id} style={styles.noteListCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.titleBadgeContainerDashboard, { backgroundColor: note.tagBg || '#fff5f5' }]}><AppText type="bold" style={[styles.cardNoteTitle, { color: note.tagColor || '#ef4444' }]}>{note.title}</AppText></View>
                  <View style={styles.cardActionUtilityRow}>
                    <Pressable onPress={() => handleShare(note)} style={styles.iconUtilityButton} hitSlop={8}><Share2 color="#94a3b8" size={16} /></Pressable>
                    <Pressable onPress={() => handleEditNote(note)} style={styles.iconUtilityButton} hitSlop={8}><Edit3 color="#94a3b8" size={16} /></Pressable>
                  </View>
                </View>
                <View style={styles.scriptureBoxHighlight}>
                  <View style={[styles.leftAccentIndicatorLine, { backgroundColor: note.tagColor || '#ef4444' }]} />
                  <View style={styles.scriptureTextContentBlock}>
                    <AppText type="regular" style={styles.cardNoteBody} numberOfLines={2} ellipsizeMode="tail">{note.body}</AppText>
                  </View>
                </View>
                <View style={styles.cardFooterTimestampRow}>
                  <AppText type="semiBold" style={styles.cardNoteDate}>{note.dateStamp || 'TODAY'}</AppText>
                  <View style={styles.timestampDotSeparator} />
                  <AppText type="regular" style={styles.cardNoteTime}>{note.timeStamp || '12:00 PM'}</AppText>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
  },
  container: { flex: 1, backgroundColor: '#ffffff' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 12 : 16, paddingBottom: 16 },
  headerActionCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  accentPlusButton: { backgroundColor: '#ef4444' },
  accentSaveButton: { backgroundColor: '#10b981' },
  headerActionCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  editorWorkspace: { flex: 1, paddingHorizontal: 32, paddingTop: 10 },
  titleInputField: { fontSize: 25, fontWeight: '800', color: '#0f172a', marginTop: 20, marginBottom: 7, letterSpacing: -1 },
  titleDivider: { height: 1, backgroundColor: '#818897', width: '100%'},
  bodyInputField: { fontSize: 18, lineHeight: 34, color: '#334155', fontFamily: 'Montserrat-Regular', minHeight: 400},
  wordCountBadge: { position: 'absolute', bottom: 30, right: 32, backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,},
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