const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const url = process.env.SITE_TEST_URL || 'http://127.0.0.1:8765/';
const output = process.env.SITE_TEST_OUTPUT || __dirname;
function luminance(rgb) {
  const c = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => {
    x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;
  });
  return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
}
function ratio(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true });
  const results = [], failures = [], external = [];
  for (const width of [320, 375, 639, 640, 768, 959, 960, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await context.newPage();
    page.on('pageerror', e => failures.push(e.message));
    page.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).origin !== new URL(url).origin) external.push(r.url()); });
    await page.goto(url);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('article').count(), 2);
    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      columns: getComputedStyle(document.querySelector('.services')).gridTemplateColumns,
      descriptionTops: [...document.querySelectorAll('.service p')].map(x => x.getBoundingClientRect().top),
      buttonRadius: getComputedStyle(document.querySelector('#notice-open')).borderRadius,
      text: getComputedStyle(document.querySelector('.intro')).color,
      background: getComputedStyle(document.documentElement).backgroundColor
    }));
    assert.equal(layout.overflow, false);
    assert.equal(layout.columns.split(' ').length, width < 640 ? 1 : 2);
    if (width >= 640) assert.ok(Math.abs(layout.descriptionTops[0] - layout.descriptionTops[1]) < 1);
    assert.ok(ratio(layout.text, layout.background) >= 4.5);
    const button = page.locator('#notice-open');
    await button.focus();
    assert.equal(await button.evaluate(x => getComputedStyle(x).outlineStyle), 'solid');
    const before = await button.boundingBox();
    await button.hover(); await page.waitForTimeout(200);
    const after = await button.boundingBox();
    for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(before[key] - after[key]) < .25);
    const colors = await button.evaluate(x => ({ color: getComputedStyle(x).color, background: getComputedStyle(x).backgroundColor }));
    assert.ok(ratio(colors.color, colors.background) >= 4.5);
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    assert.equal(await dialog.isVisible(), true);
    assert.equal(await dialog.getAttribute('aria-labelledby'), 'notice-title');
    assert.equal(await page.locator('#notice-close').evaluate(x => x === document.activeElement), true);
    for (const key of ['Tab', 'Shift+Tab']) {
      await page.keyboard.press(key);
      assert.equal(await page.locator('#notice-close').evaluate(x => x === document.activeElement), true);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (width === 375) await page.screenshot({ path: path.join(output, 'demo-dialog-375.png') });
    await page.keyboard.press('Escape');
    assert.equal(await dialog.isVisible(), false);
    assert.equal(await button.evaluate(x => x === document.activeElement), true);
    await page.keyboard.press('Space');
    assert.equal(await dialog.isVisible(), true);
    await page.locator('#notice-close').click();
    assert.equal(await dialog.isVisible(), false);
    await page.mouse.move(0, 0);
    if ([320, 375, 768, 1440].includes(width)) await page.screenshot({ path: path.join(output, `demo-${width}.png`), fullPage: true });
    results.push({ width, ...layout, hoverContrast: ratio(colors.color, colors.background), keyboardDialog: 'pass' });
    await context.close();
  }
  const mobile = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  const page = await mobile.newPage(); await page.goto(url);
  await page.locator('#notice-open').tap(); assert.equal(await page.getByRole('dialog').isVisible(), true);
  await page.locator('#notice-close').tap(); assert.equal(await page.getByRole('dialog').isVisible(), false);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('#notice-open').evaluate(x => getComputedStyle(x).transitionDuration), '0s');
  await mobile.close();
  assert.deepEqual(failures, []); assert.deepEqual(external, []);
  await browser.close();
  const report = { status: 'PASS', url, results, touch: 'pass', reducedMotion: 'pass', pageErrors: failures, externalRequests: external };
  fs.writeFileSync(path.join(output, 'browser-qa.json'), JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify({ status: report.status, widths: results.map(x => x.width), touch: report.touch, reducedMotion: report.reducedMotion, externalRequests: external.length }) + '\n');
})().catch(e => { process.stderr.write(e.stack + '\n'); process.exitCode = 1; });
