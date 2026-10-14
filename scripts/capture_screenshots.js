// Captures the README screenshots and exports every diagram as a full-size PNG.
// Needs the dev server running (npm run dev) and Google Chrome installed.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5176/';
const CHROME_PATH = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';
const SCREENSHOTS_DIR = path.resolve('docs/screenshots');
const DIAGRAMS_DIR = path.resolve('docs/diagrams');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Each shot: file name, route and an optional script that puts the page in the state worth showing. */
const SHOTS = [
  { file: '01-capa.png', hash: '', fullPage: true },
  { file: '02-casos-de-uso.png', hash: '#/use-cases/UC08' },
  { file: '03-especificacao-uc08.png', hash: '#/specification' },
  { file: '04-especificacao-fluxos.png', hash: '#/specification/FE01' },
  {
    file: '05-atividades-cenario.png',
    hash: '#/activity',
    setup: () => {
      for (let i = 0; i < 17; i++) document.querySelector('[data-step="next"]').click();
    },
  },
  { file: '06-classes.png', hash: '#/classes/PropostaComercial.estaValida' },
  {
    file: '07-sequencia-caminho-feliz.png',
    hash: '#/sequence',
    setup: () => {
      for (let i = 0; i < 8; i++) document.querySelector('[data-step="next"]').click();
    },
  },
  { file: '08-sequencia-fe01.png', hash: '#/sequence/m7' },
  { file: '09-rastreabilidade-verificacoes.png', hash: '#/traceability' },
  { file: '10-matriz-rastreabilidade.png', hash: '#/traceability', scrollTo: '.matrix' },
  { file: '11-requisitos.png', hash: '#/requirements/RN02' },
];

/** Diagrams exported alone, at their natural size and twice the pixel density. */
const DIAGRAMS = [
  { file: '1-casos-de-uso.png', hash: '#/use-cases' },
  { file: '2-atividades.png', hash: '#/activity' },
  { file: '3-classes.png', hash: '#/classes' },
  { file: '4-sequencia.png', hash: '#/sequence' },
];

async function open(page, hash) {
  // A fresh load per shot keeps every screen in its initial state.
  await page.goto('about:blank');
  await page.goto(BASE_URL + hash, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await wait(500);
}

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
fs.mkdirSync(DIAGRAMS_DIR, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME_PATH, args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', (error) => console.error('page error:', error.message));

await page.setViewport({ width: 1600, height: 960, deviceScaleFactor: 1 });
for (const shot of SHOTS) {
  await open(page, shot.hash);
  if (shot.setup) await page.evaluate(shot.setup);
  if (shot.scrollTo) {
    await page.evaluate((selector) => {
      const target = document.querySelector(selector);
      const scroller = document.querySelector('.document');
      scroller.scrollTop += target.getBoundingClientRect().top - 140;
    }, shot.scrollTo);
  }
  await wait(1500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, shot.file), fullPage: shot.fullPage === true });
  console.log('screenshot', shot.file);
}

await page.setViewport({ width: 1600, height: 960, deviceScaleFactor: 2 });
for (const diagram of DIAGRAMS) {
  await open(page, diagram.hash);
  await page.evaluate(() => {
    // Natural size, no highlight, no player state: the diagram exactly as delivered.
    document.querySelector('.stage-scroll').classList.remove('fit');
    // Let the page grow to the diagram, so nothing is clipped by the scroll area.
    const style = document.createElement('style');
    style.textContent = '.screen{height:auto!important;overflow:visible!important}.artifact-layout{display:block!important}' +
      '.stage-scroll{overflow:visible!important;max-height:none!important}.panel,.stage-toolbar,.screen-header{display:none!important}';
    document.head.appendChild(style);
    for (const element of document.querySelectorAll('.is-muted, .is-done, .is-current, .is-selected, .is-related')) {
      element.classList.remove('is-muted', 'is-done', 'is-current', 'is-selected', 'is-related');
    }
  });
  const svg = await page.$('.stage-scroll .uml');
  await svg.screenshot({ path: path.join(DIAGRAMS_DIR, diagram.file) });
  console.log('diagram', diagram.file);
}

await browser.close();
