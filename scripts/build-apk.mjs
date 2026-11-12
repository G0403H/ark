import { execSync } from 'node:child_process';
import { cpSync, existsSync, copyFileSync, rmSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

console.log('=== [1/4] Building web application bundle ===');
execSync('npm run build', { cwd: root, stdio: 'inherit' });

console.log('=== [2/4] Generating static offline pages for SPA ===');
execSync('node scripts/generate-spa-html.mjs', { cwd: root, stdio: 'inherit' });

console.log('=== [3/4] Syncing assets to Android assets folder ===');
const staticDir = resolve(root, '.vercel/output/static');
const androidAssetsDir = resolve(root, 'android/app/src/main/assets');
const androidAssetsWww = resolve(androidAssetsDir, 'www');

// Clean previous assets to prevent stale bundles
rmSync(androidAssetsDir, { recursive: true, force: true });
mkdirSync(androidAssetsWww, { recursive: true });

// Copy all static files into www/
cpSync(staticDir, androidAssetsWww, { recursive: true, force: true });

console.log('=== [4/4] Assembling Release APK with Gradle ===');
const androidDir = resolve(root, 'android');
const gradlewCmd = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
execSync(`${gradlewCmd} assembleRelease`, { cwd: androidDir, stdio: 'inherit' });

const builtApk = resolve(androidDir, 'app/build/outputs/apk/release/app-release.apk');
const targetApk = resolve(root, 'kovcheg-release.apk');

if (existsSync(builtApk)) {
  copyFileSync(builtApk, targetApk);
  console.log(`\n✅ Release APK successfully built and saved to: ${targetApk}`);
} else {
  console.error('\n❌ Could not find generated APK at', builtApk);
  process.exit(1);
}
