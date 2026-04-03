import { useState, useMemo, useCallback } from 'react';
import type { SimcProfile, SavedLoadout } from '../lib/types';

// ── Component ────────────────────────────────────────────────────────────────

interface TalentComparisonProps {
  /** Parsed profile with savedLoadouts array */
  profile: SimcProfile;
  /** Set of loadout names the user has toggled on */
  selectedLoadoutNames: Set<string>;
  /** Toggle a loadout on/off by name */
  onToggleLoadout: (name: string) => void;
}

export default function TalentComparison({
  profile,
  selectedLoadoutNames,
  onToggleLoadout,
}: TalentComparisonProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const loadouts = profile.savedLoadouts ?? [];
  const selectedCount = selectedLoadoutNames.size;
  const activeTalentName = loadouts.find((l) => l.talentString === profile.talentString)?.name ?? null;

  // Detect duplicate talent strings (same build saved under different names)
  const duplicateStrings = useMemo(() => {
    const seen = new Map<string, number>();
    for (const loadout of loadouts) {
      seen.set(loadout.talentString, (seen.get(loadout.talentString) ?? 0) + 1);
    }
    const dupes = new Set<string>();
    for (const [str, count] of seen) {
      if (count > 1) dupes.add(str);
    }
    return dupes;
  }, [loadouts]);

  const handleSelectAll = useCallback(() => {
    for (const loadout of loadouts) {
      if (!selectedLoadoutNames.has(loadout.name)) {
        onToggleLoadout(loadout.name);
      }
    }
  }, [loadouts, selectedLoadoutNames, onToggleLoadout]);

  const handleDeselectAll = useCallback(() => {
    for (const name of selectedLoadoutNames) {
      onToggleLoadout(name);
    }
  }, [selectedLoadoutNames, onToggleLoadout]);

  return (
    <div className="rounded-lg border border-border-primary bg-surface-primary overflow-hidden">
      {/* Header — always visible, click to collapse/expand */}
      <button
        type="button"
        onClick={() => setIsExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {/* Talent icon — branching tree */}
          <svg
            className="w-4 h-4 text-text-muted"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 14V6" />
            <path d="M8 6L4 2" />
            <path d="M8 6L12 2" />
            <path d="M8 10L5 7" />
            <path d="M8 10L11 7" />
            <circle cx="4" cy="2" r="1" fill="currentColor" stroke="none" />
            <circle cx="12" cy="2" r="1" fill="currentColor" stroke="none" />
            <circle cx="5" cy="7" r="0.7" fill="currentColor" stroke="none" />
            <circle cx="11" cy="7" r="0.7" fill="currentColor" stroke="none" />
          </svg>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
            Talent Comparison
          </h3>
          {selectedCount > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-secondary text-text-tertiary border border-border-tertiary tabular-nums">
              {selectedCount} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {loadouts.length > 0 && (
            <span className="text-[10px] text-text-faint tabular-nums">
              {loadouts.length} saved {loadouts.length === 1 ? 'loadout' : 'loadouts'}
            </span>
          )}
          {loadouts.length === 0 && (
            <span className="text-[10px] text-text-disabled italic">
              no saved loadouts
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
          {loadouts.length === 0 ? (
            <div className="px-3.5 py-4 text-center text-xs text-text-faint">
              No saved talent loadouts found in your SimC export.
              <br />
              <span className="text-text-disabled">
                Save loadouts in the WoW talent UI to compare them here.
              </span>
            </div>
          ) : (
            <div className="px-3.5 py-3">
              {/* Active build callout */}
              <div className="flex items-center gap-2 mb-3 px-2.5 py-2 rounded-md bg-amber-500/6 border border-amber-500/15">
                <svg className="w-3.5 h-3.5 text-accent-amber/70 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 14V6" />
                  <path d="M8 6L4 2" />
                  <path d="M8 6L12 2" />
                </svg>
                <span className="text-[11px] text-text-muted">
                  Active build:{' '}
                  <span className="text-accent-amber/90 font-medium">
                    {activeTalentName ?? 'Custom Build'}
                  </span>
                  {!activeTalentName && (
                    <span className="text-text-disabled"> (doesn't match any saved loadout)</span>
                  )}
                </span>
              </div>

              {/* Select / Deselect all */}
              <div className="flex items-center gap-3 mb-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-60" />
                <span className="text-[11px] font-medium text-text-muted">
                  Saved Loadouts
                </span>
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSelectAll(); }}
                    className="text-[10px] text-text-faint hover:text-text-secondary transition-colors"
                  >
                    Select all
                  </button>
                  <span className="text-text-disabled text-[10px]">/</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDeselectAll(); }}
                    className="text-[10px] text-text-faint hover:text-text-secondary transition-colors"
                  >
                    Deselect all
                  </button>
                </div>
              </div>

              {/* Loadout chips */}
              <div className="flex flex-wrap gap-1.5">
                {loadouts.map((loadout) => (
                  <LoadoutChip
                    key={loadout.name}
                    loadout={loadout}
                    selected={selectedLoadoutNames.has(loadout.name)}
                    isActive={loadout.talentString === profile.talentString}
                    isDuplicate={duplicateStrings.has(loadout.talentString)}
                    onToggle={() => onToggleLoadout(loadout.name)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Loadout Chip ────────────────────────────────────────────────────────────

interface LoadoutChipProps {
  loadout: SavedLoadout;
  selected: boolean;
  isActive: boolean;
  isDuplicate: boolean;
  onToggle: () => void;
}

function LoadoutChip({ loadout, selected, isActive, isDuplicate, onToggle }: LoadoutChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] transition-all duration-150',
        'cursor-pointer select-none',
        selected
          ? 'border-emerald-500/40 bg-emerald-500/8 text-accent-emerald font-medium'
          : 'border-border-secondary hover:bg-emerald-500/5 text-text-muted hover:text-text-secondary',
      ].join(' ')}
      aria-pressed={selected}
    >
      <span className="truncate">{loadout.name}</span>
      {isActive && (
        <span className="text-[9px] font-medium px-1 py-px rounded bg-surface-secondary text-text-tertiary border border-border-input uppercase tracking-wider shrink-0">
          Active
        </span>
      )}
      {isDuplicate && !isActive && (
        <span className="text-[9px] px-1 py-px rounded bg-surface-secondary text-text-disabled border border-border-tertiary uppercase tracking-wider shrink-0">
          Dupe
        </span>
      )}
    </button>
  );
}
