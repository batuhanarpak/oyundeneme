/**
 * Verifies the alpha fix actually paints.
 *
 * Before `lib/color.ts`, `${color}55` produced `var(--neon-cyan)55`, which the
 * browser dropped — every chip, glow and hairline built that way rendered as
 * `rgba(0, 0, 0, 0)`. This asserts the computed values are real colours now.
 *
 * Run: node scripts/verify-colors.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const exe = `${process.env.LOCALAPPDATA}/ms-playwright/chromium-1228/chrome-win64/chrome.exe`;

const browser = await chromium.launch(existsSync(exe) ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

/* Get into the app so Chips and buttons exist. */
const nameField = page.locator('form input').first();
if (await nameField.count()) await nameField.fill('TEST');
const join = page.getByRole('button', { name: /SİSTEME BAĞLAN/i }).first();
if (await join.count()) await join.click();
await page.waitForTimeout(1000);

/* Walk every rendered element and collect any colour that failed to parse and
   silently fell back to transparent. Only properties actually *declared* in the
   inline style are checked — an element that sets just `color` legitimately
   leaves `backgroundColor` transparent. */
const bad = await page.evaluate(() => {
  const PROPS = ['color', 'background', 'background-color', 'border-color', 'box-shadow'];
  const CSS = { color: 'color', background: 'backgroundColor', 'background-color': 'backgroundColor', 'border-color': 'borderTopColor', 'box-shadow': 'boxShadow' };
  const out = [];

  for (const el of document.querySelectorAll('[style]')) {
    const inline = el.getAttribute('style') || '';
    const cs = getComputedStyle(el);
    for (const prop of PROPS) {
      /* Was it declared inline at all? */
      if (!new RegExp(`(^|;)\\s*${prop}\\s*:`, 'i').test(inline)) continue;
      const computed = cs[CSS[prop]];
      if (!computed || computed === 'none') continue;

      /* `transparent` written by hand is deliberate; a gradient lands on
         backgroundColor only because it is an image, not a colour. */
      const declared = inline.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i'))?.[1] ?? '';
      if (/^\s*transparent\s*$/i.test(declared)) continue;
      if (/gradient\(/i.test(declared)) {
        /* A gradient is dead only if it contains no opaque colour. */
        if (!/rgba?\([^)]*?(0\.[1-9]|[1-9])/.test(declared) && !/#/.test(declared) && !/var\(--/.test(declared)) {
          out.push({ tag: el.tagName, cls: String(el.className).slice(0, 80), prop, value: computed, style: declared.slice(0, 160) });
        }
        continue;
      }

      const dead = computed === 'rgba(0, 0, 0, 0)' || computed === 'transparent';
      if (dead) {
        out.push({ tag: el.tagName, cls: String(el.className).slice(0, 80), prop, value: computed, style: declared.slice(0, 160) });
      }
    }
  }
  return out;
});

await browser.close();

if (bad.length === 0) {
  console.log('ok — every inline colour resolved to a real value (no dropped declarations)');
} else {
  console.log(`${bad.length} element(s) with an inline colour that resolved to transparent:`);
  for (const b of bad.slice(0, 15)) console.log(`  <${b.tag}> ${b.prop}  class="${b.cls}"\n      style="${b.style}"`);
  process.exit(1);
}
