import { useEffect } from 'react';

/**
 * Refresh Wowhead power.js tooltips.
 * Call this after React has rendered anchor tags with Wowhead URLs.
 * The script scans for <a> tags pointing to wowhead.com and attaches tooltips.
 */
export function refreshWowheadTooltips(): void {
  const wh = (window as any).$WowheadPower;
  if (wh?.refreshLinks) {
    wh.refreshLinks();
  }
}

/**
 * React hook that refreshes Wowhead tooltips whenever dependencies change.
 * @param deps - dependency array (same semantics as useEffect)
 */
export function useWowheadTooltips(deps: React.DependencyList = []): void {
  useEffect(() => {
    // Small delay to ensure DOM has rendered
    const timer = setTimeout(refreshWowheadTooltips, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Build a Wowhead item URL with query params for accurate tooltips.
 * Wowhead's power.js reads these params to show the correct tooltip.
 */
export function buildWowheadItemUrl(
  itemId: number,
  opts?: {
    bonusIds?: number[];
    ilvl?: number;
    enchantId?: number;
    gemIds?: number[];
    craftingQuality?: number;
  },
): string {
  const params: string[] = [];
  if (opts?.bonusIds?.length) params.push(`bonus=${opts.bonusIds.join(':')}`);
  if (opts?.ilvl) params.push(`ilvl=${opts.ilvl}`);
  if (opts?.enchantId) params.push(`ench=${opts.enchantId}`);
  if (opts?.gemIds?.length) params.push(`gems=${opts.gemIds.join(':')}`);
  if (opts?.craftingQuality) params.push(`crafting-quality=${opts.craftingQuality}`);
  const qs = params.length > 0 ? `?${params.join('&')}` : '';
  return `https://www.wowhead.com/item=${itemId}${qs}`;
}

/**
 * Build a Wowhead spell URL (used for enchant effects).
 */
export function buildWowheadSpellUrl(spellId: number): string {
  return `https://www.wowhead.com/spell=${spellId}`;
}
