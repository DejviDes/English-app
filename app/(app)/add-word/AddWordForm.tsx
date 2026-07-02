'use client';

import { useState } from 'react';
import { addWord } from '@/app/actions/words';
import { AppHeader, Button, Card } from '@/components/ui/primitives';
import { InlineMessage } from '@/components/ui/feedback';
import { Input, Select, Textarea } from '@/components/ui/forms';

const POS = ['noun', 'verb', 'adjective', 'adverb', 'phrase', 'phrasal_verb', 'idiom', 'other'];
const CEFR = ['A2', 'B1', 'B2', 'C1'];

export default function AddWordForm() {
  const [term, setTerm] = useState('');
  const [translation, setTranslation] = useState('');
  const [pos, setPos] = useState('noun');
  const [cefr, setCefr] = useState('B2');
  const [example, setExample] = useState('');
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    try {
      const r = await addWord({ term, translation, part_of_speech: pos, cefr_level: cefr, example_sentence: example || null });
      if (r.ok) {
        setMsg({ ok: true, text: r.duplicate ? 'Already existed (skipped).' : `Added “${term}”.` });
        if (!r.duplicate) { setTerm(''); setTranslation(''); setExample(''); }
      } else {
        setMsg({ ok: false, text: r.error ?? 'Failed.' });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <AppHeader title="Add word" subtitle="Build your deck by hand" />
      <Card padding="md">
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input label="Term (EN)" placeholder="leverage" value={term} onChange={(e) => { setTerm(e.target.value); setMsg(null); }} />
          <Input label="Translation (SK)" placeholder="páka, vplyv" value={translation} onChange={(e) => setTranslation(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select label="Part of speech" options={POS} value={pos} onChange={(e) => setPos(e.target.value)} />
            <Select label="Level" options={CEFR} value={cefr} onChange={(e) => setCefr(e.target.value)} />
          </div>
          <Textarea label="Example (optional)" rows={2} placeholder="They used their position as leverage." value={example} onChange={(e) => setExample(e.target.value)} />
          <Button variant="primary" size="lg" block type="submit" disabled={pending || !term.trim() || !translation.trim()}>
            {pending ? 'Saving…' : 'Add word'}
          </Button>
          {msg && (
            <InlineMessage tone={msg.ok ? 'success' : 'error'} title={msg.text} />
          )}
        </form>
      </Card>
    </div>
  );
}
