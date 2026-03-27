import { useState, useRef, useCallback, useEffect } from 'react';
import type { GearItem } from '../lib/types';
import { CURRENT_SEASON } from '../lib/presets/season-config';

interface ItemSearchResult {
  itemId: number;
  name: string;
  slot: string;
  baseIlvl: number;
  quality: number;
  source: string;
}

/** Selected item pending ilvl confirmation. */
interface PendingItem {
  result: ItemSearchResult;
  ilvl: string;
}

interface UnownedItemSearchProps {
  /** All real SimC slots this card represents (for paired slots like rings) */
  realSlots: string[];
  /** Called when user adds an unowned item */
  onAddItem: (slot: string, item: GearItem) => void;
}

export default function UnownedItemSearch({ realSlots, onAddItem }: UnownedItemSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pending, setPending] = useState<PendingItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ilvlInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !pending && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, pending]);

  // Focus ilvl input when pending item is set
  useEffect(() => {
    if (pending && ilvlInputRef.current) {
      ilvlInputRef.current.focus();
      ilvlInputRef.current.select();
    }
  }, [pending]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const items = await invoke<ItemSearchResult[]>('search_items', { query: q });
      // Filter local DB results by slot; Wowhead results (slot='') shown unfiltered
      // since the user is already searching within the correct slot card
      const filtered = items.filter(
        (item) => item.slot === '' || realSlots.includes(item.slot),
      );
      setResults(filtered);
    } catch {
      // Silently fail in dev mode (no backend)
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [realSlots]);

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 400);
  }, [doSearch]);

  const handleSelectResult = useCallback((item: ItemSearchResult) => {
    // Show ilvl configuration step instead of immediately adding
    setPending({ result: item, ilvl: String(CURRENT_SEASON.maxIlvl) });
    setResults([]);
    setQuery('');
  }, []);

  const handleConfirmAdd = useCallback(() => {
    if (!pending) return;
    const { result, ilvl: ilvlStr } = pending;
    const ilvl = parseInt(ilvlStr, 10);
    if (isNaN(ilvl) || ilvl < 1) return;

    const targetSlot = result.slot && realSlots.includes(result.slot)
      ? result.slot
      : realSlots[0];

    const gearItem: GearItem = {
      slot: targetSlot,
      id: result.itemId,
      bonusIds: [],
      gemIds: [],
      enchantId: undefined,
      name: result.name,
      ilvl,
      isEquipped: false,
      isUnowned: true,
    };

    onAddItem(targetSlot, gearItem);
    setPending(null);
    setIsOpen(false);
  }, [pending, realSlots, onAddItem]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setPending(null);
  }, []);

  const handleBackToSearch = useCallback(() => {
    setPending(null);
  }, []);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 py-2 mt-1 rounded-md
                   text-[11px] font-medium text-zinc-600 hover:text-amber-400/80
                   border border-dashed border-zinc-800/50 hover:border-amber-500/30
                   bg-transparent hover:bg-amber-500/[0.03]
                   transition-all duration-200 cursor-pointer group"
      >
        <svg
          className="w-3 h-3 opacity-50 group-hover:opacity-80 transition-opacity"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        >
          <line x1="6" y1="2" x2="6" y2="10" />
          <line x1="2" y1="6" x2="10" y2="6" />
        </svg>
        Add item to compare
      </button>
    );
  }

  // ── Step 2: Configure ilvl for selected item ──────────────────────────
  if (pending) {
    const { result, ilvl } = pending;
    const qualityColor = QUALITY_TEXT[result.quality] ?? 'text-zinc-300';

    return (
      <div className="mt-1 rounded-md border border-zinc-800/60 bg-zinc-900/80 overflow-hidden animate-in">
        {/* Item name header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/40">
          <span
            className={`shrink-0 w-1.5 h-1.5 rounded-full ${QUALITY_DOT[result.quality] ?? 'bg-zinc-400'}`}
          />
          <span className={`text-xs truncate flex-1 ${qualityColor}`}>
            {result.name}
          </span>
          <button
            type="button"
            onClick={handleBackToSearch}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
            aria-label="Back to search"
          >
            change
          </button>
        </div>

        {/* ilvl input row */}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <label className="text-[11px] text-zinc-500 shrink-0">Item level</label>
          <input
            ref={ilvlInputRef}
            type="number"
            min={1}
            max={999}
            value={ilvl}
            onChange={(e) => setPending({ ...pending, ilvl: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmAdd(); }}
            className="w-16 px-2 py-1 rounded bg-zinc-800/80 border border-zinc-700/50
                       text-xs text-zinc-200 text-center tabular-nums
                       outline-none focus:border-amber-500/40 caret-amber-400
                       [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={handleConfirmAdd}
            disabled={!ilvl || isNaN(parseInt(ilvl, 10)) || parseInt(ilvl, 10) < 1}
            className="ml-auto px-3 py-1 rounded text-[11px] font-medium
                       bg-amber-500/15 text-amber-400 border border-amber-500/25
                       hover:bg-amber-500/25 disabled:opacity-30 disabled:cursor-default
                       transition-colors cursor-pointer"
          >
            Add
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
            aria-label="Cancel"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
              <line x1="3" y1="3" x2="9" y2="9" />
              <line x1="9" y1="3" x2="3" y2="9" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: Search ────────────────────────────────────────────────────
  return (
    <div className="mt-1 rounded-md border border-zinc-800/60 bg-zinc-900/80 overflow-hidden animate-in">
      {/* Search input */}
      <div className="flex items-center gap-2 px-2.5 py-2 border-b border-zinc-800/40">
        <svg
          className="w-3.5 h-3.5 text-zinc-600 shrink-0"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        >
          <circle cx="7" cy="7" r="5" />
          <line x1="11" y1="11" x2="14" y2="14" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Search for item..."
          className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-700
                     outline-none caret-amber-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults([]); }}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
            aria-label="Clear search"
          >
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
              <line x1="3" y1="3" x2="9" y2="9" />
              <line x1="9" y1="3" x2="3" y2="9" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={handleClose}
          className="text-zinc-600 hover:text-zinc-400 transition-colors ml-0.5"
          aria-label="Close search"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
            <line x1="3" y1="3" x2="9" y2="9" />
            <line x1="9" y1="3" x2="3" y2="9" />
          </svg>
        </button>
      </div>

      {/* Results */}
      {isSearching && (
        <div className="px-3 py-3 text-center text-[11px] text-zinc-600">
          Searching...
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="max-h-40 overflow-y-auto">
          {results.map((item) => (
            <button
              key={item.itemId}
              type="button"
              onClick={() => handleSelectResult(item)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left
                         hover:bg-zinc-800/50 transition-colors cursor-pointer group/row"
            >
              {/* Quality-colored dot */}
              <span
                className={`shrink-0 w-1.5 h-1.5 rounded-full ${QUALITY_DOT[item.quality] ?? 'bg-zinc-400'}`}
              />
              {/* Item name */}
              <span className={`text-xs truncate flex-1 ${QUALITY_TEXT[item.quality] ?? 'text-zinc-300'}`}>
                {item.name}
              </span>
              {/* Slot type */}
              {item.slot && (
                <span className="shrink-0 text-[10px] text-zinc-600 font-medium">
                  {SLOT_TYPE_LABELS[item.slot] ?? item.slot}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {!isSearching && query.length >= 2 && results.length === 0 && (
        <div className="px-3 py-3 text-center text-[11px] text-zinc-700 italic">
          No items found for this slot
        </div>
      )}

      {!isSearching && query.length < 2 && query.length > 0 && (
        <div className="px-3 py-2.5 text-center text-[11px] text-zinc-700">
          Type at least 2 characters
        </div>
      )}
    </div>
  );
}

/** Background color dots for item quality. */
const QUALITY_DOT: Record<number, string> = {
  0: 'bg-zinc-500',
  1: 'bg-zinc-300',
  2: 'bg-green-400',
  3: 'bg-blue-400',
  4: 'bg-purple-400',
  5: 'bg-orange-400',
};

const QUALITY_TEXT: Record<number, string> = {
  0: 'text-zinc-500',
  1: 'text-zinc-300',
  2: 'text-green-400',
  3: 'text-blue-400',
  4: 'text-purple-400',
  5: 'text-orange-400',
};

/** Human-readable slot labels for search results. */
const SLOT_TYPE_LABELS: Record<string, string> = {
  head: 'Head',
  neck: 'Neck',
  shoulder: 'Shoulder',
  back: 'Back',
  chest: 'Chest',
  wrist: 'Wrist',
  hands: 'Hands',
  waist: 'Waist',
  legs: 'Legs',
  feet: 'Feet',
  finger1: 'Ring',
  finger2: 'Ring',
  trinket1: 'Trinket',
  trinket2: 'Trinket',
  main_hand: 'Weapon',
  off_hand: 'Off Hand',
};
