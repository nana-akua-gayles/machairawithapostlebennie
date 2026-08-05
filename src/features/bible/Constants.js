import { Dimensions } from 'react-native';

export const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const FONT_MIN = 12;
export const FONT_MAX = 26;
export const FONT_STEP = 2;
export const FONT_DEFAULT = 16;

export const ASH = {
  light: 'rgba(148, 163, 184, 0.18)',
  mid: 'rgba(100, 116, 139, 0.30)',
  border: 'rgba(100, 116, 139, 0.35)',
  highlightFill: 'rgba(53, 42, 72, 0.05)',
  highlightBorder: 'rgba(53, 42, 72, 0.55)',
};

export const STORAGE_KEYS = {
  savedVerses: '@bible_saved_verses',
  verseNotes: '@bible_verse_notes',
  highlights: '@bible_verse_highlights',
  underlines:  '@bible_verse_underlines',
  fontSize: '@bible_font_size',
};

export const OFFLINE_TRANSLATION = 'KJV';

export const KJV_BOOKS = {
  'Genesis': require('../../../assets/kjvbible/Genesis.json'),
  'Exodus': require('../../../assets/kjvbible/Exodus.json'),
  'Leviticus': require('../../../assets/kjvbible/Leviticus.json'),
  'Numbers': require('../../../assets/kjvbible/Numbers.json'),
  'Deuteronomy': require('../../../assets/kjvbible/Deuteronomy.json'),
  'Joshua': require('../../../assets/kjvbible/Joshua.json'),
  'Judges': require('../../../assets/kjvbible/Judges.json'),
  'Ruth': require('../../../assets/kjvbible/Ruth.json'),
  '1 Samuel': require('../../../assets/kjvbible/1Samuel.json'),
  '2 Samuel': require('../../../assets/kjvbible/2Samuel.json'),
  '1 Kings': require('../../../assets/kjvbible/1Kings.json'),
  '2 Kings': require('../../../assets/kjvbible/2Kings.json'),
  '1 Chronicles': require('../../../assets/kjvbible/1Chronicles.json'),
  '2 Chronicles': require('../../../assets/kjvbible/2Chronicles.json'),
  'Ezra': require('../../../assets/kjvbible/Ezra.json'),
  'Nehemiah': require('../../../assets/kjvbible/Nehemiah.json'),
  'Esther': require('../../../assets/kjvbible/Esther.json'),
  'Job': require('../../../assets/kjvbible/Job.json'),
  'Psalms': require('../../../assets/kjvbible/Psalms.json'),
  'Proverbs': require('../../../assets/kjvbible/Proverbs.json'),
  'Ecclesiastes': require('../../../assets/kjvbible/Ecclesiastes.json'),
  'Song of Solomon': require('../../../assets/kjvbible/SongofSolomon.json'),
  'Isaiah': require('../../../assets/kjvbible/Isaiah.json'),
  'Jeremiah': require('../../../assets/kjvbible/Jeremiah.json'),
  'Lamentations': require('../../../assets/kjvbible/Lamentations.json'),
  'Ezekiel': require('../../../assets/kjvbible/Ezekiel.json'),
  'Daniel': require('../../../assets/kjvbible/Daniel.json'),
  'Hosea': require('../../../assets/kjvbible/Hosea.json'),
  'Joel': require('../../../assets/kjvbible/Joel.json'),
  'Amos': require('../../../assets/kjvbible/Amos.json'),
  'Obadiah': require('../../../assets/kjvbible/Obadiah.json'),
  'Jonah': require('../../../assets/kjvbible/Jonah.json'),
  'Micah': require('../../../assets/kjvbible/Micah.json'),
  'Nahum': require('../../../assets/kjvbible/Nahum.json'),
  'Habakkuk': require('../../../assets/kjvbible/Habakkuk.json'),
  'Zephaniah': require('../../../assets/kjvbible/Zephaniah.json'),
  'Haggai': require('../../../assets/kjvbible/Haggai.json'),
  'Zechariah': require('../../../assets/kjvbible/Zechariah.json'),
  'Malachi': require('../../../assets/kjvbible/Malachi.json'),
  'Matthew': require('../../../assets/kjvbible/Matthew.json'),
  'Mark': require('../../../assets/kjvbible/Mark.json'),
  'Luke': require('../../../assets/kjvbible/Luke.json'),
  'John': require('../../../assets/kjvbible/John.json'),
  'Acts': require('../../../assets/kjvbible/Acts.json'),
  'Romans': require('../../../assets/kjvbible/Romans.json'),
  '1 Corinthians': require('../../../assets/kjvbible/1Corinthians.json'),
  '2 Corinthians': require('../../../assets/kjvbible/2Corinthians.json'),
  'Galatians': require('../../../assets/kjvbible/Galatians.json'),
  'Ephesians': require('../../../assets/kjvbible/Ephesians.json'),
  'Philippians': require('../../../assets/kjvbible/Philippians.json'),
  'Colossians': require('../../../assets/kjvbible/Colossians.json'),
  '1 Thessalonians': require('../../../assets/kjvbible/1Thessalonians.json'),
  '2 Thessalonians': require('../../../assets/kjvbible/2Thessalonians.json'),
  '1 Timothy': require('../../../assets/kjvbible/1Timothy.json'),
  '2 Timothy': require('../../../assets/kjvbible/2Timothy.json'),
  'Titus': require('../../../assets/kjvbible/Titus.json'),
  'Philemon': require('../../../assets/kjvbible/Philemon.json'),
  'Hebrews': require('../../../assets/kjvbible/Hebrews.json'),
  'James': require('../../../assets/kjvbible/James.json'),
  '1 Peter': require('../../../assets/kjvbible/1Peter.json'),
  '2 Peter': require('../../../assets/kjvbible/2Peter.json'),
  '1 John': require('../../../assets/kjvbible/1John.json'),
  '2 John': require('../../../assets/kjvbible/2John.json'),
  '3 John': require('../../../assets/kjvbible/3John.json'),
  'Jude': require('../../../assets/kjvbible/Jude.json'),
  'Revelation': require('../../../assets/kjvbible/Revelation.json'),
};