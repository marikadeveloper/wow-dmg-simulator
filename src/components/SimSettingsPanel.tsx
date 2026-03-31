import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { SimcProfile } from '../lib/types';
import {
  POTION_PRESETS,
  FOOD_PRESETS,
  FLASK_PRESETS,
  AUGMENTATION_PRESETS,
  WEAPON_RUNE_PRESETS,
  RAID_BUFFS,
  CRUCIBLE_ITEM_ID,
  CRUCIBLE_MODES,
} from '../lib/presets/season-config';

/** SimC fight_style value → user-facing label + short description. */
const FIGHT_STYLES = [
  {
    value: 'Patchwerk',
    label: 'Single Target (Patchwerk)',
    desc: 'Pure single-target, no movement. The standard raid boss DPS check — use this for most gear comparisons.',
  },
  {
    value: 'CastingPatchwerk',
    label: 'Single Target + Casting',
    desc: 'Single target but the boss casts spells. Useful if your spec has interrupts or benefits from enemy casting.',
  },
  {
    value: 'LightMovement',
    label: 'Light Movement',
    desc: 'Single target with brief movement phases (~15s) every ~85s. Good for ranged specs that lose uptime to mechanics.',
  },
  {
    value: 'HeavyMovement',
    label: 'Heavy Movement',
    desc: 'Frequent, longer movement phases (~25s every 20s). Tests how well your gear handles constant repositioning.',
  },
  {
    value: 'HecticAddCleave',
    label: 'Cleave / Add Waves',
    desc: 'Boss + frequent add spawns + movement. Best for M+ and council-style raid fights where AoE matters.',
  },
  {
    value: 'DungeonSlice',
    label: 'Dungeon Slice',
    desc: 'Simulates a full dungeon pull sequence — trash packs, bosses, mixed ST/AoE. Best for overall M+ gear choices.',
  },
  {
    value: 'HelterSkelter',
    label: 'Helter Skelter (Everything)',
    desc: 'Movement, stuns, interrupts, target switching — tests everything at once. Niche; use for stress-testing builds.',
  },
] as const;

const DEFAULT_RAID_BUFFS: Record<string, boolean> = Object.fromEntries(
  RAID_BUFFS.map((b) => [b.key, b.defaultOn]),
);

const DEFAULT_CRUCIBLE_MODES: Record<string, boolean> = Object.fromEntries(
  CRUCIBLE_MODES.map((m) => [m.key, true]),
);

export interface SimSettingsValues {
  fightStyle: string;
  maxTime: number;
  varyCombatLength: number;
  numEnemies: number;
  iterations: number;
  threads: number;
  useTargetError: boolean;
  targetError: number;
  /** Enable Smart Sim (multi-stage pipeline). null = auto (enabled for 50+ combos). */
  smartSimEnabled: boolean | null;
  /** Custom stage target errors [low, medium, high]. null = use defaults. */
  smartSimTargetErrors: [number, number, number] | null;
  potion: string;
  food: string;
  flask: string;
  augmentation: string;
  weaponRune: string;
  raidBuffs: Record<string, boolean>;
  crucibleModes: Record<string, boolean>;
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
  smartSimEnabled: null, // auto
  smartSimTargetErrors: null, // use defaults

  potion: '',
  food: '',
  flask: '',
  augmentation: '',
  weaponRune: '',
  raidBuffs: DEFAULT_RAID_BUFFS,
  crucibleModes: DEFAULT_CRUCIBLE_MODES,
};

interface SimSettingsPanelProps {
  settings: SimSettingsValues;
  onSettingsChange: (next: SimSettingsValues) => void;
  profile?: SimcProfile | null;
}

export default function SimSettingsPanel({
  settings,
  onSettingsChange,
  profile,
}: SimSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentStyle =
    FIGHT_STYLES.find((s) => s.value === settings.fightStyle) ?? FIGHT_STYLES[0];

  const hasCrucible = useMemo(() => {
    if (!profile) return false;
    const t1 = profile.gear.trinket1?.find((i) => i.isEquipped);
    const t2 = profile.gear.trinket2?.find((i) => i.isEquipped);
    return t1?.id === CRUCIBLE_ITEM_ID || t2?.id === CRUCIBLE_ITEM_ID;
  }, [profile]);

  const update = useCallback(
    (patch: Partial<SimSettingsValues>) => {
      onSettingsChange({ ...settings, ...patch });
    },
    [settings, onSettingsChange],
  );

  const handleSelect = useCallback(
    (value: string) => {
      update({ fightStyle: value });
      setDropdownOpen(false);
    },
    [update],
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
  if (settings.smartSimEnabled === true) summaryParts.push('Smart Sim');
  else if (settings.smartSimEnabled === false) summaryParts.push('Smart Sim off');
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
                hint="What kind of encounter to simulate. Use Single Target for raid bosses, Dungeon Slice for M+ keys, or Cleave for add-heavy fights."
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
                hint="How long the boss fight lasts. Default 300s (5 min) matches a typical raid boss. Use 120–180s for M+ bosses, 30–60s for trash packs."
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
                hint="Randomizes fight length between iterations to avoid favoring cooldown timings. Default 20% is recommended. Set to 0% only for fixed-length comparisons."
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
                hint="Total enemies in the fight. 1 = pure single target. Use 4–5 for M+ trash, 2 for cleave bosses. DungeonSlice handles this automatically."
              />
              <NumberInput
                value={settings.numEnemies}
                onChange={(v) => update({ numEnemies: v })}
                min={1}
                max={20}
                step={1}
              />
            </div>

            {/* ── Accuracy Mode ─────────────────────────────────── */}
            <div>
              <SettingLabel
                label="Accuracy"
                hint={
                  settings.useTargetError
                    ? 'Sim stops automatically when the DPS margin of error drops below this %. 0.1% is very accurate; 0.5% is faster but less precise. Good for large combo counts.'
                    : 'How many times each combination is simulated. 10,000 is a good balance of speed and accuracy. Use 5,000 for quick checks, 25,000+ for close gear comparisons.'
                }
              />
              {/* Segmented toggle */}
              <div className="flex items-center gap-3 mb-2.5">
                <div className="inline-flex rounded-md border border-zinc-700/50 bg-zinc-800/40 p-0.5">
                  <button
                    onClick={() => update({ useTargetError: false })}
                    className={[
                      'px-3 py-1 rounded text-xs font-medium transition-all',
                      !settings.useTargetError
                        ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300',
                    ].join(' ')}
                  >
                    Iterations
                  </button>
                  <button
                    onClick={() => update({ useTargetError: true })}
                    className={[
                      'px-3 py-1 rounded text-xs font-medium transition-all',
                      settings.useTargetError
                        ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300',
                    ].join(' ')}
                  >
                    Target Error
                  </button>
                </div>
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

            {/* ── Smart Sim ─────────────────────────────────────── */}
            <div>
              <SettingLabel
                label="Smart Sim"
                hint="Runs multiple stages at increasing precision, eliminating bad combinations early. Much faster for large sims (50+ combos). When set to Auto, enables automatically for 50+ combinations."
              />
              <div className="inline-flex rounded-md border border-zinc-700/50 bg-zinc-800/40 p-0.5">
                <button
                  onClick={() => update({ smartSimEnabled: null })}
                  className={[
                    'px-3 py-1 rounded text-xs font-medium transition-all',
                    settings.smartSimEnabled === null
                      ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300',
                  ].join(' ')}
                >
                  Auto
                </button>
                <button
                  onClick={() => update({ smartSimEnabled: true })}
                  className={[
                    'px-3 py-1 rounded text-xs font-medium transition-all',
                    settings.smartSimEnabled === true
                      ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300',
                  ].join(' ')}
                >
                  On
                </button>
                <button
                  onClick={() => update({ smartSimEnabled: false })}
                  className={[
                    'px-3 py-1 rounded text-xs font-medium transition-all',
                    settings.smartSimEnabled === false
                      ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300',
                  ].join(' ')}
                >
                  Off
                </button>
              </div>
            </div>

            {/* ── Smart Sim Target Errors (power user) ────────────── */}
            {settings.smartSimEnabled !== false && (
              <div>
                <SettingLabel
                  label="Stage Precision"
                  hint="Target error % for each Smart Sim stage. Lower = more accurate but slower. Defaults are 1.0 / 0.2 / 0.05."
                />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={settings.smartSimTargetErrors !== null}
                      onChange={() => {
                        if (settings.smartSimTargetErrors !== null) {
                          update({ smartSimTargetErrors: null });
                        } else {
                          update({ smartSimTargetErrors: [1.0, 0.2, 0.05] });
                        }
                      }}
                      className="accent-amber-500"
                    />
                    <span className="text-[11px] text-zinc-500">Custom</span>
                  </label>
                </div>
                {settings.smartSimTargetErrors && (
                  <div className="flex items-center gap-3 mt-2">
                    {(['Low', 'Medium', 'High'] as const).map((label, idx) => (
                      <div key={label} className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-zinc-600">{label}</span>
                        <div className="flex items-center gap-1">
                          <NumberInput
                            value={settings.smartSimTargetErrors![idx]}
                            onChange={(v) => {
                              const next = [...settings.smartSimTargetErrors!] as [number, number, number];
                              next[idx] = v;
                              update({ smartSimTargetErrors: next });
                            }}
                            min={0.01}
                            max={5}
                            step={0.05}
                            decimals={2}
                          />
                          <span className="text-[10px] text-zinc-600">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Threads ─────────────────────────────────────────── */}
            <div>
              <SettingLabel
                label="CPU Threads"
                hint={`How many CPU cores SimC will use (${navigator.hardwareConcurrency ?? '?'} detected). Default leaves one core free so your computer stays responsive. Lower this if your system feels sluggish during sims.`}
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

          {/* ══════════════════════════════════════════════════════════ */}
          {/*  Consumables                                              */}
          {/* ══════════════════════════════════════════════════════════ */}
          <SectionDivider label="Consumables" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-3">
            <ConsumableSelect
              label="Potion"
              value={settings.potion}
              options={POTION_PRESETS}
              onChange={(v) => update({ potion: v })}
            />
            <ConsumableSelect
              label="Food"
              value={settings.food}
              options={FOOD_PRESETS}
              onChange={(v) => update({ food: v })}
            />
            <ConsumableSelect
              label="Flask"
              value={settings.flask}
              options={FLASK_PRESETS}
              onChange={(v) => update({ flask: v })}
            />
            <ConsumableSelect
              label="Augmentation"
              value={settings.augmentation}
              options={AUGMENTATION_PRESETS}
              onChange={(v) => update({ augmentation: v })}
            />
            <ConsumableSelect
              label="Weapon Rune"
              value={settings.weaponRune}
              options={WEAPON_RUNE_PRESETS}
              onChange={(v) => update({ weaponRune: v })}
            />
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/*  Trinket Options (conditional)                            */}
          {/* ══════════════════════════════════════════════════════════ */}
          {hasCrucible && (
            <>
              <SectionDivider label="Trinket Options" />
              <div className="mb-1">
                <span className="text-xs font-medium text-zinc-300">
                  Crucible of Erratic Energies
                </span>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                {CRUCIBLE_MODES.map((mode) => (
                  <CheckboxItem
                    key={mode.key}
                    label={mode.label}
                    checked={settings.crucibleModes[mode.key] ?? true}
                    onChange={() =>
                      update({
                        crucibleModes: {
                          ...settings.crucibleModes,
                          [mode.key]: !settings.crucibleModes[mode.key],
                        },
                      })
                    }
                  />
                ))}
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/*  Raid Buffs                                               */}
          {/* ══════════════════════════════════════════════════════════ */}
          <SectionDivider label="Raid Buffs" />
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => update({ raidBuffs: { ...DEFAULT_RAID_BUFFS } })}
              className="px-3 py-1 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-colors"
            >
              Optimal Raid Buffs
            </button>
            <button
              onClick={() =>
                update({
                  raidBuffs: Object.fromEntries(
                    RAID_BUFFS.map((b) => [b.key, false]),
                  ),
                })
              }
              className="px-3 py-1 rounded-md text-xs font-semibold bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700/60 hover:text-zinc-300 transition-colors"
            >
              No Buffs
            </button>
          </div>
          <p className="text-[11px] text-zinc-600 mb-2.5 leading-snug">
            If your character provides one of these buffs, it may be used even
            if disabled here.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1.5">
            {RAID_BUFFS.map((buff) => (
              <CheckboxItem
                key={buff.key}
                label={buff.label}
                checked={settings.raidBuffs[buff.key] ?? false}
                onChange={() =>
                  update({
                    raidBuffs: {
                      ...settings.raidBuffs,
                      [buff.key]: !settings.raidBuffs[buff.key],
                    },
                  })
                }
              />
            ))}
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
    <div className={noMargin ? '' : 'mb-1.5'}>
      <label className="block text-xs font-medium text-zinc-400">
        {label}
      </label>
      <p className="text-[11px] text-zinc-600 leading-snug mt-0.5">
        {hint}
      </p>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="mt-5 mb-3 flex items-center gap-3">
      <div className="h-px flex-1 bg-zinc-800/80" />
      <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest shrink-0">
        {label}
      </span>
      <div className="h-px flex-1 bg-zinc-800/80" />
    </div>
  );
}

function ConsumableSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; name: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-zinc-500 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={[
          'w-full px-2.5 py-1.5 rounded-md text-sm',
          'bg-zinc-800/60 border border-zinc-700/50 text-zinc-200',
          'focus:outline-none focus:border-amber-500/40 transition-colors',
          'appearance-none cursor-pointer',
          // Arrow via background-image
          'bg-no-repeat bg-[length:12px] bg-[right_8px_center]',
          "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5 6 7.5 9 4.5' stroke='%2371717a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")]",
          'pr-7',
        ].join(' ')}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label onClick={onChange} className="flex items-center gap-2 cursor-pointer group py-0.5">
      <div
        className={[
          'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all',
          checked
            ? 'bg-amber-500/20 border-amber-500/50'
            : 'bg-zinc-800/60 border-zinc-700/50 group-hover:border-zinc-600',
        ].join(' ')}
      >
        {checked && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className="text-amber-400"
          >
            <path
              d="M2 5.5L4 7.5L8 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span
        className={[
          'text-xs transition-colors',
          checked
            ? 'text-zinc-300'
            : 'text-zinc-500 group-hover:text-zinc-400',
        ].join(' ')}
      >
        {label}
      </span>
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
