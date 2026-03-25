import { useMemo } from 'react';
import type { SimcProfile, OptimizationAxis } from '../lib/types';
import { buildGearAxes } from '../lib/gear-axes';
import { countCombinations } from '../lib/combinator';

interface CombinationCounterProps {
  profile: SimcProfile;
  selection: Set<string>;
}

type Urgency = 'idle' | 'green' | 'yellow' | 'orange' | 'red' | 'blocked';

function getUrgency(count: number): Urgency {
  if (count <= 1) return 'idle';
  if (count < 50) return 'green';
  if (count <= 200) return 'yellow';
  if (count <= 500) return 'orange';
  if (count <= 1000) return 'red';
  return 'blocked';
}

function getUrgencyLabel(urgency: Urgency): string | null {
  switch (urgency) {
    case 'idle': return null;
    case 'green': return null;
    case 'yellow': return 'May take a while';
    case 'orange': return 'May take 10+ minutes';
    case 'red': return 'Long run — consider narrowing';
    case 'blocked': return 'Too many — deselect some items';
  }
}

const URGENCY_STYLES: Record<Urgency, { badge: string; glow: string; text: string; bar: string }> = {
  idle: {
    badge: 'bg-zinc-800/60 text-zinc-500 border-zinc-700/40',
    glow: '',
    text: 'text-zinc-500',
    bar: 'bg-zinc-700/30',
  },
  green: {
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    glow: 'shadow-[0_0_12px_-3px_rgba(52,211,153,0.15)]',
    text: 'text-emerald-400/80',
    bar: 'bg-emerald-500/20',
  },
  yellow: {
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    glow: 'shadow-[0_0_12px_-3px_rgba(251,191,36,0.15)]',
    text: 'text-amber-400/80',
    bar: 'bg-amber-500/20',
  },
  orange: {
    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    glow: 'shadow-[0_0_12px_-3px_rgba(251,146,60,0.2)]',
    text: 'text-orange-400/80',
    bar: 'bg-orange-500/20',
  },
  red: {
    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
    glow: 'shadow-[0_0_16px_-3px_rgba(248,113,113,0.2)]',
    text: 'text-red-400/80',
    bar: 'bg-red-500/20',
  },
  blocked: {
    badge: 'bg-red-500/15 text-red-300 border-red-500/30',
    glow: 'shadow-[0_0_20px_-3px_rgba(248,113,113,0.3)]',
    text: 'text-red-300',
    bar: 'bg-red-500/30',
  },
};

export default function CombinationCounter({ profile, selection }: CombinationCounterProps) {
  const { count, axes } = useMemo(() => {
    const gearAxes: OptimizationAxis[] = buildGearAxes(profile, selection);
    // Future: concat gem axes, enchant axes here
    const allAxes = gearAxes;
    const n = countCombinations(allAxes);
    return { count: n, axes: allAxes };
  }, [profile, selection]);

  const urgency = getUrgency(count);
  const styles = URGENCY_STYLES[urgency];
  const warning = getUrgencyLabel(urgency);

  // Count how many slots have >1 selected item (active comparison slots)
  const activeSlotCount = axes.length;

  return (
    <div
      className={[
        'relative rounded-lg border overflow-hidden transition-all duration-300',
        'border-zinc-800/60 bg-zinc-900/50',
        styles.glow,
      ].join(' ')}
    >
      {/* Subtle colored bar at top */}
      <div className={`h-px ${styles.bar}`} />

      <div className="px-4 py-3 flex items-center justify-between gap-4">
        {/* Left: combination count */}
        <div className="flex items-center gap-3">
          {/* Animated count badge */}
          <span
            className={[
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-sm font-semibold tabular-nums transition-colors duration-200',
              styles.badge,
            ].join(' ')}
          >
            <svg
              className="w-3.5 h-3.5 opacity-60"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Grid/combination icon */}
              <rect x="2" y="2" width="5" height="5" rx="1" />
              <rect x="9" y="2" width="5" height="5" rx="1" />
              <rect x="2" y="9" width="5" height="5" rx="1" />
              <rect x="9" y="9" width="5" height="5" rx="1" />
            </svg>
            {count.toLocaleString()}
          </span>

          <div className="flex flex-col">
            <span className="text-xs text-zinc-400">
              {count === 1 ? 'combination' : 'combinations'}
            </span>
            {activeSlotCount > 0 && (
              <span className="text-[10px] text-zinc-600">
                {activeSlotCount} {activeSlotCount === 1 ? 'slot' : 'slots'} comparing
              </span>
            )}
          </div>
        </div>

        {/* Right: urgency warning */}
        {warning && (
          <span
            className={[
              'text-xs font-medium flex items-center gap-1.5 transition-colors duration-200',
              styles.text,
            ].join(' ')}
          >
            {urgency === 'blocked' ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="8" cy="8" r="6" />
                <path d="M8 5v3.5" />
                <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M8 2L14.5 13H1.5L8 2z" />
                <path d="M8 6.5v3" />
                <circle cx="8" cy="11" r="0.5" fill="currentColor" />
              </svg>
            )}
            {warning}
          </span>
        )}
      </div>
    </div>
  );
}
