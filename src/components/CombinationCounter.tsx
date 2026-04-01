import { useState, useMemo, useEffect } from 'react';
import type { OptimizationAxis, SimcProfile } from '../lib/types';
import { countCombinations, generateCombinations, getCombinationBreakdown } from '../lib/combinator';
import { countFilteredCombinations, type TierSetMinimums } from '../lib/tier-set-filter';

/** Urgency thresholds — exported for tests */
export const WARN_THRESHOLD = 200;
export const BLOCK_THRESHOLD = 1000;

interface CombinationCounterProps {
  /** Pre-assembled axes from the optimization assembler (gear + gems + enchants). */
  axes: OptimizationAxis[];
  /** Called whenever the blocked state changes (count > 1000 or weapon issue). */
  onBlockedChange?: (blocked: boolean) => void;
  /** Tier set minimum piece requirements for post-filter count. */
  tierSetMinimums?: TierSetMinimums;
  /** Profile needed for tier set filtering resolution. */
  profile?: SimcProfile;
  /** External block: selected 1H weapon has no off-hand available. */
  weaponBlocked?: boolean;
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

export default function CombinationCounter({ axes, onBlockedChange, tierSetMinimums, profile, weaponBlocked }: CombinationCounterProps) {
  const count = useMemo(() => countCombinations(axes), [axes]);
  const breakdown = useMemo(() => getCombinationBreakdown(axes), [axes]);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Compute filtered count when tier set filters are active
  const hasActiveFilters = tierSetMinimums && [...tierSetMinimums.values()].some((v) => v > 0);
  const filteredCount = useMemo(() => {
    if (!hasActiveFilters || !profile || !tierSetMinimums) return count;
    // Only generate combinations if count is manageable (avoid generating 1000+ just for counting)
    if (count > 1000) return count; // blocked anyway
    try {
      const combos = generateCombinations(axes, 1001);
      return countFilteredCombinations(combos, profile, tierSetMinimums);
    } catch {
      return count; // cap exceeded — use raw count
    }
  }, [axes, count, hasActiveFilters, profile, tierSetMinimums]);

  const displayCount = hasActiveFilters ? filteredCount : count;
  const urgency = getUrgency(displayCount);
  const styles = URGENCY_STYLES[urgency];
  const warning = getUrgencyLabel(urgency);
  const isBlocked = urgency === 'blocked' || !!weaponBlocked;

  // Notify parent of blocked state changes
  useEffect(() => {
    onBlockedChange?.(isBlocked);
  }, [isBlocked, onBlockedChange]);


  return (
    <div
      data-urgency={urgency}
      className={[
        'relative rounded-lg border overflow-hidden transition-all duration-300',
        'border-zinc-800/60 bg-zinc-900/50',
        styles.glow,
        isBlocked ? 'animate-pulse-slow' : '',
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
            {displayCount.toLocaleString()}
          </span>

          <div className="flex flex-col">
            <span className="text-xs text-zinc-400">
              {displayCount === 1 ? 'combination' : 'combinations'}
              {hasActiveFilters && displayCount < count && (
                <span className="text-zinc-600 ml-1">
                  (of {count.toLocaleString()})
                </span>
              )}
            </span>
            {breakdown.length > 1 && (
              <button
                type="button"
                onClick={() => setShowBreakdown((v) => !v)}
                className="text-[10px] text-zinc-500 hover:text-zinc-400 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="flex items-center gap-0.5 flex-wrap">
                  {breakdown.map((f, i) => (
                    <span key={f.label} className="whitespace-nowrap">
                      {i > 0 && <span className="text-zinc-600 mx-0.5">&times;</span>}
                      <span className="text-zinc-400 tabular-nums">{f.optionCount}</span>
                      {' '}{f.label}
                    </span>
                  ))}
                </span>
                <svg
                  className={`w-2.5 h-2.5 ml-0.5 shrink-0 transition-transform ${showBreakdown ? 'rotate-180' : ''}`}
                  viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                >
                  <path d="M2 4l3 3 3-3" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Right: urgency warning */}
        {warning && (
          <span
            {...(isBlocked ? { role: 'alert' } : {})}
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

      {/* Expanded breakdown */}
      {showBreakdown && breakdown.length > 1 && (
        <div className="px-4 pb-3 pt-1 border-t border-zinc-800/40">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-0.5 text-[10px]">
            {breakdown.map((f) => (
              <div key={f.label} className="contents">
                <span className="text-zinc-400 capitalize">{f.label}</span>
                <span className="text-zinc-500 text-right tabular-nums">{f.optionCount}</span>
                <span className="text-zinc-600">{f.detail ?? ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
