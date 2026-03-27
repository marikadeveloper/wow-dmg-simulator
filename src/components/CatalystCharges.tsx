import { useState, useMemo } from 'react';
import type { SimcProfile } from '../lib/types';
import { TIER_SLOT_ORDER, getTierSetId, getTierItemIdForSlot, CLASS_TO_TIER_SET_ID, getTierSetById } from '../lib/presets/season-config';

interface CatalystChargesProps {
  profile: SimcProfile;
  /** Current gear selection keys */
  selection: Set<string>;
  /** Current catalyst charge limit (null = disabled) */
  catalystCharges: number | null;
  /** Called when the user changes the catalyst charge count */
  onCatalystChargesChange: (charges: number | null) => void;
}

export default function CatalystCharges({
  profile,
  selection,
  catalystCharges,
  onCatalystChargesChange,
}: CatalystChargesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Detect class tier set
  const tierSetName = useMemo(() => {
    const className = profile.className;
    if (!className) return null;
    const setId = CLASS_TO_TIER_SET_ID[className];
    if (!setId) return null;
    return getTierSetById(setId)?.name ?? null;
  }, [profile.className]);

  // Count non-tier items in tier slots that could be converted
  const convertibleCount = useMemo(() => {
    let count = 0;
    for (const slot of TIER_SLOT_ORDER) {
      const items = profile.gear[slot];
      if (!items) continue;
      for (let i = 0; i < items.length; i++) {
        if (!selection.has(`${slot}:${i}`)) continue;
        if (items[i].isCatalyst) continue;
        if (!getTierSetId(items[i].id)) count++;
      }
    }
    return count;
  }, [profile.gear, selection]);

  // Count items that are already tier pieces
  const existingTierCount = useMemo(() => {
    let count = 0;
    for (const slot of TIER_SLOT_ORDER) {
      const items = profile.gear[slot];
      if (!items) continue;
      for (let i = 0; i < items.length; i++) {
        if (!selection.has(`${slot}:${i}`)) continue;
        if (getTierSetId(items[i].id)) count++;
      }
    }
    return count;
  }, [profile.gear, selection]);

  const isEnabled = catalystCharges !== null;
  const noClassName = !profile.className;

  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-zinc-800/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {/* Catalyst icon */}
          <svg
            className="w-4 h-4 text-zinc-500"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="8" cy="8" r="6" />
            <path d="M8 4V12" />
            <path d="M4 8H12" />
            <path d="M5.5 5.5L10.5 10.5" />
            <path d="M10.5 5.5L5.5 10.5" />
          </svg>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Catalyst Charges
          </h3>
          {isEnabled && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400/80 border border-cyan-500/15 tabular-nums">
              {catalystCharges} {catalystCharges === 1 ? 'charge' : 'charges'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {noClassName && (
            <span className="text-[10px] text-zinc-700 italic">
              class not detected
            </span>
          )}
          {!noClassName && convertibleCount === 0 && !isEnabled && (
            <span className="text-[10px] text-zinc-700 italic">
              no convertible items
            </span>
          )}
          {!noClassName && convertibleCount > 0 && !isEnabled && (
            <span className="text-[10px] text-zinc-600 tabular-nums">
              {convertibleCount} {convertibleCount === 1 ? 'item' : 'items'} convertible
            </span>
          )}

          {/* Chevron */}
          <svg
            className={[
              'w-3.5 h-3.5 text-zinc-600 transition-transform duration-200',
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
        <div className="border-t border-zinc-800/40">
          {noClassName ? (
            <div className="px-3.5 py-4 text-center text-xs text-zinc-600">
              Could not detect your class from the SimC export.
              <br />
              <span className="text-zinc-700">
                Catalyst conversion requires knowing your class to determine the correct tier set.
              </span>
            </div>
          ) : (
            <div className="px-3.5 py-3 space-y-3">
              {/* Info */}
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                The Creation Catalyst converts non-tier items into{' '}
                <span className="text-zinc-400 font-medium">{tierSetName}</span>{' '}
                tier pieces. Set how many charges to use &mdash; converted versions
                of your items will be added as comparison options.
              </p>

              {/* Tier piece summary */}
              <div className="flex items-center gap-3 text-[11px] tabular-nums">
                <span className="text-zinc-500">
                  {existingTierCount} tier {existingTierCount === 1 ? 'piece' : 'pieces'} already selected
                </span>
                <span className="text-zinc-700">|</span>
                <span className="text-zinc-500">
                  {convertibleCount} {convertibleCount === 1 ? 'item' : 'items'} can be converted
                </span>
              </div>

              {/* Charge selector */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) =>
                      onCatalystChargesChange(e.target.checked ? 1 : null)
                    }
                    className="rounded border-zinc-600 bg-zinc-800 text-cyan-500 focus:ring-cyan-500/30"
                  />
                  <span className="text-xs text-zinc-400">
                    Enable Catalyst
                  </span>
                </label>

                {isEnabled && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-500">Charges:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => onCatalystChargesChange(n)}
                          className={[
                            'w-7 h-7 rounded text-xs font-medium transition-all',
                            catalystCharges === n
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/30 hover:text-zinc-300 hover:border-zinc-600/50',
                          ].join(' ')}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
