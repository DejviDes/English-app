'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitAttempt } from '@/app/actions/attempts';
import { markDayPhase, markDayReviewed, markWeekReviewed } from '@/app/actions/journey';
import { evaluateAnswer } from '@/lib/eval/evaluate';
import type { EvaluableExercise, ExerciseType } from '@/lib/eval/types';
import { enqueue } from '@/lib/offline/outbox';
import type { Lesson, LessonQuestion } from '@/lib/repos/journey';
import { AppHeader, Badge, Button, Card } from '@/components/ui/primitives';
import { ProgressBar, VerdictBanner } from '@/components/ui/feedback';
import { ChoiceOption, PromptCard } from '@/components/ui/exercise';
import { Input } from '@/components/ui/forms';

type Payload = {
  prompt?: string;
  sentence?: string;
  hint?: string;
  options?: string[];
  correct_index?: number;
  correct_answer?: string;
  acceptable_answers?: string[];
};

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function toEvaluable(q: LessonQuestion): EvaluableExercise {
  const p = q.payload as Payload;
  return {
    type: q.type as ExerciseType,
    correct_answer: p.correct_answer ?? null,
    acceptable_answers: p.acceptable_answers ?? null,
    payload: q.payload as EvaluableExercise['payload'],
  };
}

interface Result {
  verdict: 'correct' | 'almost' | 'wrong';
  ok: boolean;
}

export default function LessonRunner({ lesson }: { lesson: Lesson }) {
  const router = useRouter();
  const phaseCount = lesson.phases.length;
  const [intro, setIntro] = useState(true);
  const [phaseIdx, setPhaseIdx] = useState(Math.min(lesson.startPhase, phaseCount));
  const [queue, setQueue] = useState<LessonQuestion[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [pending, setPending] = useState(false);
  const [finished, setFinished] = useState(lesson.startPhase >= phaseCount);

  // (Re)initialize the queue when a phase starts; skip empty phases.
  /* eslint-disable react-hooks/set-state-in-effect -- queue (re)init per phase */
  useEffect(() => {
    if (intro || finished || phaseIdx >= lesson.phases.length) return;
    const items = lesson.phases[phaseIdx]?.items ?? [];
    if (items.length === 0) {
      if (lesson.mode === 'day-learn') markDayPhase(lesson.id, phaseIdx + 1).catch(() => {});
      if (phaseIdx >= lesson.phases.length - 1) {
        if (lesson.mode === 'day-review') markDayReviewed(lesson.id).catch(() => {});
        else if (lesson.mode === 'week-review') markWeekReviewed(lesson.id).catch(() => {});
        setFinished(true);
      } else {
        setPhaseIdx(phaseIdx + 1);
      }
      return;
    }
    setQueue(shuffle([...items]));
  }, [phaseIdx, intro, finished, lesson]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function finish() {
    if (lesson.mode === 'day-review') markDayReviewed(lesson.id).catch(() => {});
    else if (lesson.mode === 'week-review') markWeekReviewed(lesson.id).catch(() => {});
    setFinished(true);
  }

  // ---- Intro: show the words we'll do ----
  if (intro && !finished) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <AppHeader title={lesson.title} onBack={() => router.push('/dashboard')} />
        <Card padding="md">
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: '12px' }}>
            {lesson.words.length} words{lesson.theme ? ` · ${lesson.theme.replace(/_/g, ' ').toLowerCase()}` : ''} — take a look, then start:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '52vh', overflowY: 'auto' }}>
            {lesson.words.map((w) => (
              <div key={w.en} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 10px', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontWeight: 'var(--fw-bold)', color: 'var(--text-strong)' }}>{w.en}</span>
                <span style={{ color: 'var(--text-muted)', textAlign: 'right' }}>{w.sk}</span>
              </div>
            ))}
          </div>
        </Card>
        <Button variant="primary" size="lg" block onClick={() => setIntro(false)}>
          Start
        </Button>
      </div>
    );
  }

  if (finished) {
    const trophy = lesson.mode === 'week-review' || lesson.weekEnd;
    const done =
      lesson.mode === 'day-review'
        ? `Day ${lesson.id} reviewed!`
        : lesson.mode === 'week-review'
          ? `Week ${lesson.id} reviewed!`
          : `Day ${lesson.id} complete!`;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '52px' }}>{trophy ? '🏆' : '🎉'}</div>
          <h2 style={{ fontSize: 'var(--text-2xl)', marginTop: '8px' }}>{done}</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: 'var(--text-sm)' }}>Great work — everything mastered.</p>
          <div style={{ marginTop: '20px' }}>
            <Button variant="primary" size="lg" block onClick={() => router.push('/dashboard')}>
              Back to the map
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const phase = lesson.phases[phaseIdx];
  const total = phase.items.length;
  const mastered = total - queue.length;
  const current = queue[0];
  const isMC = current && (current.type === 'vocab_multiple_choice' || current.type === 'grammar_choose_option');

  async function grade(value: string) {
    if (pending || !current) return;
    if (!isMC && !value.trim()) return;
    setPending(true);
    const attemptId = crypto.randomUUID();
    try {
      const r = await submitAttempt(current.exerciseId, value, attemptId);
      setResult({ verdict: r.verdict, ok: r.verdict !== 'wrong' });
    } catch {
      const local = evaluateAnswer(toEvaluable(current), value);
      try {
        await enqueue({ attemptId, exerciseId: current.exerciseId, userAnswer: value, verdict: local.verdict, reason: local.reason, createdAt: new Date().toISOString() });
      } catch {
        /* offline queue unavailable */
      }
      setResult({ verdict: local.verdict, ok: local.verdict !== 'wrong' });
    } finally {
      setPending(false);
    }
  }

  function next() {
    if (!result) return;
    const wasOk = result.ok;
    const [head, ...rest] = queue;
    const newQueue = wasOk ? rest : [...rest, head];
    setResult(null);
    setPicked(null);
    setAnswer('');
    if (newQueue.length === 0) {
      if (lesson.mode === 'day-learn') markDayPhase(lesson.id, phaseIdx + 1).catch(() => {});
      if (phaseIdx >= phaseCount - 1) finish();
      else setPhaseIdx(phaseIdx + 1);
    } else {
      setQueue(newQueue);
    }
  }

  if (!current) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>;
  }

  const p = current.payload as Payload;
  const promptText = p.sentence ?? p.prompt ?? '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <AppHeader
        title={<span style={{ fontSize: 'var(--text-lg)' }}>{lesson.title}</span>}
        onBack={() => router.push('/dashboard')}
        right={<Badge tone="neutral">{phase.label}</Badge>}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-faint)', fontWeight: 'var(--fw-bold)' }}>
          <span>{phaseCount > 1 ? `Phase ${phaseIdx + 1}/${phaseCount} · ` : ''}{phase.hint}</span>
          <span>{mastered}/{total}</span>
        </div>
        <ProgressBar value={mastered} max={total} />
      </div>

      <PromptCard prompt={promptText} hint={p.hint} />

      {!result ? (
        isMC ? (
          <div style={{ display: 'grid', gap: '10px' }}>
            {(p.options ?? []).map((opt, i) => (
              <ChoiceOption key={opt} state={picked === i ? 'selected' : 'default'} onClick={() => { setPicked(i); grade(opt); }}>
                {opt}
              </ChoiceOption>
            ))}
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); grade(answer); }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input placeholder="Type your answer…" value={answer} onChange={(e) => setAnswer(e.target.value)} autoFocus />
            <Button variant="primary" size="lg" block type="submit" disabled={pending || !answer.trim()}>
              {pending ? 'Checking…' : 'Check'}
            </Button>
          </form>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isMC && (
            <div style={{ display: 'grid', gap: '10px' }}>
              {(p.options ?? []).map((opt, i) => {
                let state: 'default' | 'correct' | 'wrong' = 'default';
                if (i === p.correct_index) state = 'correct';
                else if (i === picked) state = 'wrong';
                return <ChoiceOption key={opt} state={state}>{opt}</ChoiceOption>;
              })}
            </div>
          )}
          <VerdictBanner verdict={result.verdict} en={current.en} sk={current.sk} />
          <Button variant={result.ok ? 'primary' : 'secondary'} size="lg" block onClick={next}>
            {queue.length <= 1 && result.ok ? 'Finish' : 'Next'}
          </Button>
        </div>
      )}
    </div>
  );
}
