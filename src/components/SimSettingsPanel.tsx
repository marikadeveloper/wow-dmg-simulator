import { useState, useCallback, useRef, useEffect } from 'react';

/** SimC fight_style value → user-facing label + short description. */
const FIGHT_STYLES = [
  {
    value: 'Patchwerk',
    label: 'Single Target (Patchwerk)',
    desc: 'Stand-still, single boss. The default DPS check.',
  },
  {
    value: 'CastingPatchwerk',
    label: 'Single Target + Casting',
    desc: 'Same as Patchwerk but the boss casts spells — tests interrupt value.',
  },
  {
    value: 'LightMovement',
    label: 'Light Movement',
    desc: 'Occasional movement every ~85 seconds.',
  },
  {
    value: 'HeavyMovement',
    label: 'Heavy Movement',
    desc: 'Frequent movement every ~20 seconds.',
  },
  {
    value: 'HecticAddCleave',
    label: 'Cleave / Add Waves',
    desc: 'Boss + frequent add waves + movement. Good for M+ / cleave.',
  },
  {
    value: 'DungeonSlice',
    label: 'Dungeon Slice',
    desc: 'Mixed single-target and AoE, emulating a dungeon run.',
  },
  {
    value: 'HelterSkelter',
    label: 'Helter Skelter (Everything)',
    desc: 'Movement, stuns, interrupts, target switching — chaos test.',
  },
] as const;

export interface SimSettingsValues {
  fightStyle: string;
}

interface SimSettingsPanelProps {
  settings: SimSettingsValues;
  onSettingsChange: (next: SimSettingsValues) => void;
}

export default function SimSettingsPanel({
  settings,
  onSettingsChange,
}: SimSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentStyle =
    FIGHT_STYLES.find((s) => s.value === settings.fightStyle) ?? FIGHT_STYLES[0];

  const handleSelect = useCallback(
    (value: string) => {
      onSettingsChange({ ...settings, fightStyle: value });
      setDropdownOpen(false);
    },
    [settings, onSettingsChange],
  );

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [dropdownOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    if (!dropdownOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdownOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dropdownOpen]);

  return (
    <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50">
      {/* Collapsible header */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left group"
      >
        <div className="flex items-center gap-2.5">
          {/* Gear icon */}
          <svg
            className="text-zinc-500 group-hover:text-zinc-400 transition-colors"
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
          >
            <path
              d="M7.07 1.13a.5.5 0 0 1 .86 0l.65 1.1a.5.5 0 0 0 .37.25l1.27.15a.5.5 0 0 1 .27.85l-.94.87a.5.5 0 0 0-.14.44l.25 1.26a.5.5 0 0 1-.73.53l-1.12-.62a.5.5 0 0 0-.46 0l-1.12.62a.5.5 0 0 1-.73-.53l.25-1.26a.5.5 0 0 0-.14-.44l-.94-.87a.5.5 0 0 1 .27-.85l1.27-.15a.5.5 0 0 0 .37-.25l.65-1.1z"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
            <circle cx="7.5" cy="10.5" r="1" fill="currentColor" opacity="0.5" />
            <circle cx="4.5" cy="12" r="0.75" fill="currentColor" opacity="0.3" />
            <circle cx="10.5" cy="12" r="0.75" fill="currentColor" opacity="0.3" />
          </svg>
          <span className="text-sm font-semibold text-zinc-300 tracking-tight">
            Simulation Settings
          </span>
          {/* Inline summary when collapsed */}
          {!isOpen && (
            <span className="text-[11px] text-zinc-600 ml-1">
              {currentStyle.label}
            </span>
          )}
        </div>
        {/* Chevron */}
        <svg
          className={[
            'text-zinc-600 group-hover:text-zinc-400 transition-all duration-200',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
        >
          <path
            d="M3.5 5.25L7 8.75L10.5 5.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Settings body */}
      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-zinc-800/60">
          {/* Fight Style */}
          <div className="mt-3">
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">
              Fight Style
            </label>
            <div className="relative" ref={dropdownRef}>
              {/* Trigger button */}
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className={[
                  'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm',
                  'bg-zinc-800/60 border transition-colors',
                  dropdownOpen
                    ? 'border-amber-500/40 text-zinc-100'
                    : 'border-zinc-700/50 text-zinc-200 hover:border-zinc-600',
                ].join(' ')}
              >
                <span>{currentStyle.label}</span>
                <svg
                  className={[
                    'text-zinc-500 transition-transform duration-150',
                    dropdownOpen ? 'rotate-180' : '',
                  ].join(' ')}
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-700/60 bg-zinc-900 shadow-xl shadow-black/40 py-1 max-h-[320px] overflow-y-auto">
                  {FIGHT_STYLES.map((style) => {
                    const isSelected = style.value === settings.fightStyle;
                    return (
                      <button
                        key={style.value}
                        onClick={() => handleSelect(style.value)}
                        className={[
                          'w-full text-left px-3 py-2 transition-colors',
                          isSelected
                            ? 'bg-amber-500/10'
                            : 'hover:bg-zinc-800/80',
                        ].join(' ')}
                      >
                        <div className="flex items-center gap-2">
                          {/* Selection dot */}
                          <div
                            className={[
                              'w-1.5 h-1.5 rounded-full shrink-0',
                              isSelected ? 'bg-amber-400' : 'bg-transparent',
                            ].join(' ')}
                          />
                          <div>
                            <div
                              className={[
                                'text-sm',
                                isSelected
                                  ? 'text-amber-50 font-medium'
                                  : 'text-zinc-300',
                              ].join(' ')}
                            >
                              {style.label}
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                              {style.desc}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
