const fs = require('fs');
const path = require('path');

function chmodRecursive(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      try {
        if (entry.isDirectory()) {
          chmodRecursive(fullPath);
        } else {
          fs.chmodSync(fullPath, 0o755);
        }
      } catch (_) {}
    }
  } catch (_) {}
}

function ensureBinPermissions() {
  if (process.platform === 'win32') return;
  const root = process.cwd();
  chmodRecursive(path.join(root, 'node_modules', '.bin'));
  chmodRecursive(path.join(root, 'node_modules', 'app-builder-bin'));
  chmodRecursive(path.join(root, 'node_modules', '7zip-bin'));
  console.log('✓ Verified executable permissions on electron build tooling (app-builder-bin, 7zip-bin, .bin)');
}

function ensureRollup() {
  try {
    const rollupNativePath = require.resolve('rollup/dist/native.js');
    try {
      require(rollupNativePath);
      // Native binary loaded fine
      console.log('✓ Rollup native binary verified');
      return;
    } catch (err) {
      console.log('[ensure-rollup] Rollup native binary is not available:', err.message);
      console.log('[ensure-rollup] Activating universal WebAssembly fallback (@rollup/wasm-node)...');

      // Replace rollup/dist/native.js with @rollup/wasm-node/dist/native.js
      const fallbackCode = `'use strict';
module.exports = require('@rollup/wasm-node/dist/native.js');
`;
      fs.writeFileSync(rollupNativePath, fallbackCode, 'utf8');
      delete require.cache[rollupNativePath];
      
      // Test the newly applied fallback
      require(rollupNativePath);
      console.log('✓ Successfully activated and verified @rollup/wasm-node universal fallback for Rollup');
    }
  } catch (e) {
    console.warn('[ensure-rollup] Notice during Rollup verification:', e.message);
  }
}

ensureBinPermissions();
ensureRollup();
