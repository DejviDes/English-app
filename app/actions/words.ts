'use server';

import { createServerClient } from '@/lib/supabase/server';
import { assertGate } from '@/lib/gate';
import { wordItemSchema } from '@/lib/schemas/import';
import { wordContentKey } from '@/lib/import-export/dedup';

export interface AddWordResult {
  ok: boolean;
  duplicate?: boolean;
  error?: string;
}

export async function addWord(input: unknown): Promise<AddWordResult> {
  await assertGate();
  const parsed = wordItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') };
  }
  const it = parsed.data;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('words')
    .upsert(
      [
        {
          term: it.term.trim(),
          translation: it.translation.trim(),
          part_of_speech: it.part_of_speech,
          cefr_level: it.cefr_level,
          example_sentence: it.example_sentence ?? null,
          source_batch: 'manual',
          content_key: wordContentKey(it.term, it.part_of_speech),
        },
      ],
      { onConflict: 'content_key', ignoreDuplicates: true },
    )
    .select('id');
  if (error) return { ok: false, error: error.message };
  return { ok: true, duplicate: (data?.length ?? 0) === 0 };
}
