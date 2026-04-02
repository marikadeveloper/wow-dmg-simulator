import { useMemo } from 'react';
import type { SimcProfile } from '../lib/types';
import { detectTierSets, type DetectedTierSet, type TierSetMinimums } from '../lib/tier-set-filter';

interface TierSetFilterProps {
  profile: SimcProfile;
  minimums: TierSetMinimums;
  onMinimumsChange: (minimums: TierSetMinimums) => void;
}

const MIN_OPTIONS = [0, 2, 4] as const;

function PieceCountButton({
  value,
  isSelected,
  onClick,
}: {
  value: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-2 py-0.5 rounded text-[11px] font-medium tabular-nums transition-all duration-150',
        isSelected
          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
          : 'bg-surface-tertiary text-text-muted border border-border-tertiary hover:text-text-tertiary hover:border-border-input',
      ].join(' ')}
    >
      {value === 0 ? 'Off' : `${value}pc`}
    </button>
  );
}

function TierSetRow({
  detected,
  minimum,
  onMinimumChange,
}: {
  detected: DetectedTierSet;
  minimum: number;
  onMinimumChange: (min: number) => void;
}) {
  const { definition, totalPieces, equippedPieces } = detected;

  // Only show options the user could actually achieve
  const maxAchievable = totalPieces;

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      {/* Set info */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="min-w-0">
          <div className="text-[11px] text-text-secondary truncate" title={definition.name}>
            {definition.name}
          </div>
          <div className="text-[10px] text-text-faint">
            {equippedPieces}/{totalPieces} pieces
            {equippedPieces >= 4 && (
              <span className="ml-1 text-amber-500/60">4-set active</span>
            )}
            {equippedPieces >= 2 && equippedPieces < 4 && (
              <span className="ml-1 text-amber-500/40">2-set active</span>
            )}
          </div>
        </div>
      </div>

      {/* Min piece selector */}
      <div className="flex items-center gap-1 shrink-0">
        {MIN_OPTIONS.map((opt) => (
          <PieceCountButton
            key={opt}
            value={opt}
            isSelected={minimum === opt}
            onClick={() => {
              // Don't allow selecting a minimum higher than what's available
              if (opt <= maxAchievable) {
                onMinimumChange(opt);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function TierSetFilter({
  profile,
  minimums,
  onMinimumsChange,
}: TierSetFilterProps) {
  const detectedSets = useMemo(() => detectTierSets(profile), [profile]);

  if (detectedSets.length === 0) return null;

  const activeFilterCount = [...minimums.values()].filter((v) => v > 0).length;

  const handleMinimumChange = (setId: string, min: number) => {
    const next = new Map(minimums);
    if (min === 0) {
      next.delete(setId);
    } else {
      next.set(setId, min);
    }
    onMinimumsChange(next);
  };

  return (
    <div className="rounded-lg border border-border-primary bg-surface-primary overflow-hidden">
      {/* Header */}
      <div className="px-3.5 py-2 border-b border-border-secondary flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-3.5 h-3.5 text-text-muted"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Shield icon for tier sets */}
            <path d="M8 1.5L2.5 4v4c0 3.5 2.5 5.5 5.5 6.5 3-1 5.5-3 5.5-6.5V4L8 1.5z" />
          </svg>
          <span className="text-xs font-semibold text-text-tertiary tracking-wide">
            Tier Sets
          </span>
          {activeFilterCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/15 font-medium">
              {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'}
            </span>
          )}
        </div>
        <span className="text-[10px] text-text-faint">
          min pieces required
        </span>
      </div>

      {/* Set rows */}
      <div className="px-3.5 py-1">
        {detectedSets.map((detected) => (
          <TierSetRow
            key={detected.definition.id}
            detected={detected}
            minimum={minimums.get(detected.definition.id) ?? 0}
            onMinimumChange={(min) => handleMinimumChange(detected.definition.id, min)}
          />
        ))}
      </div>
    </div>
  );
}
