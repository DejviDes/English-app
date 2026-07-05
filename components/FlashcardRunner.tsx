'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { completeLevel, saveLevelState, type RemainingItem } from '@/app/actions/levels';
import type { FlashLesson } from '@/lib/repos/levels';
import { AppHeader, Badge, Button, Card } from '@/components/ui/primitives';
import { ProgressBar } from '@/components/ui/feedback';
import { SpeakButton } from '@/components/SpeakButton';

// Flashcard table runner: self-rated reveal, EN pronunciation + IPA, resumable.
type Rating = 'knew' | 'almost' | 'didnt';

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Build the next pass: "almost" first, then "didn't", each shuffled (new order). */
function buildTable(remaining: RemainingItem[]): string[] {
  const almost = shuffle(remaining.filter((x) => x.r === 'almost').map((x) => x.id));
  const didnt = shuffle(remaining.filter((x) => x.r === 'didnt').map((x) => x.id));
  const fresh = shuffle(remaining.filter((x) => x.r == null).map((x) => x.id));
  return [...almost, ...didnt, ...fresh];
}

const EyeIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const RATING_META: Record<Rating, { label: string; bg: string; fg: string; ring: string }> = {
  knew: { label: 'Vedel', bg: 'var(--correct-bg)', fg: 'var(--correct-fg)', ring: 'var(--correct-ring)' },
  almost: { label: 'Skoro', bg: 'var(--almost-bg)', fg: 'var(--almost-fg)', ring: 'var(--almost-ring)' },
  didnt: { label: 'Nevedel', bg: 'var(--wrong-bg)', fg: 'var(--wrong-fg)', ring: 'var(--wrong-ring)' },
};

export default function FlashcardRunner({ lesson }: { lesson: FlashLesson }) {
  const router = useRouter();
  const wordById = useMemo(() => new Map(lesson.words.map((w) => [w.id, w])), [lesson.words]);
  const allRemaining = (): RemainingItem[] => lesson.words.map((w) => ({ id: w.id, r: null }));

  const [direction, setDirection] = useState(lesson.direction);
  const [remaining, setRemaining] = useState<RemainingItem[]>(
    lesson.remaining.length > 0 ? lesson.remaining : allRemaining(),
  );
  const [table, setTable] = useState<string[]>(() =>
    buildTable(lesson.remaining.length > 0 ? lesson.remaining : lesson.words.map((w) => ({ id: w.id, r: null }))),
  );
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [rated, setRated] = useState<Record<string, Rating>>({});
  const [completed, setCompleted] = useState(lesson.completed);

  if (completed) {
    const trophy = lesson.kind === 'review';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '52px' }}>{trophy ? '🏆' : '🎉'}</div>
          <h2 style={{ fontSize: 'var(--text-2xl)', marginTop: '8px' }}>{lesson.title} complete!</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: 'var(--text-sm)' }}>
            You knew every word both ways. Nice.
          </p>
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {lesson.nextN != null && (
              <Button variant="primary" size="lg" block onClick={() => router.push(`/level/${lesson.nextN}`)}>
                Ďalší level →
              </Button>
            )}
            <Button variant={lesson.nextN != null ? 'secondary' : 'primary'} size="lg" block onClick={() => router.push('/learn/vocabulary')}>
              Späť na levely
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const ratedCount = table.filter((id) => rated[id]).length;
  const allRated = ratedCount === table.length && table.length > 0;
  const dirLabel = direction === 0 ? 'EN → SK' : 'SK → EN';
  const dirHint = direction === 0 ? 'Recall the Slovak' : 'Recall the English';

  function rate(id: string, rating: Rating) {
    setRated((prev) => ({ ...prev, [id]: rating }));
    const nextRemaining =
      rating === 'knew'
        ? remaining.filter((x) => x.id !== id)
        : [...remaining.filter((x) => x.id !== id), { id, r: rating }];
    setRemaining(nextRemaining);
    // Don't persist an empty set here — the "Continue" step persists the
    // direction flip / completion, so a resume never restarts a finished pass.
    if (nextRemaining.length > 0) {
      saveLevelState(lesson.kind, lesson.n, direction, nextRemaining).catch(() => {});
    }
  }

  function finishNow() {
    completeLevel(lesson.kind, lesson.n).catch(() => {});
    setCompleted(true);
  }

  function toNextPass() {
    setRevealed(new Set());
    setRated({});
    if (remaining.length === 0) {
      if (direction === 0) {
        const fresh = allRemaining();
        setDirection(1);
        setRemaining(fresh);
        setTable(buildTable(fresh));
        saveLevelState(lesson.kind, lesson.n, 1, fresh).catch(() => {});
      } else {
        completeLevel(lesson.kind, lesson.n).catch(() => {});
        setCompleted(true);
      }
    } else {
      setTable(buildTable(remaining));
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Fixed header + progress — stays while the words scroll under it. */}
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg-app)', paddingBottom: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <AppHeader
          title={<span style={{ fontSize: 'var(--text-lg)' }}>{lesson.title}</span>}
          onBack={() => router.push('/learn/vocabulary')}
          right={<Badge tone="neutral">{dirLabel}</Badge>}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-faint)', fontWeight: 'var(--fw-bold)' }}>
            <span>{dirHint} · {remaining.length} left</span>
            <span>{ratedCount}/{table.length}</span>
          </div>
          <ProgressBar value={ratedCount} max={table.length} />
        </div>
      </div>

      {/* Scrollable words */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
        {table.map((id) => {
          const w = wordById.get(id);
          if (!w) return null;
          const shown = direction === 0 ? w.en : w.sk;
          const hidden = direction === 0 ? w.sk : w.en;
          const isRevealed = revealed.has(id);
          const rating = rated[id];
          const tint = rating ? RATING_META[rating] : null;
          return (
            <Card key={id} padding="sm" style={tint ? { background: tint.bg, boxShadow: `inset 0 0 0 1px ${tint.ring}` } : undefined}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 'var(--fw-bold)', color: 'var(--text-strong)', wordBreak: 'break-word' }}>{shown}</span>
                    {direction === 0 && <SpeakButton text={w.en} size={28} />}
                  </div>
                  {direction === 0 && w.ipa && (
                    <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: '2px' }}>/{w.ipa}/</span>
                  )}
                </div>
                {!isRevealed ? (
                  <button
                    onClick={() => setRevealed((s) => new Set(s).add(id))}
                    aria-label="Reveal"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: 'none', cursor: 'pointer', background: 'var(--surface-inset)', color: 'var(--text-muted)', borderRadius: 'var(--radius-pill)', padding: '8px 14px', fontWeight: 'var(--fw-bold)', fontSize: 'var(--text-sm)' }}
                  >
                    {EyeIcon}
                  </button>
                ) : (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      {direction === 1 && <SpeakButton text={w.en} size={28} />}
                      <span style={{ color: tint ? tint.fg : 'var(--text-body)', fontWeight: 'var(--fw-semibold)', wordBreak: 'break-word', textAlign: 'right' }}>{hidden}</span>
                    </div>
                    {direction === 1 && w.ipa && (
                      <span style={{ display: 'block', textAlign: 'right', fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: '2px' }}>/{w.ipa}/</span>
                    )}
                  </div>
                )}
              </div>

              {isRevealed && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                  {(['knew', 'almost', 'didnt'] as Rating[]).map((rk) => {
                    const m = RATING_META[rk];
                    const active = rating === rk;
                    return (
                      <button
                        key={rk}
                        onClick={() => rate(id, rk)}
                        style={{
                          flex: 1, border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-md)', padding: '10px 0',
                          fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-bold)',
                          background: active ? m.fg : m.bg, color: active ? '#fff' : m.fg,
                          boxShadow: `inset 0 0 0 1px ${m.ring}`,
                        }}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div style={{ position: 'sticky', bottom: 'calc(100px + env(safe-area-inset-bottom))', marginTop: '18px', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'linear-gradient(to top, var(--bg-app) 78%, transparent)' }}>
        <Button variant="primary" size="lg" block onClick={toNextPass} disabled={!allRated}>
          {allRated ? (remaining.length === 0 ? (direction === 0 ? 'Otočiť na SK → EN' : 'Dokončiť level') : 'Ďalšie kolo') : `Ohodnoť všetky (${table.length})`}
        </Button>
        {allRated && remaining.length === 0 && direction === 0 && (
          <Button variant="ghost" size="lg" block onClick={finishNow}>
            Viem všetky — dokončiť bez otočenia
          </Button>
        )}
      </div>
    </div>
  );
}
