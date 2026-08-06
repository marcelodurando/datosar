import { chromium } from 'playwright';
import fs from 'fs';

const browser = await chromium.launch({
  headless: true
});

const page = await browser.newPage({
  viewport: {
    width: 1600,
    height: 900
  }
});

console.log('Opening BNA...');

await page.goto('https://bna.com.ar/Personas', {
  waitUntil: 'networkidle',
  timeout: 120000
});

// Give the page a few seconds in case content loads after network idle
await page.waitForTimeout(5000);

// Create the output directory if it doesn't exist
fs.mkdirSync('../datos', { recursive: true });

// Save the HTML
fs.writeFileSync('../datos/bna.html', await page.content());

console.log('Saved ../datos/bna.html');

await browser.close();
