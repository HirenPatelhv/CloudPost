const fs = require('fs');
const path = require('path');

function ensureIcons() {
  const rootDir = path.resolve(__dirname, '..');
  const buildDir = path.join(rootDir, 'build');
  const publicDir = path.join(rootDir, 'public');
  const distDir = path.join(rootDir, 'dist');
  const linuxIconsDir = path.join(buildDir, 'icons');

  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
  if (!fs.existsSync(linuxIconsDir)) fs.mkdirSync(linuxIconsDir, { recursive: true });

  const dataFile = path.join(__dirname, 'icon_data.json');
  let icoBuf = null;
  let pngBuf = null;

  if (fs.existsSync(dataFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      if (data.ico) icoBuf = Buffer.from(data.ico, 'base64');
      if (data.png) pngBuf = Buffer.from(data.png, 'base64');
    } catch (e) {
      console.warn('Could not parse icon_data.json:', e.message);
    }
  }

  // Fallback if files already exist on disk
  if (!icoBuf && fs.existsSync(path.join(publicDir, 'icon.ico'))) {
    icoBuf = fs.readFileSync(path.join(publicDir, 'icon.ico'));
  }
  if (!icoBuf && fs.existsSync(path.join(buildDir, 'icon.ico'))) {
    icoBuf = fs.readFileSync(path.join(buildDir, 'icon.ico'));
  }

  if (!pngBuf && fs.existsSync(path.join(publicDir, 'icon.png'))) {
    pngBuf = fs.readFileSync(path.join(publicDir, 'icon.png'));
  }
  if (!pngBuf && fs.existsSync(path.join(buildDir, 'icon.png'))) {
    pngBuf = fs.readFileSync(path.join(buildDir, 'icon.png'));
  }

  if (icoBuf) {
    fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuf);
    fs.writeFileSync(path.join(publicDir, 'icon.ico'), icoBuf);
    fs.writeFileSync(path.join(distDir, 'icon.ico'), icoBuf);
    console.log('✓ Successfully ensured icon.ico in build/, public/, and dist/');
  } else {
    console.warn('Warning: icon.ico buffer not found');
  }

  if (pngBuf) {
    fs.writeFileSync(path.join(buildDir, 'icon.png'), pngBuf);
    fs.writeFileSync(path.join(publicDir, 'icon.png'), pngBuf);
    fs.writeFileSync(path.join(distDir, 'icon.png'), pngBuf);
    fs.writeFileSync(path.join(linuxIconsDir, '512x512.png'), pngBuf);
    console.log('✓ Successfully ensured icon.png in build/, public/, and dist/');

    // Automatically generate high-resolution macOS icon.icns if needed
    try {
      const png2icons = require('png2icons');
      const icnsBuf = png2icons.createICNS(pngBuf, png2icons.BILINEAR, 0);
      if (icnsBuf) {
        fs.writeFileSync(path.join(buildDir, 'icon.icns'), icnsBuf);
        fs.writeFileSync(path.join(publicDir, 'icon.icns'), icnsBuf);
        fs.writeFileSync(path.join(distDir, 'icon.icns'), icnsBuf);
        console.log('✓ Successfully generated macOS icon.icns with png2icons');
      }
    } catch (e) {
      console.warn('Could not generate icon.icns automatically:', e.message);
    }
  }

  // Copy icon.icns if exists
  const icnsSource = path.join(buildDir, 'icon.icns');
  if (fs.existsSync(icnsSource)) {
    fs.copyFileSync(icnsSource, path.join(distDir, 'icon.icns'));
  }
}

ensureIcons();
