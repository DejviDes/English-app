export const DICT_PAGE = 50;

export type WordStatus = 'new' | 'learning' | 'daily' | 'review' | 'weekly';

export interface DictRow {
  id: string;
  term: string; // EN
  translation: string; // SK
  theme: string | null;
  cefr: string | null;
  pos: string;
  status: WordStatus;
}
