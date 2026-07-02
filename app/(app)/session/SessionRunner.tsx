'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { submitAttempt, type SubmitResult } from '@/app/actions/attempts';
import { evaluateAnswer } from '@/lib/eval/evaluate';
import type { EvaluableExercise, ExerciseType } from '@/lib/eval/types';
import { enqueue } from '@/lib/offline/outbox';
import { AppHeader, Badge, Button, Card } from '@/components/ui/primitives';
import { ProgressBar, VerdictBanner } from '@/components/ui/feedback';
import { ChoiceOption, MatchingRow, PromptCard } from '@/components/ui/exercise';
import { Input } from '@/components/ui/forms';

export interface RunnerItem {
  exerciseId: string;
  type: string;
  payload: {
    prompt?: string;
    sentence?: string;
    hint?: string;
    options?: string[];
    correct_index?: number;
    pairs?: { left: string; right: string }[];
    correct_answer?: string;
    acceptable_answers?: string[];
  };
}

const TYPE_LABEL: Record<string, string> = {
  vocab_en_sk: 'EN → SK',
  vocab_sk_en: 'SK → EN',
  vocab_fill_blank: 'Fill blank',
  vocab_multiple_choice: 'Choose',
  vocab_matching: 'Match',
  grammar_fill_form: 'Verb form',
  grammar_choose_option: 'Grammar',
  grammar_fix_error: 'Fix error',
};

function toEvaluable(item: RunnerItem): EvaluableExercise {
  return {
    type: item.type as ExerciseType,
    correct_answer: item.payload.correct_answer ?? null,
    acceptable_answers: item.payload.acceptable_answers ?? null,
    payload: item.payload as EvaluableExercise['payload'],
  };
}

function localReveal(item: RunnerItem): string {
  const p = item.payload;
  if (item.type === 'vocab_matching') return (p.pairs ?? []).map((pr) => `${pr.left} → ${pr.right}`).join(', ');
  if (item.type === 'vocab_multiple_choice' || item.type === 'grammar_choose_option') return p.options?.[p.correct_index ?? -1] ?? p.correct_answer ?? '';
  return p.correct_answer ?? '';
}

export default function SessionRunner({ items }: { items: RunnerItem[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [picked, setPicked] = useState<number | null>(null);
  const [match, setMatch] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [pending, setPending] = useState(false);

  if (items.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <AppHeader title="Drill" onBack={() => router.push('/dashboard')} />
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px' }}>🌱</div>
          <h2 style={{ fontSize: 'var(--text-xl)', marginTop: '8px' }}>Nothing to drill</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: 'var(--text-sm)' }}>
            Import a batch of exercises to get started.
          </p>
          <div style={{ marginTop: '18px' }}>
            <Link href="/import"><Button variant="primary" size="lg" block>Go to import</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  if (index >= items.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '44px' }}>🎉</div>
          <h2 style={{ fontSize: 'var(--text-2xl)', marginTop: '8px' }}>Session complete</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: 'var(--text-sm)' }}>
            You reviewed {items.length} item{items.length === 1 ? '' : 's'}. Nice work.
          </p>
          <div style={{ marginTop: '20px' }}>
            <Button variant="primary" size="lg" block onClick={() => router.push('/dashboard')}>Back to home</Button>
          </div>
        </Card>
      </div>
    );
  }

  const item = items[index];
  const isChoice = item.type === 'vocab_multiple_choice' || item.type === 'grammar_choose_option';
  const isMatching = item.type === 'vocab_matching';
  const matchOptions = isMatching ? (item.payload.pairs ?? []).map((p) => p.right) : [];
  const promptText = isMatching ? 'Match each word to its Slovak meaning' : (item.payload.sentence ?? item.payload.prompt ?? '');

  function reset() {
    setAnswer('');
    setPicked(null);
    setMatch({});
    setResult(null);
  }
  function next() {
    reset();
    setIndex((i) => i + 1);
  }

  async function grade(value: string) {
    if (pending || !value.trim()) return;
    setPending(true);
    const attemptId = crypto.randomUUID();
    try {
      const r = await submitAttempt(item.exerciseId, value, attemptId);
      setResult(r);
    } catch {
      const local = evaluateAnswer(toEvaluable(item), value);
      try {
        await enqueue({ attemptId, exerciseId: item.exerciseId, userAnswer: value, verdict: local.verdict, reason: local.reason, createdAt: new Date().toISOString() });
      } catch {
        /* IndexedDB unavailable — feedback still shown */
      }
      setResult({ verdict: local.verdict, reason: local.reason, correctAnswer: localReveal(item), nextDueDate: '— will sync' });
    } finally {
      setPending(false);
    }
  }

  function submitMatch() {
    grade(JSON.stringify(match));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <AppHeader
        title={<span style={{ fontSize: 'var(--text-lg)' }}>Drill</span>}
        onBack={() => router.push('/dashboard')}
        right={<Badge tone="neutral">{TYPE_LABEL[item.type] ?? item.type}</Badge>}
      />
      <ProgressBar value={index + (result ? 1 : 0)} max={items.length} showLabel />

      {promptText && <PromptCard prompt={promptText} hint={item.payload.hint} />}

      {!result ? (
        <>
          {isChoice && (
            <div style={{ display: 'grid', gap: '10px' }}>
              {(item.payload.options ?? []).map((opt, i) => (
                <ChoiceOption
                  key={opt}
                  state={picked === i ? 'selected' : 'default'}
                  onClick={() => { setPicked(i); grade(opt); }}
                >
                  {opt}
                </ChoiceOption>
              ))}
            </div>
          )}
          {isMatching && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(item.payload.pairs ?? []).map((p) => (
                <MatchingRow
                  key={p.left}
                  left={p.left}
                  options={matchOptions}
                  value={match[p.left] || ''}
                  onChange={(e) => setMatch((m) => ({ ...m, [p.left]: e.target.value }))}
                />
              ))}
              <Button variant="primary" size="lg" block onClick={submitMatch} disabled={pending || (item.payload.pairs ?? []).some((p) => !match[p.left])}>
                Check
              </Button>
            </div>
          )}
          {!isChoice && !isMatching && (
            <form onSubmit={(e) => { e.preventDefault(); grade(answer); }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input placeholder="Type your answer…" value={answer} onChange={(e) => setAnswer(e.target.value)} autoFocus />
              <Button variant="primary" size="lg" block type="submit" disabled={pending || !answer.trim()}>
                {pending ? 'Checking…' : 'Check'}
              </Button>
            </form>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isChoice && (
            <div style={{ display: 'grid', gap: '10px' }}>
              {(item.payload.options ?? []).map((opt, i) => {
                let state: 'default' | 'correct' | 'wrong' = 'default';
                if (i === item.payload.correct_index) state = 'correct';
                else if (i === picked) state = 'wrong';
                return <ChoiceOption key={opt} state={state}>{opt}</ChoiceOption>;
              })}
            </div>
          )}
          {isMatching && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(item.payload.pairs ?? []).map((p) => (
                <MatchingRow key={p.left} left={p.left} options={matchOptions} value={match[p.left] || ''} state={match[p.left] === p.right ? 'correct' : 'wrong'} />
              ))}
            </div>
          )}
          <VerdictBanner verdict={result.verdict} answer={result.correctAnswer} nextReview={result.nextDueDate} />
          <Button variant={result.verdict === 'wrong' ? 'secondary' : 'primary'} size="lg" block onClick={next}>
            {index + 1 >= items.length ? 'Finish' : 'Next'}
          </Button>
        </div>
      )}
    </div>
  );
}
