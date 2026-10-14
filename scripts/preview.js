// Renders one page to a PNG for a quick visual check. Usage: node scripts/preview.js <url> <file> [width] [height]
import puppeteer from 'puppeteer-core';

const [url, file, width = '1900', height = '1200'] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: Number(width), height: Number(height), deviceScaleFactor: 1 });
page.on('pageerror', (error) => console.error('page error:', error.message));
page.on('console', (message) => { if (message.type() === 'error') console.error('console:', message.text()); });
await page.goto(url, { waitUntil: 'networkidle0' });
await new Promise((resolve) => setTimeout(resolve, 600));
await page.screenshot({ path: file, fullPage: true });
await browser.close();
