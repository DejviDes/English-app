'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitAttempt, type SubmitResult } from '@/app/actions/attempts';
import { completeGrammarLevel } from '@/app/actions/grammar';
import { evaluateAnswer } from '@/lib/eval/evaluate';
import type { EvaluableExercise, ExerciseType } from '@/lib/eval/types';
import { enqueue } from '@/lib/offline/outbox';
import type { GrammarLesson, GrammarRunnerItem } from '@/lib/repos/grammar';
import { AppHeader, Badge, Button, Card } from '@/components/ui/primitives';
import { ProgressBar, VerdictBanner } from '@/components/ui/feedback';
import { ChoiceOption, PromptCard } from '@/components/ui/exercise';
import { Input } from '@/components/ui/forms';

const INSTRUCTION: Record<string, string> = {
  grammar_choose_option: 'Vyber správnu možnosť',
  grammar_fill_form: 'Doplň sloveso v správnom tvare',
  grammar_fix_error: 'Nájdi a oprav chybu vo vete',
};

const footerStyle: React.CSSProperties = {
  position: 'sticky',
  bottom: 'calc(72px + env(safe-area-inset-bottom))',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  paddingTop: '14px',
  background: 'linear-gradient(to top, var(--bg-app) 78%, transparent)',
};

function toEvaluable(item: GrammarRunnerItem): EvaluableExercise {
  return {
    type: item.type as ExerciseType,
    correct_answer: item.payload.correct_answer ?? null,
    acceptable_answers: item.payload.acceptable_answers ?? null,
    payload: item.payload as EvaluableExercise['payload'],
  };
}

function localReveal(item: GrammarRunnerItem): string {
  const p = item.payload;
  if (item.type === 'grammar_choose_option') return p.options?.[p.correct_index ?? -1] ?? p.correct_answer ?? '';
  return p.correct_answer ?? '';
}

export default function GrammarRunner({ lesson }: { lesson: GrammarLesson }) {
  const router = useRouter();
  const items = lesson.items;
  const backHref = `/grammar/${lesson.topicSlug}`;

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [pending, setPending] = useState(false);
  const [counts, setCounts] = useState({ correct: 0, almost: 0, wrong: 0 });
  const [saved, setSaved] = useState(false);

  const answered = counts.correct + counts.almost + counts.wrong;
  const finished = items.length > 0 && index >= items.length;

  useEffect(() => {
    if (finished && answered > 0 && !saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaved(true);
      completeGrammarLevel(lesson.levelId, counts.correct + counts.almost, answered).catch(() => {});
    }
  }, [finished, answered, saved, counts, lesson.levelId]);

  if (finished) {
    const score = answered ? Math.round(((counts.correct + counts.almost * 0.5) / answered) * 100) : 0;
    const tone = score >= 80 ? 'correct' : score >= 50 ? 'almost' : 'wrong';
    const emoji = score >= 80 ? '🎉' : score >= 50 ? '💪' : '📚';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '44px' }}>{emoji}</div>
          <h2 style={{ fontSize: 'var(--text-2xl)', marginTop: '8px' }}>Level dokončený</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '2px', fontSize: 'var(--text-sm)' }}>
            {lesson.topicName} · {lesson.skTitle ?? lesson.title}
          </p>
          <p style={{ fontSize: '56px', fontWeight: 'var(--fw-black)', color: 'var(--text-strong)', lineHeight: 1, marginTop: '10px' }}>{score}%</p>
          <div style={{ marginTop: '14px' }}>
            <ProgressBar value={score} max={100} tone={tone} height={12} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
            <Badge tone="correct" size="sm">✓ {counts.correct}</Badge>
            <Badge tone="almost" size="sm">✨ {counts.almost}</Badge>
            <Badge tone="wrong" size="sm">✗ {counts.wrong}</Badge>
          </div>
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Button variant="primary" size="lg" block onClick={() => router.push(backHref)}>Späť na čas</Button>
            <Button variant="secondary" size="lg" block onClick={() => router.push('/learn/grammar')}>Gramatika</Button>
          </div>
        </Card>
      </div>
    );
  }

  const item = items[index];
  const isChoice = item.type === 'grammar_choose_option';
  const promptText = isChoice ? (item.payload.prompt ?? '') : (item.payload.sentence ?? '');

  function reset() {
    setAnswer('');
    setPicked(null);
    setResult(null);
  }
  function next() {
    reset();
    setIndex((i) => i + 1);
  }

  async function grade(value: string, allowEmpty = false) {
    if (pending) return;
    if (!allowEmpty && !value.trim()) return;
    setPending(true);
    const attemptId = crypto.randomUUID();
    try {
      const r = await submitAttempt(item.exerciseId, value, attemptId);
      setResult(r);
      setCounts((c) => ({ ...c, [r.verdict]: c[r.verdict] + 1 }));
    } catch {
      const local = evaluateAnswer(toEvaluable(item), value);
      try {
        await enqueue({ attemptId, exerciseId: item.exerciseId, userAnswer: value, verdict: local.verdict, reason: local.reason, createdAt: new Date().toISOString() });
      } catch {
        /* IndexedDB unavailable — feedback still shown */
      }
      setResult({ verdict: local.verdict, reason: local.reason, correctAnswer: localReveal(item), nextDueDate: '— will sync' });
      setCounts((c) => ({ ...c, [local.verdict]: c[local.verdict] + 1 }));
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <AppHeader
        title={<span style={{ fontSize: 'var(--text-lg)' }}>{lesson.topicName}</span>}
        onBack={() => router.push(backHref)}
        right={<Badge tone="primary">{lesson.skTitle ?? lesson.title}</Badge>}
      />
      <ProgressBar value={index + (result ? 1 : 0)} max={items.length} showLabel />

      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-bold)', color: 'var(--text-muted)', textAlign: 'center' }}>
        {INSTRUCTION[item.type] ?? ''}
      </p>
      {promptText && <PromptCard prompt={promptText} hint={item.payload.hint} />}

      {!result ? (
        <>
          {isChoice ? (
            <div style={{ display: 'grid', gap: '10px' }}>
              {(item.payload.options ?? []).map((opt, i) => (
                <ChoiceOption key={opt} state={picked === i ? 'selected' : 'default'} onClick={() => { setPicked(i); grade(opt); }}>
                  {opt}
                </ChoiceOption>
              ))}
            </div>
          ) : (
            <form id="grammar-form" onSubmit={(e) => { e.preventDefault(); grade(answer); }}>
              <Input placeholder={item.type === 'grammar_fix_error' ? 'Napíš opravenú vetu…' : 'Napíš tvar…'} value={answer} onChange={(e) => setAnswer(e.target.value)} autoFocus autoCapitalize="off" autoCorrect="off" />
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
          <VerdictBanner verdict={result.verdict} answer={result.correctAnswer} />
        </div>
      )}

      <div style={footerStyle}>
        {!result ? (
          <>
            {!isChoice && (
              <Button variant="primary" size="lg" block type="submit" form="grammar-form" disabled={pending || !answer.trim()}>
                {pending ? 'Kontrolujem…' : 'Skontrolovať'}
              </Button>
            )}
            <Button variant="ghost" onClick={() => grade('', true)} disabled={pending} style={{ alignSelf: 'center' }}>
              Neviem — ukáž odpoveď
            </Button>
          </>
        ) : (
          <Button variant={result.verdict === 'wrong' ? 'secondary' : 'primary'} size="lg" block onClick={next}>
            {index + 1 >= items.length ? 'Dokončiť' : 'Ďalej'}
          </Button>
        )}
      </div>
    </div>
  );
}
