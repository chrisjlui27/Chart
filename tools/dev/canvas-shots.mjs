import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
const root = '/home/user/Chart/app/dist';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = createServer((req, res) => { const p = join(root, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]); if (!existsSync(p)) { res.statusCode = 404; res.end(); return; } res.setHeader('content-type', types[extname(p)] ?? 'application/octet-stream'); res.end(readFileSync(p)); });
await new Promise((r) => srv.listen(4568, r));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto('http://localhost:4568/');
await page.waitForTimeout(3000);
const out = process.env.SHOT_DIR ?? '/tmp/claude-0/-home-user-Chart/c70a520e-8bab-58d7-8743-66a5bb1e1e91/scratchpad/';
await page.screenshot({ path: out + 'c0.png' });
await page.selectOption('select.tour-select', { index: 0 }); // tour 1
await page.getByText('start').click(); await page.waitForTimeout(1500);
await page.screenshot({ path: out + 'c1.png' });
await page.getByText('next ›').click(); await page.getByText('next ›').click(); await page.waitForTimeout(2000);
await page.screenshot({ path: out + 'c2.png' });
await page.selectOption('select.tour-select', { index: 1 }); // tour 12
await page.getByText('start').click(); await page.waitForTimeout(4000);
await page.screenshot({ path: out + 'c3.png' });
// inspect a dead-set point via the inspector input
await page.getByText('Inspector', { exact: true }).click();
await page.locator('.panel input.mono').last().fill('o1 + e9');
await page.getByText('inspect', { exact: true }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: out + 'c4.png' });
const txt = await page.locator('.kv').last().innerText();
console.log('inspector:', txt.replace(/\n/g, ' | ').slice(0, 400));
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close(); srv.close();
