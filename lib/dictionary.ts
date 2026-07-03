export const DICT_PAGE = 50;

export interface DictRow {
  id: string;
  term: string; // EN
  translation: string; // SK
  theme: string | null;
  cefr: string | null;
  pos: string;
}
