/**
 * Alpha compositing for design tokens.
 *
 * The palette lives in `globals.css` as hex, so `${color}55` — the obvious way
 * to fade a token — produces `var(--neon-cyan)55`, which is not a colour and
 * makes the browser drop the entire declaration. Every glow, tint and hairline
 * built that way silently disappeared.
 *
 * `alpha()` resolves either form and returns real `rgba()`:
 *
 *   alpha('var(--neon-cyan)', 0.33) === 'rgba(34, 211, 238, 0.33)'
 *   alpha('#22d3ee', 0.33)          === 'rgba(34, 211, 238, 0.33)'
 */

/** Mirrors the `:root` tokens in `app/globals.css`. */
export const PALETTE = {
  cyan: '#22d3ee',
  violet: '#a78bfa',
  rose: '#f43f5e',
  amber: '#fbbf24',
  green: '#4ade80',
  blue: '#3b82f6',
} as const;

const TOKENS: Record<string, string> = {
  '--neon-cyan': PALETTE.cyan,
  '--neon-violet': PALETTE.violet,
  '--neon-rose': PALETTE.rose,
  '--neon-amber': PALETTE.amber,
  '--neon-green': PALETTE.green,
  '--neon-blue': PALETTE.blue,
  '--bg-void': '#02040a',
  '--bg-deep': '#050a1a',
  '--text-hi': '#f8fafc',
  '--text-mid': '#94a3b8',
  '--text-lo': '#475569',
};

function toRgb(color: string): [number, number, number] | null {
  let hex = color.trim();

  const varMatch = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i.exec(hex);
  if (varMatch) {
    const resolved = TOKENS[varMatch[1]];
    if (!resolved) return null;
    hex = resolved;
  }

  if (hex.startsWith('#')) {
    const body = hex.slice(1);
    if (body.length === 3 || body.length === 4) {
      return [
        parseInt(body[0] + body[0], 16),
        parseInt(body[1] + body[1], 16),
        parseInt(body[2] + body[2], 16),
      ];
    }
    if (body.length === 6 || body.length === 8) {
      return [
        parseInt(body.slice(0, 2), 16),
        parseInt(body.slice(2, 4), 16),
        parseInt(body.slice(4, 6), 16),
      ];
    }
    return null;
  }

  const rgbMatch = /^rgba?\(([^)]+)\)$/i.exec(hex);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => Number.isFinite(n))) {
      return [parts[0], parts[1], parts[2]];
    }
  }

  return null;
}

/**
 * Returns `color` at the given opacity (0–1) as a real `rgba()` string.
 *
 * Falls back to the colour unchanged when it cannot be parsed, so an unknown
 * token paints solid rather than vanishing.
 */
export function alpha(color: string, opacity: number): string {
  const rgb = toRgb(color);
  if (!rgb) return color;
  const a = Math.max(0, Math.min(1, opacity));
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
}
