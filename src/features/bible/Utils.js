export const cleanVerseText = (rawText) => {
  if (!rawText) return '';
  return rawText
    .replace(/<[^>]*>/g, '')
    .replace(/\[[^\]]{0,10}\]/g, '') 
    .replace(/¶/g, '')  
    .replace(/\u00a0/g, ' ') 
    .replace(/\u00ad/g, '') 
    .replace(/[\u0080-\u009f]/g, '') 
    .replace(/[\u2018\u2019]/g, "'") 
    .replace(/[\u201c\u201d]/g, '"') 
    .replace(/\s+/g, ' ')
    .trim();
};

export const getChapterKey = (bookName, chapter) => `${bookName}_Ch${chapter}`;
export const getVerseKey = (bookName, chapter, verse) => `${getChapterKey(bookName, chapter)}_V${verse}`;
export const getHighlightKey = (bookName, chapter, verse) => `${bookName}_${chapter}_${verse}`;