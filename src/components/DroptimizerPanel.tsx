import { useState } from 'react';
import type { SimcProfile, DroptimizerSourceType, DroptimizerSourceConfig } from '../lib/types';
import {
  RAID_INSTANCES,
  MYTHIC_PLUS_DUNGEONS,
  WORLD_BOSSES,
  CATALYST_MAPPINGS,
  RAID_DIFFICULTY_LABELS,
  RAID_ILVL_MAP,
  KEYSTONE_ILVL_TABLE,
  WORLD_BOSS_ILVL,
  type RaidDifficulty,
} from '../lib/presets/loot-tables';
import {
  TIER_SETS,
  CLASS_TO_TIER_SET_ID,
  TIER_SLOT_ORDER,
} from '../lib/presets/season-config';
import DroptimizerItemList from './DroptimizerItemList';

interface DroptimizerPanelProps {
  profile: SimcProfile;
}

const RAID_DIFFICULTIES: RaidDifficulty[] = ['lfr', 'normal', 'heroic', 'mythic'];

/** Non-vault keystone entries for the selector. */
const KEYSTONE_OPTIONS = KEYSTONE_ILVL_TABLE.filter((e) => !e.isVault);

// ── Source type card definitions ────────────────────────────────────────────

interface SourceCardDef {
  type: DroptimizerSourceType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const SWORD_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
    <path d="M13 19l6-6" />
    <path d="M16 16l4 4" />
    <path d="M19 21l2-2" />
  </svg>
);

const KEY_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const GLOBE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const CATALYST_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v18" />
    <path d="M3 12h18" />
    <path d="M8 8l8 8" />
    <path d="M16 8l-8 8" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const SOURCE_CARDS: SourceCardDef[] = [
  { type: 'raid', label: 'Raids', description: 'Raid boss drops by difficulty', icon: SWORD_ICON },
  { type: 'mythicplus', label: 'Mythic+', description: 'Dungeon drops by key level', icon: KEY_ICON },
  { type: 'worldboss', label: 'World Bosses', description: `Fixed ilvl ${WORLD_BOSS_ILVL}`, icon: GLOBE_ICON },
  { type: 'catalyst', label: 'Catalyst', description: 'Convert armor to tier pieces', icon: CATALYST_ICON },
];

// ── Main component ─────────────────────────────────────────────────────────

export default function DroptimizerPanel({ profile }: DroptimizerPanelProps) {
  const [sourceConfig, setSourceConfig] = useState<DroptimizerSourceConfig>({
    type: 'raid',
    difficulty: 'heroic',
    raidIds: null,
  });

  const className = profile.className ?? profile.spec?.split(' ')[0]?.toLowerCase() ?? '';

  // ── Source card click handler ──────────────────────────────────────────────

  function handleSourceSelect(type: DroptimizerSourceType) {
    switch (type) {
      case 'raid':
        setSourceConfig({ type: 'raid', difficulty: 'heroic', raidIds: null });
        break;
      case 'mythicplus':
        setSourceConfig({ type: 'mythicplus', dungeonIds: null, keystoneLevel: 10 });
        break;
      case 'worldboss':
        setSourceConfig({ type: 'worldboss' });
        break;
      case 'catalyst':
        setSourceConfig({ type: 'catalyst' });
        break;
    }
  }

  return (
    <div className="space-y-6">
      {/* Source type selector cards */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3">
          Loot Source
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {SOURCE_CARDS.map((card) => {
            const isActive = sourceConfig.type === card.type;
            return (
              <button
                key={card.type}
                onClick={() => handleSourceSelect(card.type)}
                className={[
                  'group relative flex flex-col items-start gap-1.5 rounded-lg border px-3.5 py-3 text-left transition-all',
                  isActive
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-border-primary bg-surface-secondary hover:border-border-primary/80 hover:bg-surface-secondary/80',
                ].join(' ')}
              >
                <div className={[
                  'transition-colors',
                  isActive ? 'text-amber-500' : 'text-text-muted group-hover:text-text-secondary',
                ].join(' ')}>
                  {card.icon}
                </div>
                <div>
                  <div className={[
                    'text-xs font-semibold transition-colors',
                    isActive ? 'text-text-heading' : 'text-text-secondary',
                  ].join(' ')}>
                    {card.label}
                  </div>
                  <div className="text-[10px] text-text-faint leading-tight mt-0.5">
                    {card.description}
                  </div>
                </div>
                {isActive && (
                  <span className="absolute top-0 left-0 right-0 h-0.5 rounded-t-lg bg-amber-500/60" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Source-specific configuration */}
      <div className="rounded-lg border border-border-primary bg-surface-secondary p-4">
        {sourceConfig.type === 'raid' && (
          <RaidSourceConfig
            config={sourceConfig}
            onChange={setSourceConfig}
          />
        )}
        {sourceConfig.type === 'mythicplus' && (
          <MythicPlusSourceConfig
            config={sourceConfig}
            onChange={setSourceConfig}
          />
        )}
        {sourceConfig.type === 'worldboss' && (
          <WorldBossSourceConfig />
        )}
        {sourceConfig.type === 'catalyst' && (
          <CatalystSourceConfig className={className} />
        )}
      </div>

      {/* Item list with configuration options */}
      <DroptimizerItemList
        profile={profile}
        sourceConfig={sourceConfig}
        className={className}
      />
    </div>
  );
}

// ── Raid source configuration ──────────────────────────────────────────────

function RaidSourceConfig({
  config,
  onChange,
}: {
  config: Extract<DroptimizerSourceConfig, { type: 'raid' }>;
  onChange: (config: DroptimizerSourceConfig) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Difficulty selector */}
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2 block">
          Difficulty
        </label>
        <div className="flex gap-1.5">
          {RAID_DIFFICULTIES.map((diff) => {
            const isActive = config.difficulty === diff;
            const labels = RAID_DIFFICULTY_LABELS[diff];
            const ilvlRange = RAID_ILVL_MAP[diff];
            const minIlvl = ilvlRange[1];
            const maxIlvl = ilvlRange[4];
            return (
              <button
                key={diff}
                onClick={() => onChange({ ...config, difficulty: diff })}
                className={[
                  'flex flex-col items-center rounded-md border px-4 py-2 transition-all min-w-[100px]',
                  isActive
                    ? 'border-amber-500/40 bg-amber-500/8 text-text-heading'
                    : 'border-border-primary bg-surface-page text-text-muted hover:text-text-secondary hover:border-border-primary/80',
                ].join(' ')}
              >
                <span className="text-xs font-semibold">{labels.label}</span>
                <span className={[
                  'text-[10px] mt-0.5',
                  isActive ? 'text-amber-500/80' : 'text-text-faint',
                ].join(' ')}>
                  {labels.track}
                </span>
                <span className="text-[10px] text-text-faint mt-0.5 tabular-nums">
                  {minIlvl}–{maxIlvl}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Raid instance selector */}
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2 block">
          Instance
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onChange({ ...config, raidIds: null })}
            className={[
              'rounded-md border px-3 py-1.5 text-xs font-medium transition-all',
              config.raidIds === null
                ? 'border-amber-500/40 bg-amber-500/8 text-text-heading'
                : 'border-border-primary bg-surface-page text-text-muted hover:text-text-secondary',
            ].join(' ')}
          >
            All Raids
          </button>
          {RAID_INSTANCES.map((raid) => {
            const isSelected = config.raidIds?.includes(raid.id) ?? false;
            return (
              <button
                key={raid.id}
                onClick={() => {
                  if (config.raidIds === null) {
                    // Switching from "All" to individual
                    onChange({ ...config, raidIds: [raid.id] });
                  } else if (isSelected) {
                    const next = config.raidIds.filter((id) => id !== raid.id);
                    onChange({ ...config, raidIds: next.length === 0 ? null : next });
                  } else {
                    onChange({ ...config, raidIds: [...config.raidIds, raid.id] });
                  }
                }}
                className={[
                  'rounded-md border px-3 py-1.5 text-xs font-medium transition-all',
                  isSelected
                    ? 'border-amber-500/40 bg-amber-500/8 text-text-heading'
                    : 'border-border-primary bg-surface-page text-text-muted hover:text-text-secondary',
                ].join(' ')}
              >
                {raid.name}
                <span className="ml-1.5 text-text-faint">
                  {raid.encounters.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Mythic+ source configuration ───────────────────────────────────────────

function MythicPlusSourceConfig({
  config,
  onChange,
}: {
  config: Extract<DroptimizerSourceConfig, { type: 'mythicplus' }>;
  onChange: (config: DroptimizerSourceConfig) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Keystone level selector */}
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2 block">
          Keystone Level
        </label>
        <div className="flex flex-wrap gap-1.5">
          {KEYSTONE_OPTIONS.map((entry) => {
            const isActive = config.keystoneLevel === entry.keystoneLevel;
            return (
              <button
                key={entry.keystoneLevel}
                onClick={() => onChange({ ...config, keystoneLevel: entry.keystoneLevel })}
                className={[
                  'flex flex-col items-center rounded-md border px-3 py-1.5 transition-all min-w-[68px]',
                  isActive
                    ? 'border-amber-500/40 bg-amber-500/8 text-text-heading'
                    : 'border-border-primary bg-surface-page text-text-muted hover:text-text-secondary',
                ].join(' ')}
              >
                <span className="text-xs font-semibold">{entry.label}</span>
                <span className={[
                  'text-[10px] tabular-nums',
                  isActive ? 'text-amber-500/80' : 'text-text-faint',
                ].join(' ')}>
                  ilvl {entry.ilvl}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dungeon selector */}
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2 block">
          Dungeon
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onChange({ ...config, dungeonIds: null })}
            className={[
              'rounded-md border px-3 py-1.5 text-xs font-medium transition-all',
              config.dungeonIds === null
                ? 'border-amber-500/40 bg-amber-500/8 text-text-heading'
                : 'border-border-primary bg-surface-page text-text-muted hover:text-text-secondary',
            ].join(' ')}
          >
            All Dungeons
          </button>
          {MYTHIC_PLUS_DUNGEONS.map((dg) => {
            const isSelected = config.dungeonIds?.includes(dg.id) ?? false;
            return (
              <button
                key={dg.id}
                onClick={() => {
                  if (config.dungeonIds === null) {
                    onChange({ ...config, dungeonIds: [dg.id] });
                  } else if (isSelected) {
                    const next = config.dungeonIds.filter((id) => id !== dg.id);
                    onChange({ ...config, dungeonIds: next.length === 0 ? null : next });
                  } else {
                    onChange({ ...config, dungeonIds: [...config.dungeonIds, dg.id] });
                  }
                }}
                className={[
                  'rounded-md border px-3 py-1.5 text-xs font-medium transition-all',
                  isSelected
                    ? 'border-amber-500/40 bg-amber-500/8 text-text-heading'
                    : 'border-border-primary bg-surface-page text-text-muted hover:text-text-secondary',
                ].join(' ')}
              >
                {dg.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── World Boss source configuration ────────────────────────────────────────

function WorldBossSourceConfig() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Item Level
        </span>
        <span className="text-xs font-semibold tabular-nums text-text-heading">{WORLD_BOSS_ILVL}</span>
        <span className="text-[10px] text-text-faint">(Champion)</span>
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2 block">
          World Bosses
        </label>
        <div className="flex flex-wrap gap-2">
          {WORLD_BOSSES.map((wb) => (
            <div
              key={wb.id}
              className="rounded-md border border-border-primary bg-surface-page px-3 py-1.5 text-xs text-text-secondary"
            >
              {wb.name}
              <span className="ml-1.5 text-text-faint">{wb.items.length} items</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Catalyst source configuration ──────────────────────────────────────────

function CatalystSourceConfig({ className }: { className: string }) {
  const setId = CLASS_TO_TIER_SET_ID[className];
  const tierSet = setId ? TIER_SETS.find((s) => s.id === setId) : undefined;

  if (!tierSet) {
    return (
      <div className="text-xs text-text-muted">
        No tier set data found for class "{className}".
      </div>
    );
  }

  // Count catalyst-eligible source items per slot
  const slotInfo = TIER_SLOT_ORDER.map((slot, idx) => {
    const tierItemId = tierSet.itemIds[idx];
    const mapping = CATALYST_MAPPINGS.find((cm) => cm.slot === slot);
    const sourceCount = mapping?.sourceItemIds.length ?? 0;
    return { slot, tierItemId, sourceCount };
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Tier Set
        </span>
        <span className="text-xs font-semibold text-text-heading">{tierSet.name}</span>
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2 block">
          Tier Slots
        </label>
        <div className="flex flex-wrap gap-2">
          {slotInfo.map(({ slot, sourceCount }) => (
            <div
              key={slot}
              className="rounded-md border border-border-primary bg-surface-page px-3 py-2 text-xs"
            >
              <div className="font-semibold text-text-secondary capitalize">{slot}</div>
              <div className="text-[10px] text-text-faint mt-0.5">
                {sourceCount} convertible {sourceCount === 1 ? 'item' : 'items'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
