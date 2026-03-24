import type { SimcProfile } from '../lib/types';
import GearSlotCard, { SLOT_ORDER } from './GearSlotCard';

interface GearPanelProps {
  profile: SimcProfile;
}

export default function GearPanel({ profile }: GearPanelProps) {
  // Only show slots that have at least one item
  const activeSlots = SLOT_ORDER.filter((slot) => {
    const items = profile.gear[slot];
    return items && items.length > 0;
  });

  const totalBag = Object.values(profile.gear).reduce(
    (sum, items) => sum + items.filter((i) => !i.isEquipped).length,
    0,
  );

  return (
    <div className="animate-in">
      {/* Section header */}
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-300 tracking-tight">
          Gear Slots
        </h2>
        {totalBag > 0 && (
          <span className="text-[11px] text-zinc-600">
            {totalBag} bag {totalBag === 1 ? 'item' : 'items'} available to compare
          </span>
        )}
      </div>

      {/* Slot grid — responsive: 1 col mobile, 2 col tablet, 3 col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeSlots.map((slot, index) => (
          <GearSlotCard
            key={slot}
            slot={slot}
            items={profile.gear[slot]}
            delay={index * 30}
          />
        ))}
      </div>
    </div>
  );
}
