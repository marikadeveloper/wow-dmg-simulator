import { useState, useMemo } from 'react';
import { GEM_PRESETS, type GemPreset } from '../lib/presets/season-config';

/** Wowhead icon CDN base URL. */
const WOWHEAD_ICON_URL = 'https://wow.zamimg.com/images/wow/icons/small';

function getGemIconUrl(gem: GemPreset): string {
  return `${WOWHEAD_ICON_URL}/${gem.icon}.jpg`;
}

// ── Gem family definitions ───────────────────────────────────────────────────

interface GemFamily {
  key: string;
  label: string;
  stat: string;
  /** Tailwind color classes for this family's accent */
  accent: {
    border: string;
    borderSelected: string;
    bg: string;
    bgSelected: string;
    text: string;
    dot: string;
  };
}

const GEM_FAMILIES: GemFamily[] = [
  {
    key: 'diamond',
    label: 'Eversong Diamond',
    stat: 'Primary',
    accent: {
      border: 'border-orange-500/10',
      borderSelected: 'border-orange-500/40',
      bg: 'hover:bg-orange-500/5',
      bgSelected: 'bg-orange-500/8',
      text: 'text-orange-400',
      dot: 'bg-orange-400',
    },
  },
  {
    key: 'peridot',
    label: 'Peridot',
    stat: 'Haste',
    accent: {
      border: 'border-emerald-500/10',
      borderSelected: 'border-emerald-500/40',
      bg: 'hover:bg-emerald-500/5',
      bgSelected: 'bg-emerald-500/8',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
    },
  },
  {
    key: 'amethyst',
    label: 'Amethyst',
    stat: 'Mastery',
    accent: {
      border: 'border-purple-500/10',
      borderSelected: 'border-purple-500/40',
      bg: 'hover:bg-purple-500/5',
      bgSelected: 'bg-purple-500/8',
      text: 'text-purple-400',
      dot: 'bg-purple-400',
    },
  },
  {
    key: 'garnet',
    label: 'Garnet',
    stat: 'Critical Strike',
    accent: {
      border: 'border-red-500/10',
      borderSelected: 'border-red-500/40',
      bg: 'hover:bg-red-500/5',
      bgSelected: 'bg-red-500/8',
      text: 'text-red-400',
      dot: 'bg-red-400',
    },
  },
  {
    key: 'lapis',
    label: 'Lapis',
    stat: 'Versatility',
    accent: {
      border: 'border-blue-500/10',
      borderSelected: 'border-blue-500/40',
      bg: 'hover:bg-blue-500/5',
      bgSelected: 'bg-blue-500/8',
      text: 'text-blue-400',
      dot: 'bg-blue-400',
    },
  },
];

/** Map a gem preset to its family key. */
function getGemFamilyKey(gem: GemPreset): string {
  const n = gem.name.toLowerCase();
  if (n.includes('diamond')) return 'diamond';
  if (n.includes('peridot')) return 'peridot';
  if (n.includes('amethyst')) return 'amethyst';
  if (n.includes('garnet')) return 'garnet';
  if (n.includes('lapis')) return 'lapis';
  return 'diamond'; // fallback
}

/** Check if a gem is flawless (rare quality). */
function isFlawless(gem: GemPreset): boolean {
  return gem.name.startsWith('Flawless') || gem.name.includes('Eversong Diamond');
}

// ── Component ────────────────────────────────────────────────────────────────

interface GemOptimizationProps {
  /** Set of gem IDs the user has selected to compare. */
  selectedGemIds: Set<number>;
  /** Toggle a gem on/off. */
  onToggleGem: (gemId: number) => void;
  /** Total number of gem sockets across all selected items. */
  totalSockets: number;
}

export default function GemOptimization({
  selectedGemIds,
  onToggleGem,
  totalSockets,
}: GemOptimizationProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showRegular, setShowRegular] = useState(false);

  // Group gems by family, split into flawless and regular
  const gemsByFamily = useMemo(() => {
    const map = new Map<string, { flawless: GemPreset[]; regular: GemPreset[] }>();
    for (const family of GEM_FAMILIES) {
      map.set(family.key, { flawless: [], regular: [] });
    }
    for (const gem of GEM_PRESETS) {
      const key = getGemFamilyKey(gem);
      const group = map.get(key);
      if (!group) continue;
      if (isFlawless(gem)) {
        group.flawless.push(gem);
      } else {
        group.regular.push(gem);
      }
    }
    return map;
  }, []);

  const selectedCount = selectedGemIds.size;
  const hasRegularSelected = useMemo(
    () => GEM_PRESETS.some((g) => selectedGemIds.has(g.id) && !isFlawless(g)),
    [selectedGemIds],
  );

  // Auto-expand regular section if user has regular gems selected
  const effectiveShowRegular = showRegular || hasRegularSelected;

  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
      {/* Header — always visible, click to collapse/expand */}
      <button
        type="button"
        onClick={() => setIsExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-zinc-800/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {/* Gem icon */}
          <svg
            className="w-4 h-4 text-zinc-500"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 1L14 6L8 15L2 6Z" />
            <path d="M2 6H14" />
            <path d="M5.5 1L4 6L8 15" />
            <path d="M10.5 1L12 6L8 15" />
          </svg>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Gem Optimization
          </h3>
          {selectedCount > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-400 border border-zinc-700/30 tabular-nums">
              {selectedCount} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Socket count badge */}
          {totalSockets > 0 && (
            <span className="text-[10px] text-zinc-600 tabular-nums">
              {totalSockets} {totalSockets === 1 ? 'socket' : 'sockets'} on gear
            </span>
          )}
          {totalSockets === 0 && (
            <span className="text-[10px] text-zinc-700 italic">
              no sockets detected
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
          {totalSockets === 0 ? (
            <div className="px-3.5 py-4 text-center text-xs text-zinc-600">
              None of your selected items have gem sockets.
              <br />
              <span className="text-zinc-700">
                Select items with sockets in the gear grid above to enable gem optimization.
              </span>
            </div>
          ) : (
            <div className="px-3.5 py-3 space-y-3">
              {/* Flawless gems by family */}
              {GEM_FAMILIES.map((family) => {
                const group = gemsByFamily.get(family.key);
                if (!group || group.flawless.length === 0) return null;
                return (
                  <GemFamilyGroup
                    key={family.key}
                    family={family}
                    gems={group.flawless}
                    selectedGemIds={selectedGemIds}
                    onToggleGem={onToggleGem}
                  />
                );
              })}

              {/* Regular quality toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowRegular((p) => !p)}
                  className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <svg
                    className={[
                      'w-3 h-3 transition-transform duration-150',
                      effectiveShowRegular ? 'rotate-0' : '-rotate-90',
                    ].join(' ')}
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M4 6L8 10L12 6" />
                  </svg>
                  {effectiveShowRegular ? 'Hide' : 'Show'} non-Flawless (lower quality) gems
                </button>
              </div>

              {/* Regular quality gems */}
              {effectiveShowRegular && (
                <div className="space-y-3 animate-in" style={{ animationDuration: '150ms' }}>
                  {GEM_FAMILIES.filter((f) => f.key !== 'diamond').map((family) => {
                    const group = gemsByFamily.get(family.key);
                    if (!group || group.regular.length === 0) return null;
                    return (
                      <GemFamilyGroup
                        key={`reg-${family.key}`}
                        family={family}
                        gems={group.regular}
                        selectedGemIds={selectedGemIds}
                        onToggleGem={onToggleGem}
                        isRegular
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

// ── Gem Family Group ─────────────────────────────────────────────────────────

interface GemFamilyGroupProps {
  family: GemFamily;
  gems: GemPreset[];
  selectedGemIds: Set<number>;
  onToggleGem: (gemId: number) => void;
  isRegular?: boolean;
}

function GemFamilyGroup({
  family,
  gems,
  selectedGemIds,
  onToggleGem,
  isRegular = false,
}: GemFamilyGroupProps) {
  const selectedInFamily = gems.filter((g) => selectedGemIds.has(g.id)).length;

  return (
    <div>
      {/* Family label */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${family.accent.dot} opacity-60`} />
        <span className={`text-[11px] font-medium ${isRegular ? 'text-zinc-600' : 'text-zinc-500'}`}>
          {isRegular ? family.label : family.label}
          <span className="text-zinc-700 font-normal ml-1.5">{family.stat}</span>
        </span>
        {selectedInFamily > 0 && (
          <span className="text-[10px] text-zinc-600 tabular-nums">
            {selectedInFamily} selected
          </span>
        )}
      </div>

      {/* Gem chips */}
      <div className="flex flex-wrap gap-1.5">
        {gems.map((gem) => {
          const selected = selectedGemIds.has(gem.id);
          return (
            <GemChip
              key={gem.id}
              gem={gem}
              family={family}
              selected={selected}
              onToggle={() => onToggleGem(gem.id)}
              isRegular={isRegular}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Gem Chip ─────────────────────────────────────────────────────────────────

interface GemChipProps {
  gem: GemPreset;
  family: GemFamily;
  selected: boolean;
  onToggle: () => void;
  isRegular: boolean;
}

function GemChip({ gem, family, selected, onToggle, isRegular }: GemChipProps) {
  // Strip "Flawless " prefix for compact display
  const shortName = gem.name
    .replace('Flawless ', '')
    .replace(' Eversong Diamond', ' Diamond');

  return (
    <button
      type="button"
      onClick={onToggle}
      title={`${gem.name}\n${gem.stat}`}
      className={[
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] transition-all duration-150',
        'cursor-pointer select-none',
        selected
          ? `${family.accent.borderSelected} ${family.accent.bgSelected} ${family.accent.text} font-medium`
          : `border-zinc-800/40 ${family.accent.bg} ${isRegular ? 'text-zinc-600' : 'text-zinc-500'} hover:text-zinc-300`,
        isRegular && !selected ? 'opacity-70' : '',
      ].join(' ')}
      aria-pressed={selected}
    >
      {/* Gem icon */}
      <img
        src={getGemIconUrl(gem)}
        alt=""
        width={14}
        height={14}
        className="rounded-sm shrink-0"
      />
      <span className="truncate">{shortName}</span>
      <span className={`text-[10px] ${selected ? 'opacity-70' : 'text-zinc-700'}`}>
        {gem.stat}
      </span>
    </button>
  );
}
