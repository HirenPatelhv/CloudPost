const path = require('path');
const fs = require('fs');

async function stampExe() {
  const rootDir = path.resolve(__dirname, '..');
  const iconPath = path.join(rootDir, 'build', 'icon.ico');
  const exePath = path.join(rootDir, 'dist_desktop', 'win-unpacked', 'CloudPost.exe');

  if (!fs.existsSync(iconPath)) {
    console.log('[stamp-exe] icon.ico not found at', iconPath);
    return;
  }

  if (!fs.existsSync(exePath)) {
    console.log('[stamp-exe] CloudPost.exe not unpacked yet at', exePath);
    return;
  }

  try {
    const rcedit = require('rcedit');
    console.log('[stamp-exe] Stamping icon into', exePath);
    await rcedit(exePath, {
      icon: iconPath,
      'version-string': {
        ProductName: 'CloudPost',
        FileDescription: 'CloudPost API Platform',
        CompanyName: 'CloudPost Team'
      }
    });
    console.log('✓ Successfully stamped CloudPost icon directly into CloudPost.exe!');
  } catch (err) {
    console.warn('[stamp-exe] Warning stamping exe:', err.message);
  }
}

stampExe();
