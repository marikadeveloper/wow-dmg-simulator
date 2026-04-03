/**
 * Decode and compare WoW talent export strings.
 *
 * The game's talent export uses a custom bitstream encoded as standard base64.
 * Bit ordering is LSB-first within each 6-bit character (matching Blizzard's
 * ExportUtil.lua). The bitstream layout is defined in
 * Blizzard_ClassTalentImportExport.lua.
 *
 * Two talent strings can differ in auto-granted nodes or trailing bits while
 * representing the same player-chosen build. We compare only purchased nodes
 * (the actual player choices) to determine equivalence.
 */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

class BitReader {
  private values: number[];
  private pos = 0;

  constructor(str: string) {
    this.values = [];
    for (const ch of str) {
      const v = B64.indexOf(ch);
      if (v >= 0) this.values.push(v);
    }
  }

  read(numBits: number): number {
    let value = 0;
    for (let i = 0; i < numBits; i++) {
      const byteIdx = Math.floor(this.pos / 6);
      const bitIdx = this.pos % 6;
      if (byteIdx < this.values.length && (this.values[byteIdx] & (1 << bitIdx))) {
        value |= (1 << i);
      }
      this.pos++;
    }
    return value;
  }

  get remaining() {
    return this.values.length * 6 - this.pos;
  }
}

interface DecodedNode {
  selected: boolean;
  purchased: boolean;
  ranks?: number;       // undefined = max rank (not partially ranked)
  choiceIndex?: number; // undefined = not a choice node
}

interface DecodedTalents {
  version: number;
  specId: number;
  nodes: DecodedNode[];
}

function decodeTalentString(str: string): DecodedTalents {
  const r = new BitReader(str);
  const version = r.read(8);
  const specId = r.read(16);
  // Tree hash: 128 bits (skip — used for validation, not comparison)
  for (let i = 0; i < 16; i++) r.read(8);

  const nodes: DecodedNode[] = [];
  while (r.remaining >= 1) {
    const isSelected = r.read(1);
    if (!isSelected) {
      nodes.push({ selected: false, purchased: false });
      continue;
    }

    const isPurchased = r.read(1);
    if (!isPurchased) {
      nodes.push({ selected: true, purchased: false });
      continue;
    }

    const isPartial = r.read(1);
    let ranks: number | undefined;
    if (isPartial) ranks = r.read(6);

    const isChoice = r.read(1);
    let choiceIndex: number | undefined;
    if (isChoice) choiceIndex = r.read(2);

    nodes.push({ selected: true, purchased: true, ranks, choiceIndex });
  }

  return { version, specId, nodes };
}

/**
 * Check if two talent strings represent the same player-chosen build.
 *
 * Compares only purchased nodes (ignoring auto-granted nodes and trailing
 * padding bits). This matches Raidbots' behavior — the WoW client may
 * re-serialize loadouts with different auto-granted node states.
 *
 * Falls back to string equality if decoding fails.
 */
export function talentBuildsEqual(a: string, b: string): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  try {
    const da = decodeTalentString(a);
    const db = decodeTalentString(b);

    // Different spec = different build
    if (da.specId !== db.specId) return false;

    // Compare purchased nodes only
    const maxLen = Math.max(da.nodes.length, db.nodes.length);
    for (let i = 0; i < maxLen; i++) {
      const na = da.nodes[i];
      const nb = db.nodes[i];
      const aPurch = na?.purchased ?? false;
      const bPurch = nb?.purchased ?? false;

      if (aPurch !== bPurch) return false;
      if (aPurch && bPurch) {
        if (na!.ranks !== nb!.ranks) return false;
        if (na!.choiceIndex !== nb!.choiceIndex) return false;
      }
    }

    return true;
  } catch {
    // If decoding fails, fall back to string comparison
    return false;
  }
}
