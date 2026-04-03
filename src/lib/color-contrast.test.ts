/**
 * WCAG 2.1 AA color contrast audit.
 *
 * Validates that every text/background combination in our theme tokens
 * meets the minimum contrast ratio required by WCAG 2.1 Level AA:
 *   - Normal text (< 18px / < 14px bold): ≥ 4.5 : 1
 *   - Large text  (≥ 18px / ≥ 14px bold): ≥ 3.0 : 1
 *
 * Exempt categories (per WCAG):
 *   - Disabled / inactive UI text
 *   - Purely decorative text
 *
 * The color values below must stay in sync with src/index.css.
 * If you change a theme token, update the corresponding value here and
 * ensure the test still passes.
 */
import { describe, it, expect } from 'vitest';

// ── Color math ──────────────────────────────────────────────────────────────

function sRGBtoLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function hex(h: string): [number, number, number] {
  h = h.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Composite a foreground RGBA on an opaque RGB background. */
function composite(
  fg: [number, number, number],
  alpha: number,
  bg: [number, number, number],
): [number, number, number] {
  return [
    Math.round(fg[0] * alpha + bg[0] * (1 - alpha)),
    Math.round(fg[1] * alpha + bg[1] * (1 - alpha)),
    Math.round(fg[2] * alpha + bg[2] * (1 - alpha)),
  ];
}

type RGB = [number, number, number];

// ── Theme values (must match src/index.css) ─────────────────────────────────

const LIGHT_PAGE = hex('#ffffff');
const DARK_PAGE = hex('#09090b');

/** Primary surfaces — the most common backgrounds where text is rendered. */
const LIGHT_PRIMARY_SURFACES: Record<string, RGB> = {
  'surface-page (#fff)': LIGHT_PAGE,
  'surface-primary (#fff)': hex('#ffffff'),
  'surface-inset (#fafafa)': hex('#fafafa'),
};

/** Secondary surfaces — cards, inputs. Muted text sometimes appears here. */
const LIGHT_SECONDARY_SURFACES: Record<string, RGB> = {
  'surface-secondary (#f4f4f5)': hex('#f4f4f5'),
};

/** Tertiary surfaces — toggles, segments. Only bold/large text. */
const LIGHT_TERTIARY_SURFACES: Record<string, RGB> = {
  'surface-tertiary (#e4e4e7)': hex('#e4e4e7'),
};

const DARK_PRIMARY_SURFACES: Record<string, RGB> = {
  'surface-page (#09090b)': DARK_PAGE,
  'surface-primary (900/50)': composite(hex('#18181b'), 0.5, DARK_PAGE),
  'surface-overlay (#18181b)': hex('#18181b'),
  'surface-inset (950/80)': composite(hex('#09090b'), 0.8, DARK_PAGE),
};

const DARK_SECONDARY_SURFACES: Record<string, RGB> = {
  'surface-secondary (800/60)': composite(hex('#27272a'), 0.6, DARK_PAGE),
  'surface-tertiary (800/40)': composite(hex('#27272a'), 0.4, DARK_PAGE),
};

// ── Text color groups ───────────────────────────────────────────────────────

/** Text that must pass AA normal (4.5:1) on ALL surfaces it appears on. */
const LIGHT_CORE_TEXT: Record<string, RGB> = {
  'text-primary (#18181b)': hex('#18181b'),
  'text-secondary (#3f3f46)': hex('#3f3f46'),
  'text-tertiary (#52525b)': hex('#52525b'),
  'text-heading (#18181b)': hex('#18181b'),
};

/** Accent text — must pass AA normal on all surfaces (uses 800-shade in light). */
const LIGHT_ACCENT_TEXT: Record<string, RGB> = {
  'accent-amber (#92400e)': hex('#92400e'),
  'accent-emerald (#065f46)': hex('#065f46'),
  'accent-red (#991b1b)': hex('#991b1b'),
  'accent-cyan (#155e75)': hex('#155e75'),
  'accent-purple (#6b21a8)': hex('#6b21a8'),
  'accent-blue (#1e40af)': hex('#1e40af'),
  'accent-teal (#115e59)': hex('#115e59'),
  'accent-orange (#9a3412)': hex('#9a3412'),
  'accent-green (#166534)': hex('#166534'),
  'accent-violet (#5b21b6)': hex('#5b21b6'),
};

/** Muted/faint text — passes 4.5:1 on primary surfaces, 3.0:1 on secondary. */
const LIGHT_MUTED_TEXT: Record<string, RGB> = {
  'text-muted (#71717a)': hex('#71717a'),
  'text-faint (#71717a)': hex('#71717a'),
};

const DARK_CORE_TEXT: Record<string, RGB> = {
  'text-primary (#f4f4f5)': hex('#f4f4f5'),
  'text-secondary (#d4d4d8)': hex('#d4d4d8'),
  'text-tertiary (#a1a1aa)': hex('#a1a1aa'),
  'text-muted (#a1a1aa)': hex('#a1a1aa'),
  'text-heading (#fffbeb)': hex('#fffbeb'),
};

const DARK_ACCENT_TEXT: Record<string, RGB> = {
  'accent-amber (#fbbf24)': hex('#fbbf24'),
  'accent-emerald (#34d399)': hex('#34d399'),
  'accent-red (#f87171)': hex('#f87171'),
  'accent-cyan (#22d3ee)': hex('#22d3ee'),
  'accent-purple (#c084fc)': hex('#c084fc'),
  'accent-blue (#60a5fa)': hex('#60a5fa'),
  'accent-teal (#2dd4bf)': hex('#2dd4bf'),
  'accent-orange (#fb923c)': hex('#fb923c'),
  'accent-green (#4ade80)': hex('#4ade80'),
  'accent-violet (#a78bfa)': hex('#a78bfa'),
};

const DARK_FAINT_TEXT: Record<string, RGB> = {
  'text-faint (#71717a)': hex('#71717a'),
};

// ── Test helpers ────────────────────────────────────────────────────────────

function assertContrast(
  textName: string,
  textRgb: RGB,
  surfaceName: string,
  surfaceRgb: RGB,
  minRatio: number,
) {
  const bgLum = relativeLuminance(...surfaceRgb);
  const txtLum = relativeLuminance(...textRgb);
  const ratio = contrastRatio(bgLum, txtLum);
  expect(
    ratio,
    `${textName} on ${surfaceName}: ${ratio.toFixed(2)}:1 (need ≥ ${minRatio}:1)`,
  ).toBeGreaterThanOrEqual(minRatio);
}

function testGroup(
  surfaces: Record<string, RGB>,
  texts: Record<string, RGB>,
  minRatio: number,
  label: string,
) {
  for (const [surfaceName, surfaceRgb] of Object.entries(surfaces)) {
    describe(`on ${surfaceName}`, () => {
      for (const [textName, textRgb] of Object.entries(texts)) {
        it(`${textName} ≥ ${minRatio}:1 ${label}`, () => {
          assertContrast(textName, textRgb, surfaceName, surfaceRgb, minRatio);
        });
      }
    });
  }
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('WCAG AA color contrast audit', () => {
  describe('Light theme', () => {
    const allLightSurfaces = {
      ...LIGHT_PRIMARY_SURFACES,
      ...LIGHT_SECONDARY_SURFACES,
      ...LIGHT_TERTIARY_SURFACES,
    };

    // Core text: 4.5:1 on ALL surfaces
    testGroup(allLightSurfaces, LIGHT_CORE_TEXT, 4.5, '(AA normal)');

    // Accent text: 4.5:1 on ALL surfaces (800-shades)
    testGroup(allLightSurfaces, LIGHT_ACCENT_TEXT, 4.5, '(AA normal)');

    // Muted text: 4.5:1 on primary surfaces
    testGroup(LIGHT_PRIMARY_SURFACES, LIGHT_MUTED_TEXT, 4.5, '(AA normal)');
    // Muted text: 3.0:1 on secondary/tertiary (used for supplementary info)
    testGroup(LIGHT_SECONDARY_SURFACES, LIGHT_MUTED_TEXT, 3.0, '(AA large)');
    testGroup(LIGHT_TERTIARY_SURFACES, LIGHT_MUTED_TEXT, 3.0, '(AA large)');
  });

  describe('Dark theme', () => {
    const allDarkSurfaces = {
      ...DARK_PRIMARY_SURFACES,
      ...DARK_SECONDARY_SURFACES,
    };

    // Core text: 4.5:1 on ALL surfaces
    testGroup(allDarkSurfaces, DARK_CORE_TEXT, 4.5, '(AA normal)');

    // Accent text: 4.5:1 on ALL surfaces
    testGroup(allDarkSurfaces, DARK_ACCENT_TEXT, 4.5, '(AA normal)');

    // Faint text: 3.0:1 (large text / decorative)
    testGroup(allDarkSurfaces, DARK_FAINT_TEXT, 3.0, '(AA large)');
  });
});
