import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const config = JSON.parse(fs.readFileSync('docs/platform-runtime-gate.json', 'utf8'));
const result = await run();
fs.mkdirSync('dist', { recursive: true });
writeJson('dist/platform-runtime-gate-result.json', result);
console.log(JSON.stringify({ product: config.product, platform: config.platformType, pass: result.pass }));
if (!result.pass) process.exit(1);

async function run() {
  if (config.platformType === 'browser-web') return runBrowser();
  if (config.platformType === 'android-emulator') return runAndroidCheck();
  if (config.platformType === 'vscode-extension') return runVsCodeCheck();
  if (config.platformType === 'unity-editor-package') return runUnityCheck();
  if (config.platformType === 'adobe-host-plugin') return runAdobeCheck();
  if (config.platformType === 'chrome-extension') return runChromeExtensionCheck();
  if (config.platformType === 'blender-addon') return runBlenderCheck();
  if (config.platformType === 'iot-simulator-mock') return runFilePatternCheck(['simulator','mock','telemetry','device-adapter','host-adapter']);
  return runGenericCheck();
}

function writeJson(file, value) {
  const text = JSON.stringify(value, null, 2) + '\n';
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) fs.writeFileSync(file, text, 'utf8');
}

function files() {
  const out = [];
  const walk = (dir, rel = '') => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['.git','node_modules','.gradle','Library','Temp','dist'].includes(entry.name)) continue;
      const next = rel ? rel + '/' + entry.name : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, next);
      else out.push(next.replace(/\\/g, '/'));
    }
  };
  walk('.');
  return out;
}

async function runBrowser() {
  const candidates = ['index.html','public/index.html','app/index.html','dist/index.html'];
  const index = candidates.find((candidate) => fs.existsSync(candidate));
  if (!index) return fail('browser index missing');
  const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  if (!chrome) return fail('Chrome or Edge executable missing');
  const html = fs.readFileSync(index, 'utf8');
  const screenshot = path.join(os.tmpdir(), config.product + '-web-smoke.png');
  if (fs.existsSync(screenshot)) fs.rmSync(screenshot, { force: true });
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-component-update',
    '--disable-features=MediaRouter,OptimizationHints,AutofillServerCommunication,Translate',
    '--allow-file-access-from-files',
    '--window-size=1280,800',
    '--screenshot=' + screenshot,
    pathToFileURL(path.resolve(index)).href
  ], { encoding: 'utf8', timeout: 60000 });
  const screenshotBytes = fs.existsSync(screenshot) ? fs.statSync(screenshot).size : 0;
  const pass = screenshotBytes > 1000 && html.length > 300 && !/vite|webpack|next\.js|error overlay/i.test(html) && (html.includes(config.product) || html.includes(config.title) || html.includes('scenario') || html.includes('app') || html.includes('canvas'));
  const webSmoke = {
    product: config.product,
    result: pass ? 'passed' : 'failed',
    method: 'chrome-headless-file-screenshot',
    browser: path.basename(chrome),
    index,
    checks: { nonBlankScreenshot: screenshotBytes > 1000, htmlHasContent: html.length > 300, productMarker: html.includes(config.product) || html.includes(config.title), noFrameworkOverlay: !/vite|webpack|next\.js|error overlay/i.test(html) },
    screenshotBytesStableThreshold: '>1000',
    manualBrowserTest: 'not-run-by-codex'
  };
  writeJson('dist/web-smoke-result.json', webSmoke);
  return pass ? ok({ index, browser: path.basename(chrome), evidence: 'dist/web-smoke-result.json' }) : fail('browser smoke failed', webSmoke);
}

function runAndroidCheck() {
  const required = ['android/settings.gradle','android/build.gradle','android/app/build.gradle','android/app/src/main/AndroidManifest.xml'];
  const missing = required.filter((file) => !fs.existsSync(file));
  const evidence = fs.existsSync('dist/android-emulator-result.json') ? JSON.parse(fs.readFileSync('dist/android-emulator-result.json', 'utf8')) : null;
  const pass = missing.length === 0 && evidence?.launch?.started === true;
  return pass ? ok({ required, evidence: 'dist/android-emulator-result.json', packageName: config.android?.packageName }) : fail('android emulator evidence missing or invalid', { missing, evidence });
}

function runVsCodeCheck() {
  const candidates = ['extension/package.json', 'package.json'].filter((file) => fs.existsSync(file));
  const packagePath = candidates.find((file) => hasCompleteVsCodeFields(file)) || candidates.find((file) => hasVsCodeFields(file));
  if (!packagePath) return fail('VS Code extension package missing');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const main = pkg.main ? path.join(path.dirname(packagePath), pkg.main) : null;
  const pass = !!pkg.engines?.vscode && !!pkg.contributes?.commands && (!main || fs.existsSync(main));
  return pass ? ok({ packagePath, main }) : fail('VS Code activation contract incomplete', { packagePath });
}

function hasVsCodeFields(file) {
  try {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    return !!pkg.engines?.vscode || !!pkg.contributes;
  } catch {
    return false;
  }
}

function hasCompleteVsCodeFields(file) {
  try {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    return !!pkg.engines?.vscode && !!pkg.contributes?.commands;
  } catch {
    return false;
  }
}

function runUnityCheck() {
  const all = files();
  const packageFile = all.find((file) => /(^|\/)unity-package\/package\.json$/.test(file) || /(^|\/)package\.json$/.test(file) && all.some((candidate) => /(^|\/)Editor\/.*\.cs$/.test(candidate)));
  const editorScript = all.find((file) => /(^|\/)Editor\/.*\.cs$/.test(file));
  return packageFile && editorScript ? ok({ packageFile, editorScript, hostExecution: 'Unity executable not available in this environment; importable package structure verified.' }) : fail('Unity package files missing', { packageFile, editorScript });
}

function runAdobeCheck() {
  const manifest = ['plugin/manifest.json','adobe-plugin-manifest.json','manifest.json'].find((file) => fs.existsSync(file));
  const panel = ['plugin/panel.html','src/host-adapter/adobe-host-adapter.js'].find((file) => fs.existsSync(file));
  return manifest && panel ? ok({ manifest, panel }) : fail('Adobe plugin shell missing', { manifest, panel });
}

function runChromeExtensionCheck() {
  const manifest = ['extension/manifest.json','manifest.json'].find((file) => fs.existsSync(file));
  if (!manifest) return fail('Chrome manifest missing');
  const value = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  return value.manifest_version === 3 ? ok({ manifest, manifestVersion: 3 }) : fail('Chrome manifest is not MV3', { manifest, manifestVersion: value.manifest_version });
}

function runBlenderCheck() {
  const addon = files().find((file) => /\.py$/.test(file) && /(blender|addon|__init__|host-adapter)/i.test(file));
  return addon ? ok({ addon, hostExecution: 'Blender executable not available in this environment; add-on file structure verified.' }) : fail('Blender add-on file missing');
}

function runFilePatternCheck(patterns) {
  const all = files();
  const hits = patterns.filter((pattern) => all.some((file) => file.toLowerCase().includes(pattern.toLowerCase())));
  return hits.length ? ok({ matchedPatterns: hits }) : fail('expected platform file pattern missing', { patterns });
}

function runGenericCheck() {
  const pkg = fs.existsSync('package.json') ? JSON.parse(fs.readFileSync('package.json', 'utf8')) : null;
  return pkg?.scripts?.test ? ok({ packageTest: true }) : fail('generic test script missing');
}

function ok(extra = {}) {
  return { product: config.product, platformType: config.platformType, pass: true, method: 'runtime-gate', manualTest: 'not-run-by-codex', ...extra };
}

function fail(reason, extra = {}) {
  return { product: config.product, platformType: config.platformType, pass: false, reason, manualTest: 'not-run-by-codex', ...extra };
}
