const { execSync } = require('child_process');
const os = require('os');
const path = require('path');

const platform = os.platform(); // 'win32', 'darwin', 'linux'

console.log('====================================================');
console.log('  CloudPost Desktop Multi-Platform Build System     ');
console.log('====================================================');
console.log(`Detected Host OS: ${platform} (${os.type()} ${os.arch()})\n`);

// 1. Prepare icons
console.log('[1/3] Preparing application icons for all OSs...');
execSync('node scripts/prepare-icons.cjs', { stdio: 'inherit' });

// 2. Build React frontend & server bundle
console.log('\n[2/3] Compiling React client and server bundle...');
execSync('npm run build:react', { stdio: 'inherit' });

// 3. Package binaries according to host platform capabilities
console.log('\n[3/3] Packaging desktop binaries...');

if (platform === 'darwin') {
  // On macOS: can build macOS, Windows, and Linux
  console.log('Host is macOS: Compiling macOS (DMG + ZIP), Windows, and Linux...');
  execSync('npx electron-builder -w -m -l', { stdio: 'inherit' });
} else if (platform === 'win32') {
  // On Windows: electron-builder supports Windows and Linux
  console.log('Host is Windows: Compiling Windows (.exe setup & portable) and Linux (.AppImage & .deb)...');
  execSync('npx electron-builder -w -l', { stdio: 'inherit' });
  
  // Stamp Windows icon if needed
  try {
    execSync('node scripts/stamp-exe-icon.cjs', { stdio: 'inherit' });
  } catch (e) {}

  console.log('\n----------------------------------------------------');
  console.log('✓ SUCCESS: Windows and Linux installers built in dist_desktop/:');
  console.log('  - Windows: CloudPost Setup 2.4.0.exe & CloudPost 2.4.0.exe');
  console.log('  - Linux:   CloudPost-2.4.0.AppImage & CloudPost-2.4.0.deb');
  console.log('----------------------------------------------------');
  console.log('ℹ NOTE ABOUT macOS ON WINDOWS:');
  console.log('  Apple strictly prohibits building macOS (.app / .dmg) binaries on Windows NTFS.');
  console.log('  To build the macOS DMG for free without a Mac:');
  console.log('  → Push or export your project to GitHub.');
  console.log('  → The included GitHub Action (.github/workflows/build-desktop.yml) runs');
  console.log('    on an actual Apple macOS runner and outputs CloudPost-2.4.0.dmg.');
  console.log('----------------------------------------------------\n');
} else {
  // On Linux: can build Linux and Windows
  console.log('Host is Linux: Compiling Linux and Windows...');
  execSync('npx electron-builder -l -w', { stdio: 'inherit' });
}
