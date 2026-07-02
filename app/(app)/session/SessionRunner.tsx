'use client';

import { useState } from 'react';
import { submitAttempt, type SubmitResult } from '@/app/actions/attempts';
import MatchingInput, { type MatchPair } from '@/components/exercises/MatchingInput';
import { evaluateAnswer } from '@/lib/eval/evaluate';
import type { EvaluableExercise, ExerciseType } from '@/lib/eval/types';
import { enqueue } from '@/lib/offline/outbox';

export interface RunnerItem {
  exerciseId: string;
  type: string;
  payload: {
    prompt?: string;
    sentence?: string;
    hint?: string;
    options?: string[];
    correct_index?: number;
    pairs?: MatchPair[];
    correct_answer?: string;
    acceptable_answers?: string[];
  };
}

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
  if (item.type === 'vocab_multiple_choice' || item.type === 'grammar_choose_option') {
    return p.options?.[p.correct_index ?? -1] ?? p.correct_answer ?? '';
  }
  return p.correct_answer ?? '';
}

const PROMPT_LABEL: Record<string, string> = {
  vocab_en_sk: 'Translate to Slovak',
  vocab_sk_en: 'Translate to English',
  vocab_fill_blank: 'Fill in the blank',
  grammar_fill_form: 'Put the word in the correct form',
  grammar_fix_error: 'Fix the error in the sentence',
  vocab_multiple_choice: 'Choose the correct option',
  grammar_choose_option: 'Choose the correct option',
  vocab_matching: 'Match the pairs',
};

const VERDICT_STYLE: Record<SubmitResult['verdict'], string> = {
  correct: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  almost: 'bg-amber-50 text-amber-700 ring-amber-200',
  wrong: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const VERDICT_LABEL: Record<SubmitResult['verdict'], string> = {
  correct: 'Correct',
  almost: 'Almost',
  wrong: 'Wrong',
};

function promptText(item: RunnerItem): string {
  return item.payload.sentence ?? item.payload.prompt ?? '';
}

const isChoice = (type: string) =>
  type === 'vocab_multiple_choice' || type === 'grammar_choose_option';

export default function SessionRunner({ items }: { items: RunnerItem[] }) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [pending, setPending] = useState(false);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
        <p className="text-lg font-medium text-slate-700">Nothing to drill right now.</p>
        <p className="mt-2 text-sm text-slate-500">
          Import a batch of exercises to get started.
        </p>
      </div>
    );
  }

  if (index >= items.length) {
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
        <p className="text-2xl font-semibold text-slate-800">Session complete 🎉</p>
        <p className="mt-2 text-sm text-slate-500">You reviewed {items.length} items.</p>
      </div>
    );
  }

  const item = items[index];

  async function onSubmit(value: string) {
    if (pending || !value.trim()) return;
    setPending(true);
    const attemptId = crypto.randomUUID();
    try {
      const r = await submitAttempt(item.exerciseId, value, attemptId);
      setResult(r);
    } catch {
      // Offline or server error → evaluate locally and queue for later sync.
      const local = evaluateAnswer(toEvaluable(item), value);
      try {
        await enqueue({
          attemptId,
          exerciseId: item.exerciseId,
          userAnswer: value,
          verdict: local.verdict,
          reason: local.reason,
          createdAt: new Date().toISOString(),
        });
      } catch {
        /* IndexedDB unavailable — feedback is still shown */
      }
      setResult({
        verdict: local.verdict,
        reason: local.reason,
        correctAnswer: localReveal(item),
        nextDueDate: '— will sync',
      });
    } finally {
      setPending(false);
    }
  }

  function next() {
    setResult(null);
    setAnswer('');
    setIndex((i) => i + 1);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>
          {index + 1} / {items.length}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          {PROMPT_LABEL[item.type] ?? item.type}
        </span>
      </div>

      {promptText(item) && (
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
          <p className="text-center text-2xl font-semibold text-slate-800">{promptText(item)}</p>
          {item.payload.hint && (
            <p className="mt-2 text-center text-sm text-slate-400">({item.payload.hint})</p>
          )}
        </div>
      )}

      {!result ? (
        item.type === 'vocab_matching' ? (
          <MatchingInput pairs={item.payload.pairs ?? []} disabled={pending} onSubmit={onSubmit} />
        ) : isChoice(item.type) ? (
          <div className="grid gap-3">
            {(item.payload.options ?? []).map((opt) => (
              <button
                key={opt}
                disabled={pending}
                onClick={() => onSubmit(opt)}
                className="rounded-2xl bg-white px-5 py-4 text-left text-lg font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:ring-indigo-300 active:scale-[0.99] disabled:opacity-50"
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit(answer);
            }}
            className="flex flex-col gap-3"
          >
            <input
              autoFocus
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer…"
              className="rounded-2xl bg-white px-5 py-4 text-lg text-slate-800 shadow-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button
              type="submit"
              disabled={pending || !answer.trim()}
              className="rounded-2xl bg-indigo-600 px-5 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-40"
            >
              {pending ? 'Checking…' : 'Check'}
            </button>
          </form>
        )
      ) : (
        <div className="flex flex-col gap-4">
          <div
            className={`animate-pop rounded-2xl px-5 py-4 text-center ring-1 ${VERDICT_STYLE[result.verdict]}`}
          >
            <p className="text-lg font-semibold">{VERDICT_LABEL[result.verdict]}</p>
            <p className="mt-1 text-sm">
              Answer: <span className="font-medium">{result.correctAnswer}</span>
            </p>
            <p className="mt-1 text-xs opacity-70">next review: {result.nextDueDate}</p>
          </div>
          <button
            autoFocus
            onClick={next}
            className="rounded-2xl bg-slate-800 px-5 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-slate-700 active:scale-[0.99]"
          >
            {index + 1 >= items.length ? 'Finish' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}
