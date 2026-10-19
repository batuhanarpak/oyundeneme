/**
 * Runtime smoke test. Drives the real app in Chromium and fails on any console
 * error, page error, or React hydration warning — the failure classes a
 * typecheck cannot see.
 *
 * Run: node scripts/smoke.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3000';

/* Reuse a Chromium already on disk when the bundled revision is missing —
   downloading one is not worth it for a smoke run. */
const CANDIDATES = [
  process.env.LOCALAPPDATA &&
    `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe`,
  process.env.LOCALAPPDATA &&
    `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1228\\chrome-win\\chrome.exe`,
].filter(Boolean);
const cached = CANDIDATES.find((p) => existsSync(p));

const browser = await chromium.launch(cached ? { executablePath: cached } : {});
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });

const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

const step = async (label, fn) => {
  const before = problems.length;
  try {
    await fn();
    const fresh = problems.slice(before);
    console.log(`${fresh.length ? 'FAIL' : 'ok  '}  ${label}${fresh.length ? `\n      ${fresh.join('\n      ')}` : ''}`);
  } catch (e) {
    problems.push(`${label}: ${e.message.split('\n')[0]}`);
    console.log(`FAIL  ${label} — ${e.message.split('\n')[0]}`);
  }
};

/* Fills the callsign and submits, if the gate is showing. The name persists in
   localStorage, so later loads skip straight to the hub — and the button stays
   disabled until the name passes validation, so typing first is not optional. */
const joinApp = async (p) => {
  const join = p.getByRole('button', { name: /SİSTEME BAĞLAN/i }).first();
  if (!(await join.count())) return false;

  const nameField = p.locator('form input').first();
  if (await nameField.count()) {
    await nameField.fill('TEST');
    await p.waitForTimeout(250);
  }
  if (await join.isDisabled()) await p.waitForTimeout(400);
  await join.click({ timeout: 8000 });
  await p.waitForTimeout(900);
  return true;
};

await step('load + join', async () => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await joinApp(page);
});

/* Hub cards are titled from MODES in config/game.ts. */
const MODE_TITLES = {
  breach: 'THE BREACH',
  clash: 'CEREBRAL CLASH',
  tower: 'TOWER TYPING',
  space: 'DRONE NETWORK',
};

for (const [mode, title] of Object.entries(MODE_TITLES)) {
  await step(`mode: ${mode}`, async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await joinApp(page);

    const card = page.getByRole('button').filter({ hasText: title }).first();
    if (!(await card.count())) throw new Error(`hub card "${title}" not found`);
    await card.click();
    await page.waitForTimeout(1400);
  });
}

/* Mobile overflow check: the page must not scroll sideways at 320px. */
await step('no horizontal overflow at 320px', async () => {
  const p = await browser.newPage({ viewport: { width: 320, height: 720 } });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  const over = await p.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  await p.close();
  if (over > 1) throw new Error(`overflows by ${over}px`);
});

await browser.close();

const real = problems.filter((p) => !/favicon|Download the React DevTools/i.test(p));
console.log(`\n${real.length} problem(s) total.`);
if (real.length) {
  console.log(real.join('\n'));
  process.exit(1);
}
