import { useState, useRef, useCallback, useEffect } from 'react';
import type { GearItem } from '../lib/types';
import { GEAR_TRACKS } from '../lib/presets/season-config';

interface ItemSearchResult {
  itemId: number;
  name: string;
  slot: string;
  baseIlvl: number;
  quality: number;
  source: string;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const items = await invoke<ItemSearchResult[]>('search_items', { query: q });
      // Filter results to items that match this slot's valid slot types
      const filtered = items.filter((item) => realSlots.includes(item.slot));
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

  const handleSelectItem = useCallback((item: ItemSearchResult) => {
    // Default to the highest gear track
    const defaultTrack = GEAR_TRACKS[0];
    const targetSlot = realSlots.length === 1 ? realSlots[0] : item.slot;

    const gearItem: GearItem = {
      slot: targetSlot,
      id: item.itemId,
      bonusIds: defaultTrack.bonusId > 0 ? [defaultTrack.bonusId] : [],
      gemIds: [],
      enchantId: undefined,
      name: item.name,
      ilvl: defaultTrack.ilvlRange[1],
      isEquipped: false,
      isUnowned: true,
    };

    onAddItem(targetSlot, gearItem);
    // Reset state
    setQuery('');
    setResults([]);
    setIsOpen(false);
  }, [realSlots, onAddItem]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
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
              onClick={() => handleSelectItem(item)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left
                         hover:bg-zinc-800/50 transition-colors cursor-pointer"
            >
              <span className={`text-xs truncate ${QUALITY_TEXT[item.quality] ?? 'text-zinc-300'}`}>
                {item.name}
              </span>
              {item.source === 'local' && (
                <span className="shrink-0 text-[9px] text-zinc-700 font-medium">offline</span>
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

const QUALITY_TEXT: Record<number, string> = {
  0: 'text-zinc-500',
  1: 'text-zinc-300',
  2: 'text-green-400',
  3: 'text-blue-400',
  4: 'text-purple-400',
  5: 'text-orange-400',
};
