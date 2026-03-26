import { useMemo } from 'react';
import type { SimcProfile, SimResult, OptimizationAxis, GearItem } from '../lib/types';

interface SimResultsPaperDollProps {
  profile: SimcProfile;
  results: SimResult[];
  axes: OptimizationAxis[];
}

/** Paper doll slot definition */
interface SlotDef {
  simcSlot: string;       // e.g. "head", "trinket1"
  label: string;          // display name
}

const LEFT_SLOTS: SlotDef[] = [
  { simcSlot: 'head', label: 'Head' },
  { simcSlot: 'neck', label: 'Neck' },
  { simcSlot: 'shoulder', label: 'Shoulder' },
  { simcSlot: 'back', label: 'Back' },
  { simcSlot: 'chest', label: 'Chest' },
  { simcSlot: 'wrist', label: 'Wrist' },
];

const RIGHT_SLOTS: SlotDef[] = [
  { simcSlot: 'hands', label: 'Hands' },
  { simcSlot: 'waist', label: 'Waist' },
  { simcSlot: 'legs', label: 'Legs' },
  { simcSlot: 'feet', label: 'Feet' },
  { simcSlot: 'finger1', label: 'Ring 1' },
  { simcSlot: 'finger2', label: 'Ring 2' },
];

const BOTTOM_LEFT: SlotDef[] = [
  { simcSlot: 'trinket1', label: 'Trinket 1' },
  { simcSlot: 'main_hand', label: 'Main Hand' },
];

const BOTTOM_RIGHT: SlotDef[] = [
  { simcSlot: 'trinket2', label: 'Trinket 2' },
  { simcSlot: 'off_hand', label: 'Off Hand' },
];

function formatDps(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/** Resolve which item the best result uses for a given slot */
function resolveSlotItem(
  slot: string,
  bestResult: SimResult,
  profile: SimcProfile,
): GearItem | undefined {
  const items = profile.gear[slot];
  if (!items || items.length === 0) return undefined;

  const axisKey = `slot:${slot}`;
  const chosenOptionId = bestResult.axes[axisKey];

  if (chosenOptionId) {
    // Find the item matching the chosen option ID
    const match = items.find((item) => String(item.id) === chosenOptionId);
    if (match) return match;
  }

  // No axis for this slot or no match — use equipped item
  return items.find((item) => item.isEquipped) ?? items[0];
}

/** Check if the best result changed this slot vs baseline */
function isSlotChanged(
  slot: string,
  bestResult: SimResult,
  baseline: SimResult | undefined,
): boolean {
  if (!baseline) return false;
  const axisKey = `slot:${slot}`;
  const bestOpt = bestResult.axes[axisKey];
  const baseOpt = baseline.axes[axisKey];
  // Changed if both have the axis and they differ, or best has it and baseline doesn't
  if (!bestOpt && !baseOpt) return false;
  return bestOpt !== baseOpt;
}

/** Resolve enchant/gem changes for a slot */
function getSlotModifiers(
  slot: string,
  bestResult: SimResult,
  baseline: SimResult | undefined,
  axes: OptimizationAxis[],
): { label: string; changed: boolean }[] {
  const mods: { label: string; changed: boolean }[] = [];

  for (const axis of axes) {
    // Match enchant and gem axes for this slot
    const isEnchant = axis.id === `enchant:${slot}`;
    const isGem = axis.id.startsWith(`gem:${slot}:`);
    if (!isEnchant && !isGem) continue;
    if (axis.options.length <= 1) continue;

    const bestOpt = bestResult.axes[axis.id];
    const baseOpt = baseline?.axes[axis.id];
    if (!bestOpt) continue;

    const option = axis.options.find((o) => o.id === bestOpt);
    if (!option) continue;

    mods.push({
      label: option.label,
      changed: bestOpt !== baseOpt,
    });
  }

  return mods;
}

function SlotCard({
  slotDef,
  item,
  changed,
  modifiers,
  animDelay,
}: {
  slotDef: SlotDef;
  item: GearItem | undefined;
  changed: boolean;
  modifiers: { label: string; changed: boolean }[];
  animDelay: number;
}) {
  const itemName = item?.name ?? (item ? `Item #${item.id}` : 'Empty');
  const ilvl = item?.ilvl;

  return (
    <div
      className="relative group"
      style={{ animation: `paperdoll-slot-in 0.35s ease-out ${animDelay}ms both` }}
    >
      <div
        className={[
          'relative rounded-md border px-2.5 py-1.5 transition-all duration-200',
          changed
            ? 'border-amber-500/40 bg-amber-500/[0.06]'
            : 'border-zinc-800/50 bg-zinc-900/40',
        ].join(' ')}
      >
        {/* Glow effect for changed slots */}
        {changed && (
          <div
            className="absolute -inset-px rounded-md pointer-events-none"
            style={{
              boxShadow: '0 0 12px -2px rgba(245,158,11,0.15), inset 0 1px 0 rgba(245,158,11,0.08)',
            }}
          />
        )}

        {/* Slot label */}
        <div className="flex items-center justify-between mb-0.5">
          <span
            className={[
              'text-[9px] uppercase tracking-wider font-medium',
              changed ? 'text-amber-500/70' : 'text-zinc-600',
            ].join(' ')}
          >
            {slotDef.label}
          </span>
          {ilvl && (
            <span
              className={[
                'text-[10px] tabular-nums font-mono',
                changed ? 'text-amber-400/60' : 'text-zinc-600',
              ].join(' ')}
            >
              {ilvl}
            </span>
          )}
        </div>

        {/* Item name */}
        <div
          className={[
            'text-[11px] leading-tight truncate',
            changed ? 'text-amber-200/90' : 'text-zinc-400',
          ].join(' ')}
          title={itemName}
        >
          {changed && (
            <span className="inline-block w-1 h-1 rounded-full bg-amber-400 mr-1 relative -top-px" />
          )}
          {itemName}
        </div>

        {/* Enchant/gem modifiers */}
        {modifiers.length > 0 && (
          <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 mt-1">
            {modifiers.map((mod, i) => (
              <span
                key={i}
                className={[
                  'text-[8px] leading-none',
                  mod.changed ? 'text-amber-400/60' : 'text-zinc-600',
                ].join(' ')}
                title={mod.label}
              >
                {mod.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SimResultsPaperDoll({
  profile,
  results,
  axes,
}: SimResultsPaperDollProps) {
  const best = results[0];
  const baseline = results.find((r) => r.isBaseline);

  if (!best) return null;

  const allSlots = useMemo(() => {
    const allDefs = [...LEFT_SLOTS, ...RIGHT_SLOTS, ...BOTTOM_LEFT, ...BOTTOM_RIGHT];
    return allDefs.map((slotDef) => ({
      slotDef,
      item: resolveSlotItem(slotDef.simcSlot, best, profile),
      changed: isSlotChanged(slotDef.simcSlot, best, baseline),
      modifiers: getSlotModifiers(slotDef.simcSlot, best, baseline, axes),
    }));
  }, [best, baseline, profile, axes]);

  // Split back into groups for rendering
  const leftData = allSlots.slice(0, LEFT_SLOTS.length);
  const rightData = allSlots.slice(LEFT_SLOTS.length, LEFT_SLOTS.length + RIGHT_SLOTS.length);
  const bottomLeftData = allSlots.slice(
    LEFT_SLOTS.length + RIGHT_SLOTS.length,
    LEFT_SLOTS.length + RIGHT_SLOTS.length + BOTTOM_LEFT.length,
  );
  const bottomRightData = allSlots.slice(
    LEFT_SLOTS.length + RIGHT_SLOTS.length + BOTTOM_LEFT.length,
  );

  const changeCount = allSlots.filter((s) => s.changed).length;

  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-zinc-800/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h3 className="text-xs font-semibold text-zinc-400 tracking-wide">
            Best Gear
          </h3>
          {changeCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/15 font-medium">
              {changeCount} {changeCount === 1 ? 'change' : 'changes'}
            </span>
          )}
        </div>
        <span className="text-[11px] tabular-nums font-mono text-amber-400/80">
          {formatDps(best.dps)} DPS
        </span>
      </div>

      {/* Paper doll grid */}
      <div className="p-4">
        {/* Main two-column layout */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-x-3">
          {/* Left column */}
          <div className="space-y-1.5">
            {leftData.map((data, i) => (
              <SlotCard
                key={data.slotDef.simcSlot}
                slotDef={data.slotDef}
                item={data.item}
                changed={data.changed}
                modifiers={data.modifiers}
                animDelay={i * 50}
              />
            ))}
          </div>

          {/* Center divider — subtle vertical line suggesting a silhouette */}
          <div className="flex flex-col items-center justify-center px-1">
            <div className="w-px h-full bg-gradient-to-b from-transparent via-zinc-800/40 to-transparent" />
          </div>

          {/* Right column */}
          <div className="space-y-1.5">
            {rightData.map((data, i) => (
              <SlotCard
                key={data.slotDef.simcSlot}
                slotDef={data.slotDef}
                item={data.item}
                changed={data.changed}
                modifiers={data.modifiers}
                animDelay={(i + LEFT_SLOTS.length) * 50}
              />
            ))}
          </div>
        </div>

        {/* Bottom row — weapons & trinkets */}
        <div className="mt-3 pt-3 border-t border-zinc-800/30">
          <div className="grid grid-cols-2 gap-3">
            {/* Bottom left: Trinket 1 + Main Hand */}
            <div className="space-y-1.5">
              {bottomLeftData.map((data, i) => (
                <SlotCard
                  key={data.slotDef.simcSlot}
                  slotDef={data.slotDef}
                  item={data.item}
                  changed={data.changed}
                  modifiers={data.modifiers}
                  animDelay={(LEFT_SLOTS.length + RIGHT_SLOTS.length + i) * 50}
                />
              ))}
            </div>
            {/* Bottom right: Trinket 2 + Off Hand */}
            <div className="space-y-1.5">
              {bottomRightData.map((data, i) => (
                <SlotCard
                  key={data.slotDef.simcSlot}
                  slotDef={data.slotDef}
                  item={data.item}
                  changed={data.changed}
                  modifiers={data.modifiers}
                  animDelay={(LEFT_SLOTS.length + RIGHT_SLOTS.length + BOTTOM_LEFT.length + i) * 50}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes paperdoll-slot-in {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
