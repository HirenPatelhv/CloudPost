const fs = require('fs');
const path = require('path');

function ensureBinPermissions() {
  if (process.platform === 'win32') return;
  try {
    const binDir = path.join(process.cwd(), 'node_modules', '.bin');
    if (fs.existsSync(binDir)) {
      const files = fs.readdirSync(binDir);
      for (const file of files) {
        try {
          fs.chmodSync(path.join(binDir, file), 0o755);
        } catch (_) {}
      }
      console.log('✓ Verified executable permissions on node_modules/.bin');
    }
  } catch (_) {}
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
