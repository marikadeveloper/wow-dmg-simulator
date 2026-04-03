import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { GearItem } from '../lib/types';
import {
  getGearTrackFromBonusIds,
  getCrestForTrack,
  getIlvlForRank,
  TRACK_BONUS_RANGES,
  UPGRADE_CREST_COST_PER_RANK,
  SOCKET_BONUS_ID,
} from '../lib/presets/season-config';

/** Crest icon colors per track for the cost display. */
const CREST_COLORS: Record<string, string> = {
  Myth: 'text-accent-orange',
  Hero: 'text-accent-purple',
  Champion: 'text-accent-blue',
  Veteran: 'text-accent-green',
  Adventurer: 'text-text-tertiary',
};

interface UpgradeOption {
  targetRank: number;
  targetIlvl: number;
  crestCost: number;
  crestName: string;
  trackName: string;
}

function computeUpgradeOptions(item: GearItem): UpgradeOption[] {
  const trackInfo = getGearTrackFromBonusIds(item.bonusIds);
  if (!trackInfo || trackInfo.rank >= trackInfo.maxRank) return [];

  const crest = getCrestForTrack(trackInfo.trackName);
  if (!crest) return [];

  const options: UpgradeOption[] = [];
  for (let r = trackInfo.maxRank; r > trackInfo.rank; r--) {
    const ranksNeeded = r - trackInfo.rank;
    options.push({
      targetRank: r,
      targetIlvl: getIlvlForRank(trackInfo.trackName, r),
      crestCost: ranksNeeded * UPGRADE_CREST_COST_PER_RANK,
      crestName: crest.name,
      trackName: trackInfo.trackName,
    });
  }
  return options;
}

function buildUpgradedItem(item: GearItem, opt: UpgradeOption): GearItem {
  const trackInfo = getGearTrackFromBonusIds(item.bonusIds)!;
  const trackRange = TRACK_BONUS_RANGES.find(
    (t) => t.name === trackInfo.trackName,
  )!;
  const currentBonusId = trackRange.startBonusId + (trackInfo.rank - 1);
  const targetBonusId = trackRange.startBonusId + (opt.targetRank - 1);

  return {
    ...item,
    bonusIds: item.bonusIds.map((bid) =>
      bid === currentBonusId ? targetBonusId : bid,
    ),
    ilvl: opt.targetIlvl,
    isEquipped: false,
    isVault: false,
    isUpgraded: false,
    isCatalyst: false,
    isUnowned: false,
    isCopyModified: true,
  };
}

function buildWithoutEnchant(item: GearItem): GearItem {
  return {
    ...item,
    enchantId: undefined,
    isEquipped: false,
    isVault: false,
    isUpgraded: false,
    isCatalyst: false,
    isUnowned: false,
    isCopyModified: true,
  };
}

function buildWithoutGems(item: GearItem): GearItem {
  return {
    ...item,
    gemIds: item.gemIds.map(() => 0),
    isEquipped: false,
    isVault: false,
    isUpgraded: false,
    isCatalyst: false,
    isUnowned: false,
    isCopyModified: true,
  };
}

function buildWithoutSocket(item: GearItem): GearItem {
  return {
    ...item,
    bonusIds: item.bonusIds.filter((bid) => bid !== SOCKET_BONUS_ID),
    gemIds: [],
    isEquipped: false,
    isVault: false,
    isUpgraded: false,
    isCatalyst: false,
    isUnowned: false,
    isCopyModified: true,
  };
}

interface CopyModifyDropdownProps {
  item: GearItem;
  onCopyModify: (newItem: GearItem) => void;
}

export default function CopyModifyDropdown({ item, onCopyModify }: CopyModifyDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: rect.left + rect.width / 2,
    });
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape + reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    function handleReposition() {
      updatePosition();
    }
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [open, updatePosition]);

  const upgradeOptions = computeUpgradeOptions(item);
  const hasEnchant = item.enchantId != null && item.enchantId > 0;
  const hasGems = item.gemIds.some((g) => g > 0);
  const hasSocketBonus = item.bonusIds.includes(SOCKET_BONUS_ID);

  const hasAnyOption = upgradeOptions.length > 0 || hasEnchant || hasGems || hasSocketBonus;
  if (!hasAnyOption) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          updatePosition();
          setOpen((v) => !v);
        }}
        className={[
          'flex items-center justify-center w-5 h-5 rounded-md transition-all',
          'border border-border-input hover:border-border-input',
          'text-text-muted hover:text-text-secondary',
          open ? 'bg-surface-tertiary border-border-input text-text-secondary' : 'bg-surface-tertiary',
        ].join(' ')}
        title="Copy and modify"
        aria-label="Copy and modify item"
        aria-expanded={open}
      >
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M6 2.5v7M2.5 6h7" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
          className={[
            'z-[9999]',
            'min-w-[220px] max-w-[280px]',
            'rounded-lg overflow-hidden',
            'bg-surface-overlay border border-border-input',
            'shadow-xl shadow-black/40',
          ].join(' ')}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-border-primary">
            <span className="text-xs font-semibold text-text-secondary tracking-wide">
              Copy and Modify…
            </span>
          </div>

          <div className="py-1">
            {/* Upgrade options */}
            {upgradeOptions.map((opt) => {
              const crestColor = CREST_COLORS[opt.trackName] ?? 'text-text-tertiary';
              return (
                <button
                  key={`upgrade-${opt.targetRank}`}
                  type="button"
                  className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-left hover:bg-surface-secondary transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyModify(buildUpgradedItem(item, opt));
                    setOpen(false);
                  }}
                >
                  <span className="text-xs text-text-secondary">
                    Upgrade to {opt.targetIlvl}
                  </span>
                  <span className={`flex items-center gap-1 text-[11px] tabular-nums ${crestColor}`}>
                    {/* Crest icon — small diamond shape */}
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M6 1L10 6L6 11L2 6Z" />
                    </svg>
                    {opt.crestCost}
                  </span>
                </button>
              );
            })}

            {/* Separator between upgrades and remove options */}
            {upgradeOptions.length > 0 && (hasEnchant || hasGems || hasSocketBonus) && (
              <div className="border-t border-border-secondary my-0.5" />
            )}

            {/* Remove enchant */}
            {hasEnchant && (
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-secondary transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyModify(buildWithoutEnchant(item));
                  setOpen(false);
                }}
              >
                <span className="text-xs text-accent-red/80">Remove enchant</span>
              </button>
            )}

            {/* Remove gems */}
            {hasGems && (
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-secondary transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyModify(buildWithoutGems(item));
                  setOpen(false);
                }}
              >
                <span className="text-xs text-accent-red/80">Remove gems</span>
              </button>
            )}

            {/* Remove socket (bonus socket) */}
            {hasSocketBonus && (
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-secondary transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyModify(buildWithoutSocket(item));
                  setOpen(false);
                }}
              >
                <span className="text-xs text-accent-red/80">Remove socket</span>
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
