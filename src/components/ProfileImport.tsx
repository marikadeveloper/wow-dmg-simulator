import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { parseSimcString } from '../lib/parser';
import {
  clearLastInput,
  loadLastInput,
  saveLastInput,
} from '../lib/profile-store';
import type { SimcProfile } from '../lib/types';
import { talentBuildsEqual } from '../lib/talent-decoder';

/** Validation result — either a valid profile or an error message. */
type ParseResult =
  | { ok: true; profile: SimcProfile }
  | { ok: false; error: string };

/**
 * Enrich weapon items in a parsed profile with isTwoHand from the item database.
 * Mutates the profile's gear items in-place.
 */
async function enrichWeaponTypes(profile: SimcProfile): Promise<void> {
  const weaponItems = profile.gear.main_hand ?? [];
  if (weaponItems.length === 0) return;

  const ids = weaponItems.map((i) => i.id);
  try {
    const typeMap = await invoke<Record<string, number>>('lookup_item_types', {
      itemIds: ids,
    });
    for (const item of weaponItems) {
      if (typeMap[String(item.id)] === 17) {
        item.isTwoHand = true;
      }
    }
  } catch {
    // DB lookup failed — items default to 1H behavior (safe fallback)
  }
}

function validate(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: '' }; // empty = no error shown, just idle
  }

  // Must contain at least one key=value line that looks like SimC
  const hasClassLine =
    /^(warrior|paladin|hunter|rogue|priest|deathknight|shaman|mage|warlock|monk|druid|demonhunter|evoker)=/m.test(
      trimmed,
    );
  if (!hasClassLine) {
    return {
      ok: false,
      error:
        'This doesn\u2019t look like a SimC export. Open the SimulationCraft addon in-game, copy the full text, and paste it here.',
    };
  }

  const profile = parseSimcString(trimmed);

  if (!profile.characterName) {
    return {
      ok: false,
      error:
        'Could not find a character name. Make sure you\u2019re pasting the full export from the SimC addon.',
    };
  }

  const equippedCount = Object.values(profile.gear).filter((items) =>
    items.some((i) => i.isEquipped),
  ).length;

  if (equippedCount === 0) {
    return {
      ok: false,
      error:
        'No equipped gear found. The export may be incomplete \u2014 try copying it again from the addon.',
    };
  }

  return { ok: true, profile };
}

const SPEC_DISPLAY: Record<string, string> = {
  enhancement: 'Enhancement',
  restoration: 'Restoration',
  elemental: 'Elemental',
  protection: 'Protection',
  retribution: 'Retribution',
  holy: 'Holy',
  arms: 'Arms',
  fury: 'Fury',
  beast_mastery: 'Beast Mastery',
  marksmanship: 'Marksmanship',
  survival: 'Survival',
  assassination: 'Assassination',
  outlaw: 'Outlaw',
  subtlety: 'Subtlety',
  discipline: 'Discipline',
  shadow: 'Shadow',
  blood: 'Blood',
  frost: 'Frost',
  unholy: 'Unholy',
  arcane: 'Arcane',
  fire: 'Fire',
  affliction: 'Affliction',
  demonology: 'Demonology',
  destruction: 'Destruction',
  brewmaster: 'Brewmaster',
  mistweaver: 'Mistweaver',
  windwalker: 'Windwalker',
  balance: 'Balance',
  feral: 'Feral',
  guardian: 'Guardian',
  havoc: 'Havoc',
  vengeance: 'Vengeance',
  devastation: 'Devastation',
  preservation: 'Preservation',
  augmentation: 'Augmentation',
};

function formatSpec(spec: string): string {
  return SPEC_DISPLAY[spec] ?? spec.charAt(0).toUpperCase() + spec.slice(1);
}

function formatRealm(realm: string): string {
  return realm
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface ProfileImportProps {
  onProfileParsed: (profile: SimcProfile | null) => void;
}

export default function ProfileImport({ onProfileParsed }: ProfileImportProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  /** Validate, enrich weapon types, and emit the parsed profile. */
  const validateAndEmit = useCallback(
    async (value: string) => {
      const r = validate(value);
      setResult(r);
      if (r.ok) {
        await enrichWeaponTypes(r.profile);
        onProfileParsed(r.profile);
      } else {
        onProfileParsed(null);
      }
      saveLastInput(value);
    },
    [onProfileParsed],
  );

  const handleChange = useCallback(
    (value: string) => {
      setInput(value);

      // Clear previous debounce
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!value.trim()) {
        setResult(null);
        onProfileParsed(null);
        clearLastInput();
        return;
      }

      // Debounce parsing for typed input (50ms — feels instant but avoids thrash)
      debounceRef.current = setTimeout(() => {
        validateAndEmit(value);
      }, 50);
    },
    [onProfileParsed, validateAndEmit],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      // On paste, parse immediately (no debounce)
      const pasted = e.clipboardData.getData('text');
      // The textarea onChange will fire too, but we parse eagerly here
      setTimeout(() => {
        validateAndEmit(pasted);
      }, 0);
    },
    [validateAndEmit],
  );

  const handleClear = useCallback(() => {
    setInput('');
    setResult(null);
    onProfileParsed(null);
    clearLastInput();
    textareaRef.current?.focus();
  }, [onProfileParsed]);

  // Restore last session's input on mount
  useEffect(() => {
    loadLastInput().then(async (saved) => {
      if (saved.trim()) {
        setInput(saved);
        await validateAndEmit(saved);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps — only run on mount
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const profile = result?.ok ? result.profile : null;
  const error = result && !result.ok ? result.error : '';
  const hasInput = input.trim().length > 0;

  const totalEquipped = profile
    ? Object.values(profile.gear).filter((items) =>
        items.some((i) => i.isEquipped),
      ).length
    : 0;

  const totalBag = profile
    ? Object.values(profile.gear).reduce(
        (sum, items) => sum + items.filter((i) => !i.isEquipped).length,
        0,
      )
    : 0;

  const activeTalentName =
    profile?.savedLoadouts?.find((l) => talentBuildsEqual(l.talentString, profile.talentString))
      ?.name ?? null;
  const savedLoadoutCount = profile?.savedLoadouts?.length ?? 0;

  return (
    <div className='w-full'>
      {/* Character summary — shown when profile is valid */}
      {profile && (
        <div className='mb-4 flex items-center gap-3 animate-in'>
          <div className='flex items-center gap-2.5'>
            <div className='h-9 w-9 rounded-md bg-amber-500/15 border border-amber-500/25 flex items-center justify-center'>
              <span className='text-accent-amber text-sm font-bold'>
                {profile.level}
              </span>
            </div>
            <div>
              <div className='flex items-baseline gap-2'>
                <h2 className='text-base font-semibold text-amber-50 tracking-tight'>
                  {profile.characterName}
                </h2>
                <span className='text-xs text-text-muted'>
                  {formatRealm(profile.realm)}-{profile.region.toUpperCase()}
                </span>
              </div>
              <div className='flex items-center gap-1.5 text-xs text-text-tertiary'>
                <span className='text-accent-amber/80 font-medium'>
                  {formatSpec(profile.spec)}
                </span>
                <span className='text-text-faint'>&middot;</span>
                <span>{totalEquipped} equipped</span>
                {totalBag > 0 && (
                  <>
                    <span className='text-text-faint'>&middot;</span>
                    <span>{totalBag} in bags</span>
                  </>
                )}
                {profile.talentString && (
                  <>
                    <span className='text-text-faint'>&middot;</span>
                    <span>
                      <span className='text-text-faint'>Talents:</span>{' '}
                      <span className='text-accent-amber/80 font-medium'>
                        {activeTalentName ?? 'Custom Build'}
                      </span>
                    </span>
                  </>
                )}
                {savedLoadoutCount > 0 && (
                  <>
                    <span className='text-text-faint'>&middot;</span>
                    <span>{savedLoadoutCount} saved {savedLoadoutCount === 1 ? 'loadout' : 'loadouts'}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Textarea + error */}
      <div className='relative group'>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder='Paste your SimulationCraft addon export here&hellip;'
          spellCheck={false}
          rows={profile ? 3 : 6}
          className={[
            'w-full rounded-lg px-3.5 py-2.5 text-sm font-mono leading-relaxed resize-none',
            'bg-surface-secondary border transition-all duration-150 outline-none',
            'placeholder:text-text-faint placeholder:font-sans placeholder:not-italic',
            error
              ? 'border-red-500/40 text-red-200'
              : isFocused
                ? 'border-amber-500/40 text-text-primary shadow-[0_0_0_1px_rgba(245,158,11,0.1)]'
                : hasInput && profile
                  ? 'border-border-input text-text-tertiary'
                  : 'border-border-primary text-text-secondary hover:border-border-input',
          ].join(' ')}
        />

        {/* Clear button */}
        {hasInput && (
          <button
            onClick={handleClear}
            className='absolute top-2.5 right-2.5 p-1 rounded text-text-faint hover:text-text-secondary hover:bg-surface-hover transition-colors'
            title='Clear'>
            <svg
              width='14'
              height='14'
              viewBox='0 0 14 14'
              fill='none'>
              <path
                d='M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
              />
            </svg>
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className='mt-2.5 flex items-start gap-2 text-sm animate-in'>
          <svg
            className='mt-0.5 shrink-0 text-accent-red'
            width='15'
            height='15'
            viewBox='0 0 15 15'
            fill='none'>
            <circle
              cx='7.5'
              cy='7.5'
              r='6'
              stroke='currentColor'
              strokeWidth='1.2'
            />
            <path
              d='M7.5 4.5V8'
              stroke='currentColor'
              strokeWidth='1.2'
              strokeLinecap='round'
            />
            <circle
              cx='7.5'
              cy='10'
              r='0.75'
              fill='currentColor'
            />
          </svg>
          <p className='text-accent-red/90 leading-snug'>{error}</p>
        </div>
      )}

      {/* Idle hint — only shown when empty and no profile */}
      {!hasInput && !profile && (
        <p className='mt-2 text-xs text-text-faint leading-relaxed'>
          Open the{' '}
          <span className='text-text-muted'>SimulationCraft addon</span> in WoW,
          go to the export tab, and copy everything.
        </p>
      )}
    </div>
  );
}
