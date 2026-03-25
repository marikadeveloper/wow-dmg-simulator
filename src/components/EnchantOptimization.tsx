import { useState, useMemo } from 'react';
import { ENCHANT_PRESETS, type EnchantPreset } from '../lib/presets/season-config';

// ── Slot category definitions ────────────────────────────────────────────────

interface EnchantSlotGroup {
  /** Preset slot key (matches EnchantPreset.slot) */
  key: string;
  /** Display label */
  label: string;
}

const ENCHANT_SLOT_GROUPS: EnchantSlotGroup[] = [
  { key: 'head', label: 'Head' },
  { key: 'shoulder', label: 'Shoulders' },
  { key: 'chest', label: 'Chest' },
  { key: 'finger', label: 'Rings' },
  { key: 'legs', label: 'Legs' },
  { key: 'feet', label: 'Feet' },
  { key: 'main_hand', label: 'Weapons' },
];

/** Check if an enchant is a Q2 (quality 2) variant. */
function isQ2(enchant: EnchantPreset): boolean {
  return enchant.name.includes('(Q2)');
}

/** Strip the "(Q2)" suffix for compact display. */
function displayName(enchant: EnchantPreset): string {
  return enchant.name.replace(' (Q2)', '');
}

// ── Component ────────────────────────────────────────────────────────────────

interface EnchantOptimizationProps {
  /** Set of enchant IDs the user has selected to compare. */
  selectedEnchantIds: Set<number>;
  /** Toggle an enchant on/off. */
  onToggleEnchant: (enchantId: number) => void;
  /** Number of enchantable slots the user has in their gear. */
  enchantableSlotCount: number;
}

export default function EnchantOptimization({
  selectedEnchantIds,
  onToggleEnchant,
  enchantableSlotCount,
}: EnchantOptimizationProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showQ1, setShowQ1] = useState(false);

  // Group enchants by slot category, split into base and Q2
  const enchantsBySlot = useMemo(() => {
    const map = new Map<string, { base: EnchantPreset[]; q2: EnchantPreset[] }>();
    for (const group of ENCHANT_SLOT_GROUPS) {
      map.set(group.key, { base: [], q2: [] });
    }
    for (const enchant of ENCHANT_PRESETS) {
      const group = map.get(enchant.slot);
      if (!group) continue;
      if (isQ2(enchant)) {
        group.q2.push(enchant);
      } else {
        group.base.push(enchant);
      }
    }
    return map;
  }, []);

  const selectedCount = selectedEnchantIds.size;
  const hasQ1Selected = useMemo(
    () => ENCHANT_PRESETS.some((e) => selectedEnchantIds.has(e.id) && !isQ2(e)),
    [selectedEnchantIds],
  );

  // Auto-expand Q1 section if user has Q1 enchants selected
  const effectiveShowQ1 = showQ1 || hasQ1Selected;

  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
      {/* Header — always visible, click to collapse/expand */}
      <button
        type="button"
        onClick={() => setIsExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-zinc-800/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {/* Enchant icon — wand with sparkle */}
          <svg
            className="w-4 h-4 text-zinc-500"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 14L10 6" />
            <path d="M10 6L12.5 3.5" />
            <path d="M11.5 2.5L13.5 4.5" />
            <circle cx="13" cy="3" r="0.5" fill="currentColor" stroke="none" />
            <circle cx="7" cy="3" r="0.4" fill="currentColor" stroke="none" />
            <circle cx="5" cy="5" r="0.4" fill="currentColor" stroke="none" />
          </svg>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Enchant Optimization
          </h3>
          {selectedCount > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-400 border border-zinc-700/30 tabular-nums">
              {selectedCount} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Enchantable slot count badge */}
          {enchantableSlotCount > 0 && (
            <span className="text-[10px] text-zinc-600 tabular-nums">
              {enchantableSlotCount} enchantable {enchantableSlotCount === 1 ? 'slot' : 'slots'}
            </span>
          )}
          {enchantableSlotCount === 0 && (
            <span className="text-[10px] text-zinc-700 italic">
              no enchantable slots
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
          {enchantableSlotCount === 0 ? (
            <div className="px-3.5 py-4 text-center text-xs text-zinc-600">
              None of your selected gear slots support enchanting.
              <br />
              <span className="text-zinc-700">
                Enchantable slots include head, shoulders, chest, legs, feet, rings, and weapons.
              </span>
            </div>
          ) : (
            <div className="px-3.5 py-3 space-y-3">
              {/* Best quality (Q2) enchants by slot — shown by default */}
              {ENCHANT_SLOT_GROUPS.map((slotGroup) => {
                const group = enchantsBySlot.get(slotGroup.key);
                if (!group || group.q2.length === 0) return null;
                return (
                  <EnchantSlotSection
                    key={slotGroup.key}
                    slotGroup={slotGroup}
                    enchants={group.q2}
                    selectedEnchantIds={selectedEnchantIds}
                    onToggleEnchant={onToggleEnchant}
                  />
                );
              })}

              {/* Lower quality (Q1) toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowQ1((p) => !p)}
                  className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <svg
                    className={[
                      'w-3 h-3 transition-transform duration-150',
                      effectiveShowQ1 ? 'rotate-0' : '-rotate-90',
                    ].join(' ')}
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M4 6L8 10L12 6" />
                  </svg>
                  {effectiveShowQ1 ? 'Hide' : 'Show'} lower quality (Q1) variants
                </button>
              </div>

              {/* Lower quality (Q1) enchants */}
              {effectiveShowQ1 && (
                <div className="space-y-3 animate-in" style={{ animationDuration: '150ms' }}>
                  {ENCHANT_SLOT_GROUPS.map((slotGroup) => {
                    const group = enchantsBySlot.get(slotGroup.key);
                    if (!group || group.base.length === 0) return null;
                    return (
                      <EnchantSlotSection
                        key={`q1-${slotGroup.key}`}
                        slotGroup={slotGroup}
                        enchants={group.base}
                        selectedEnchantIds={selectedEnchantIds}
                        onToggleEnchant={onToggleEnchant}
                        isQ2
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Enchant Slot Section ─────────────────────────────────────────────────────

interface EnchantSlotSectionProps {
  slotGroup: EnchantSlotGroup;
  enchants: EnchantPreset[];
  selectedEnchantIds: Set<number>;
  onToggleEnchant: (enchantId: number) => void;
  isQ2?: boolean;
}

function EnchantSlotSection({
  slotGroup,
  enchants,
  selectedEnchantIds,
  onToggleEnchant,
  isQ2: isQ2Section = false,
}: EnchantSlotSectionProps) {
  const selectedInSlot = enchants.filter((e) => selectedEnchantIds.has(e.id)).length;

  return (
    <div>
      {/* Slot label */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-60" />
        <span className={`text-[11px] font-medium ${isQ2Section ? 'text-zinc-600' : 'text-zinc-500'}`}>
          {slotGroup.label}
        </span>
        {selectedInSlot > 0 && (
          <span className="text-[10px] text-zinc-600 tabular-nums">
            {selectedInSlot} selected
          </span>
        )}
      </div>

      {/* Enchant chips */}
      <div className="flex flex-wrap gap-1.5">
        {enchants.map((enchant) => {
          const selected = selectedEnchantIds.has(enchant.id);
          return (
            <EnchantChip
              key={enchant.id}
              enchant={enchant}
              selected={selected}
              onToggle={() => onToggleEnchant(enchant.id)}
              isQ2={isQ2Section}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Enchant Chip ─────────────────────────────────────────────────────────────

interface EnchantChipProps {
  enchant: EnchantPreset;
  selected: boolean;
  onToggle: () => void;
  isQ2: boolean;
}

function EnchantChip({ enchant, selected, onToggle, isQ2: isQ2Chip }: EnchantChipProps) {
  const name = displayName(enchant);

  return (
    <button
      type="button"
      onClick={onToggle}
      title={`${enchant.name}\n${enchant.stat}`}
      className={[
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] transition-all duration-150',
        'cursor-pointer select-none',
        selected
          ? 'border-emerald-500/40 bg-emerald-500/8 text-emerald-400 font-medium'
          : `border-zinc-800/40 hover:bg-emerald-500/5 ${isQ2Chip ? 'text-zinc-600' : 'text-zinc-500'} hover:text-zinc-300`,
        isQ2Chip && !selected ? 'opacity-70' : '',
      ].join(' ')}
      aria-pressed={selected}
    >
      <span className="truncate">{name}</span>
      <span className={`text-[10px] ${selected ? 'opacity-70' : 'text-zinc-700'}`}>
        {enchant.stat}
      </span>
    </button>
  );
}
