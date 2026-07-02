import { describe, expect, it } from 'vitest';
import { parseImport } from './import';
import { deriveAnswerColumns, exerciseContentHash, wordContentKey } from '@/lib/import-export/dedup';

describe('parseImport', () => {
  it('accepts a valid exercises envelope', () => {
    const raw = {
      schema_version: 1,
      kind: 'exercises',
      source_batch: 'test_01',
      items: [
        {
          type: 'vocab_en_sk',
          cefr_level: 'B2',
          related_word_terms: ['put off'],
          payload: { prompt: 'put off', prompt_lang: 'en', answer_lang: 'sk', correct_answer: 'odložiť' },
        },
      ],
    };
    const parsed = parseImport(raw);
    expect(parsed.kind).toBe('exercises');
    expect(parsed.data.items).toHaveLength(1);
  });

  it('rejects extra keys (strict)', () => {
    const raw = {
      schema_version: 1,
      kind: 'words',
      source_batch: 'x',
      items: [{ term: 'a', translation: 'b', part_of_speech: 'noun', cefr_level: 'B2', bogus: 1 }],
    };
    expect(() => parseImport(raw)).toThrow();
  });

  it('rejects a fill-blank without exactly one ___', () => {
    const raw = {
      schema_version: 1,
      kind: 'exercises',
      source_batch: 'x',
      items: [
        {
          type: 'vocab_fill_blank',
          cefr_level: 'B2',
          related_word_terms: ['x'],
          payload: { sentence: 'no blank here', correct_answer: 'x' },
        },
      ],
    };
    expect(() => parseImport(raw)).toThrow();
  });

  it('rejects MC with correct_index out of range', () => {
    const raw = {
      schema_version: 1,
      kind: 'exercises',
      source_batch: 'x',
      items: [
        {
          type: 'vocab_multiple_choice',
          cefr_level: 'B1',
          related_word_terms: ['x'],
          payload: { prompt: 'p', options: ['a', 'b', 'c'], correct_index: 5 },
        },
      ],
    };
    expect(() => parseImport(raw)).toThrow();
  });
});

describe('dedup helpers', () => {
  it('word key normalizes case and trims', () => {
    expect(wordContentKey('  Put Off ', 'phrasal_verb')).toBe('put off|phrasal_verb');
  });
  it('derives MC correct answer from correct_index', () => {
    const cols = deriveAnswerColumns({
      type: 'vocab_multiple_choice',
      cefr_level: 'B1',
      payload: { prompt: 'p', options: ['a', 'b', 'c'], correct_index: 1 },
    } as never);
    expect(cols.correct_answer).toBe('b');
  });
  it('hash is stable for identical content and differs otherwise', () => {
    const p = { prompt: 'x', prompt_lang: 'en', answer_lang: 'sk', correct_answer: 'y' };
    expect(exerciseContentHash('vocab_en_sk', 'y', p)).toBe(exerciseContentHash('vocab_en_sk', 'y', p));
    expect(exerciseContentHash('vocab_en_sk', 'y', p)).not.toBe(exerciseContentHash('vocab_sk_en', 'y', p));
  });
});
