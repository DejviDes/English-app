'use client';

import Link from 'next/link';
import { AppHeader, Badge, Card } from '@/components/ui/primitives';
import { ProgressBar } from '@/components/ui/feedback';
import InstallHint from '@/components/InstallHint';
import type { Journey, JourneyDay } from '@/lib/repos/journey';

function prettyTheme(t: string | null): string {
  if (!t) return 'General';
  return t.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

const LINE_LEFT = 30;
const CIRCLE = 62;

function NodeCircle({ d }: { d: JourneyDay }) {
  const base: React.CSSProperties = {
    width: CIRCLE, height: CIRCLE, flexShrink: 0, borderRadius: 'var(--radius-pill)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 'var(--fw-extrabold)', fontSize: 'var(--text-xl)', position: 'relative', zIndex: 1,
  };
  if (d.status === 'done') {
    return (
      <div style={{ ...base, background: 'linear-gradient(160deg,var(--green-500),var(--green-700))', color: '#fff', boxShadow: 'var(--shadow-primary)' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </div>
    );
  }
  if (d.status === 'current') {
    return (
      <div className="lingua-pulse" style={{ ...base, background: 'var(--surface-card)', color: 'var(--primary)', outline: '3px solid var(--primary)', outlineOffset: '-3px', boxShadow: 'var(--shadow-md)' }}>
        {d.day}
      </div>
    );
  }
  return (
    <div style={{ ...base, background: 'var(--surface-inset)', color: 'var(--text-faint)', fontSize: 'var(--text-lg)' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
    </div>
  );
}

function DayRow({ d }: { d: JourneyDay }) {
  const href = d.status === 'current' ? `/day/${d.day}` : d.status === 'done' ? `/day/${d.day}/review` : null;
  const sub =
    d.status === 'done'
      ? d.reviewed
        ? 'Learned + reviewed ✓'
        : 'Completed · tap to review'
      : d.status === 'current'
        ? 'Tap to start'
        : 'Locked';

  const inner = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 0', opacity: d.status === 'locked' ? 0.6 : 1 }}>
      <NodeCircle d={d} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-bold)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase', color: d.status === 'current' ? 'var(--primary)' : 'var(--text-faint)' }}>
            Day {d.day}
          </p>
          {d.status === 'done' && d.reviewed && <Badge tone="correct" size="sm">↻</Badge>}
        </div>
        <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-extrabold)', color: 'var(--text-strong)', lineHeight: 'var(--leading-snug)' }}>
          {prettyTheme(d.theme)}
        </p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{d.words} words · {sub}</p>
      </div>
    </div>
  );
  return href ? <Link href={href} style={{ display: 'block' }}>{inner}</Link> : inner;
}

function Treasure({ week, allDone, reviewed }: { week: number; allDone: boolean; reviewed: boolean }) {
  const inner = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '6px 0' }}>
      <div style={{ width: CIRCLE, flexShrink: 0, display: 'flex', justifyContent: 'center', fontSize: '30px', filter: allDone ? 'none' : 'grayscale(1)', opacity: allDone ? 1 : 0.5, zIndex: 1 }}>
        {allDone ? '🎁' : '🔒'}
      </div>
      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-bold)', color: allDone ? 'var(--primary)' : 'var(--text-faint)' }}>
        {reviewed ? `Week ${week} reviewed ✓` : allDone ? `Week ${week} review` : `Week ${week} reward`}
      </p>
    </div>
  );
  return allDone ? <Link href={`/week/${week}/review`} style={{ display: 'block' }}>{inner}</Link> : inner;
}

export default function JourneyMap({
  journey,
  header,
}: {
  journey: Journey;
  header: { streak: number; lastScore: number | null };
}) {
  const positionDay = journey.currentDay ?? journey.totalDays;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-section)' }}>
      <InstallHint />

      <AppHeader
        title="English"
        right={
          <div style={{ display: 'flex', gap: '6px' }}>
            {header.lastScore != null && <Badge tone="primary" icon={<span>🎯</span>}>{header.lastScore}%</Badge>}
            <Badge tone="streak" icon={<span>🔥</span>}>{header.streak}</Badge>
          </div>
        }
      />

      <Card padding="md">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
          <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-bold)', color: 'var(--text-strong)' }}>
            Day {positionDay} of {journey.totalDays}
          </p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{journey.completedDays} mastered</p>
        </div>
        <ProgressBar value={journey.completedDays} max={journey.totalDays} height={12} />
      </Card>

      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: LINE_LEFT - 2, top: 8, bottom: 8, width: 4, borderRadius: 'var(--radius-pill)', background: 'var(--border-default)', zIndex: 0 }} />
        {journey.days.map((d) => {
          const week = d.day / 7;
          const wk = journey.weeks[week];
          return (
            <div key={d.day}>
              <DayRow d={d} />
              {d.weekEnd && wk && <Treasure week={week} allDone={wk.allDone} reviewed={wk.reviewed} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
