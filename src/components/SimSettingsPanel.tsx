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
  maxTime: number;
  varyCombatLength: number;
  numEnemies: number;
  iterations: number;
  threads: number;
  useTargetError: boolean;
  targetError: number;
}

export const DEFAULT_SIM_SETTINGS: SimSettingsValues = {
  fightStyle: 'Patchwerk',
  maxTime: 300,
  varyCombatLength: 20,
  numEnemies: 1,
  iterations: 10000,
  threads: Math.max(1, (navigator.hardwareConcurrency ?? 4) - 1),
  useTargetError: false,
  targetError: 0.1,
};

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

  const update = useCallback(
    (patch: Partial<SimSettingsValues>) => {
      onSettingsChange({ ...settings, ...patch });
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

  /** Collapsed summary line */
  const summaryParts: string[] = [currentStyle.label];
  if (settings.maxTime !== 300) summaryParts.push(`${settings.maxTime}s`);
  if (settings.numEnemies > 1) summaryParts.push(`${settings.numEnemies} enemies`);
  if (settings.useTargetError) {
    summaryParts.push(`error<${settings.targetError}%`);
  } else if (settings.iterations !== 10000) {
    summaryParts.push(`${(settings.iterations / 1000).toFixed(0)}k iter`);
  }
  const summaryText = summaryParts.join(' · ');

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
              {summaryText}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mt-3">
            {/* ── Fight Style ─────────────────────────────────────── */}
            <div className="sm:col-span-2">
              <SettingLabel
                label="Fight Style"
                hint="The type of encounter to simulate."
              />
              <div className="relative" ref={dropdownRef}>
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

            {/* ── Fight Length ─────────────────────────────────────── */}
            <div>
              <SettingLabel
                label="Fight Length"
                hint="How long the simulated fight lasts. 300s = 5 minutes."
              />
              <div className="flex items-center gap-2">
                <NumberInput
                  value={settings.maxTime}
                  onChange={(v) => update({ maxTime: v })}
                  min={10}
                  max={900}
                  step={10}
                />
                <span className="text-xs text-zinc-500">seconds</span>
              </div>
            </div>

            {/* ── Fight Length Variance ────────────────────────────── */}
            <div>
              <SettingLabel
                label="Fight Length Variance"
                hint="How much the fight length varies between iterations. 0% = fixed length."
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">&plusmn;</span>
                <NumberInput
                  value={settings.varyCombatLength}
                  onChange={(v) => update({ varyCombatLength: v })}
                  min={0}
                  max={100}
                  step={5}
                />
                <span className="text-xs text-zinc-500">%</span>
              </div>
            </div>

            {/* ── Number of Enemies ────────────────────────────────── */}
            <div>
              <SettingLabel
                label="Number of Enemies"
                hint="Total enemies in the fight. 1 = single target."
              />
              <NumberInput
                value={settings.numEnemies}
                onChange={(v) => update({ numEnemies: v })}
                min={1}
                max={20}
                step={1}
              />
            </div>

            {/* ── Iterations / Target Error ────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <SettingLabel
                  label={settings.useTargetError ? 'Target Error' : 'Iterations'}
                  hint={
                    settings.useTargetError
                      ? 'Sim stops when DPS error drops below this %. Lower = more accurate but slower.'
                      : 'Number of iterations per combination. More = more accurate but slower.'
                  }
                  noMargin
                />
                <button
                  onClick={() => update({ useTargetError: !settings.useTargetError })}
                  className="text-[10px] text-zinc-600 hover:text-amber-500/80 transition-colors"
                  title={
                    settings.useTargetError
                      ? 'Switch to fixed iterations'
                      : 'Switch to target error mode (auto-stop when accurate enough)'
                  }
                >
                  {settings.useTargetError ? 'Use iterations' : 'Use target error'}
                </button>
              </div>
              {settings.useTargetError ? (
                <div className="flex items-center gap-2">
                  <NumberInput
                    value={settings.targetError}
                    onChange={(v) => update({ targetError: v })}
                    min={0.01}
                    max={5}
                    step={0.05}
                    decimals={2}
                  />
                  <span className="text-xs text-zinc-500">%</span>
                </div>
              ) : (
                <NumberInput
                  value={settings.iterations}
                  onChange={(v) => update({ iterations: v })}
                  min={1000}
                  max={100000}
                  step={1000}
                />
              )}
            </div>

            {/* ── Threads ─────────────────────────────────────────── */}
            <div>
              <SettingLabel
                label="CPU Threads"
                hint={`Number of threads SimC will use. Detected ${navigator.hardwareConcurrency ?? '?'} cores.`}
              />
              <NumberInput
                value={settings.threads}
                onChange={(v) => update({ threads: v })}
                min={1}
                max={navigator.hardwareConcurrency ?? 16}
                step={1}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Small helper components                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function SettingLabel({
  label,
  hint,
  noMargin,
}: {
  label: string;
  hint: string;
  noMargin?: boolean;
}) {
  return (
    <label
      className={[
        'block text-xs font-medium text-zinc-500',
        noMargin ? '' : 'mb-1.5',
      ].join(' ')}
      title={hint}
    >
      {label}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  decimals = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  decimals?: number;
}) {
  const [localValue, setLocalValue] = useState(
    decimals > 0 ? value.toFixed(decimals) : String(value),
  );

  // Sync from parent when value changes externally
  useEffect(() => {
    setLocalValue(decimals > 0 ? value.toFixed(decimals) : String(value));
  }, [value, decimals]);

  const commit = useCallback(
    (raw: string) => {
      const parsed = parseFloat(raw);
      if (isNaN(parsed)) {
        // Reset to current value
        setLocalValue(decimals > 0 ? value.toFixed(decimals) : String(value));
        return;
      }
      const clamped = Math.min(max, Math.max(min, parsed));
      const rounded =
        decimals > 0
          ? parseFloat(clamped.toFixed(decimals))
          : Math.round(clamped / step) * step;
      onChange(rounded);
      setLocalValue(decimals > 0 ? rounded.toFixed(decimals) : String(rounded));
    },
    [value, min, max, step, decimals, onChange],
  );

  return (
    <input
      type="text"
      inputMode="decimal"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => commit(localValue)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit(localValue);
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const next = Math.min(max, value + step);
          onChange(decimals > 0 ? parseFloat(next.toFixed(decimals)) : next);
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = Math.max(min, value - step);
          onChange(decimals > 0 ? parseFloat(next.toFixed(decimals)) : next);
        }
      }}
      className={[
        'w-24 px-3 py-2 rounded-md text-sm text-zinc-200',
        'bg-zinc-800/60 border border-zinc-700/50',
        'focus:outline-none focus:border-amber-500/40 transition-colors',
      ].join(' ')}
    />
  );
}
