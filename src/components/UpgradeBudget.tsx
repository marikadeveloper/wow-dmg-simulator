import { useState, useMemo, useCallback, useEffect } from 'react';
import type { SimcProfile } from '../lib/types';
import { UPGRADE_CREST_COST_PER_RANK, type CrestType } from '../lib/presets/season-config';
import { getRelevantCrestTypes, countUpgradeableItems, type CrestBudget } from '../lib/upgrade-calculator';

/** Accent colors per crest type, matching gear track visual language. */
const CREST_ACCENT: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  adventurer: {
    border: 'border-zinc-500/30',
    bg: 'bg-zinc-500/5',
    text: 'text-zinc-400',
    dot: 'bg-zinc-400',
  },
  veteran: {
    border: 'border-green-500/30',
    bg: 'bg-green-500/5',
    text: 'text-green-400',
    dot: 'bg-green-400',
  },
  champion: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/5',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
  },
  hero: {
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/5',
    text: 'text-purple-400',
    dot: 'bg-purple-400',
  },
  myth: {
    border: 'border-orange-500/30',
    bg: 'bg-orange-500/5',
    text: 'text-orange-400',
    dot: 'bg-orange-400',
  },
};

interface UpgradeBudgetProps {
  profile: SimcProfile;
  /** Current gear selection keys (e.g. "head:0", "trinket1:1"). */
  selection: Set<string>;
  /** Called when the user applies upgrades with their budget. */
  onApplyUpgrades: (budget: CrestBudget) => void;
  /** Called when the user clears upgrades. */
  onClearUpgrades: () => void;
  /** Whether upgrades are currently applied. */
  hasUpgrades: boolean;
}

export default function UpgradeBudget({
  profile,
  selection,
  onApplyUpgrades,
  onClearUpgrades,
  hasUpgrades,
}: UpgradeBudgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [budget, setBudget] = useState<CrestBudget>({});
  const [hasPreFilled, setHasPreFilled] = useState(false);

  // Pre-fill budget from parsed SimC upgrade_currencies (once per profile)
  useEffect(() => {
    if (profile.upgradeCurrencies && !hasPreFilled) {
      setBudget(profile.upgradeCurrencies);
      setHasPreFilled(true);
    }
  }, [profile.upgradeCurrencies, hasPreFilled]);

  // Only show crest types where the user has upgradeable items
  const relevantCrestTypes = useMemo(
    () => getRelevantCrestTypes(profile.gear, selection),
    [profile.gear, selection],
  );

  const upgradeableCounts = useMemo(
    () => countUpgradeableItems(profile.gear, selection),
    [profile.gear, selection],
  );

  const hasBudget = Object.values(budget).some((v) => v > 0);

  const handleBudgetChange = useCallback((crestId: string, value: string) => {
    const num = Math.max(0, Math.min(9999, parseInt(value, 10) || 0));
    setBudget((prev) => ({ ...prev, [crestId]: num }));
  }, []);

  const handleApply = useCallback(() => {
    onApplyUpgrades(budget);
  }, [budget, onApplyUpgrades]);

  const handleClear = useCallback(() => {
    onClearUpgrades();
  }, [onClearUpgrades]);

  const noUpgradeableItems = relevantCrestTypes.length === 0;

  return (
    <div className="rounded-lg border border-border-primary bg-surface-primary overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {/* Crest icon */}
          <svg
            className="w-4 h-4 text-text-muted"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 1L2 5V11L8 15L14 11V5Z" />
            <path d="M8 1V15" />
            <path d="M2 5L14 11" />
            <path d="M14 5L2 11" />
          </svg>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
            Upgrade Budget
          </h3>
          {hasUpgrades && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/15 tabular-nums">
              upgrades applied
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {noUpgradeableItems && (
            <span className="text-[10px] text-text-disabled italic">
              no upgradeable items
            </span>
          )}
          {!noUpgradeableItems && !hasUpgrades && (
            <span className="text-[10px] text-text-faint tabular-nums">
              {relevantCrestTypes.length} crest {relevantCrestTypes.length === 1 ? 'type' : 'types'} relevant
            </span>
          )}

          {/* Chevron */}
          <svg
            className={[
              'w-3.5 h-3.5 text-text-faint transition-transform duration-200',
              isExpanded ? 'rotate-0' : '-rotate-90',
            ].join(' ')}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M4 6L8 10L12 6" />
          </svg>
        </div>
      </button>

      {/* Body */}
      {isExpanded && (
        <div className="border-t border-border-secondary">
          {noUpgradeableItems ? (
            <div className="px-3.5 py-4 text-center text-xs text-text-faint">
              None of your selected items can be upgraded.
              <br />
              <span className="text-text-disabled">
                Items at max rank (6/6) or without a gear track cannot be upgraded.
              </span>
            </div>
          ) : (
            <div className="px-3.5 py-3 space-y-3">
              {/* Info */}
              <p className="text-[11px] text-text-faint leading-relaxed">
                {profile.upgradeCurrencies ? (
                  <>
                    Crest quantities were <span className="text-text-tertiary font-medium">auto-detected</span> from your SimC export.{' '}
                  </>
                ) : (
                  <>Enter how many Dawncrests you own.{' '}</>
                )}
                Each upgrade rank costs{' '}
                <span className="text-text-tertiary font-medium">{UPGRADE_CREST_COST_PER_RANK}</span>{' '}
                crests. Upgraded versions of your items will be added as comparison options.
              </p>

              {/* Crest budget inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {relevantCrestTypes.map((crest) => (
                  <CrestInput
                    key={crest.id}
                    crest={crest}
                    value={budget[crest.id] ?? 0}
                    upgradeableCount={upgradeableCounts.get(crest.id) ?? 0}
                    onChange={(v) => handleBudgetChange(crest.id, v)}
                  />
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!hasBudget}
                  className={[
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    hasBudget
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 cursor-pointer'
                      : 'bg-surface-tertiary text-text-faint border border-border-tertiary cursor-not-allowed',
                  ].join(' ')}
                >
                  Apply Upgrades
                </button>
                {hasUpgrades && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-3 py-1.5 rounded-md text-xs text-text-muted hover:text-text-secondary border border-border-tertiary hover:border-border-input transition-all cursor-pointer"
                  >
                    Clear Upgrades
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Crest Input Row ──────────────────────────────────────────────────────────

interface CrestInputProps {
  crest: CrestType;
  value: number;
  upgradeableCount: number;
  onChange: (value: string) => void;
}

function CrestInput({ crest, value, upgradeableCount, onChange }: CrestInputProps) {
  const accent = CREST_ACCENT[crest.id] ?? CREST_ACCENT.adventurer;

  return (
    <div
      className={[
        'flex items-center gap-2.5 px-2.5 py-2 rounded-md border',
        accent.border,
        accent.bg,
      ].join(' ')}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${accent.dot} shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className={`text-[11px] font-medium ${accent.text} truncate`}>
          {crest.name}
        </div>
        <div className="text-[10px] text-text-faint tabular-nums">
          {upgradeableCount} {upgradeableCount === 1 ? 'item' : 'items'} upgradeable
        </div>
      </div>
      <input
        type="number"
        min={0}
        max={9999}
        value={value || ''}
        placeholder="0"
        onChange={(e) => onChange(e.target.value)}
        className={[
          'w-16 px-2 py-1 rounded text-xs tabular-nums text-right',
          'bg-surface-inset border border-border-input text-text-secondary',
          'placeholder-text-disabled focus:outline-none focus:border-border-input',
        ].join(' ')}
      />
    </div>
  );
}
