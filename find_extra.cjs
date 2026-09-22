const fs = require('fs');
let content = fs.readFileSync('php_shared_hosting/index.php', 'utf8');

const start = content.indexOf('<div v-else-if="activeRequest"');
const end = content.indexOf('<!-- Quick Auth Presets Modal -->');
const template = content.substring(start, end);

let lines = template.split('\n');
let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const openCount = (line.match(/<div(\s|>)/g) || []).length;
  const closeCount = (line.match(/<\/div>/g) || []).length;
  depth += openCount - closeCount;
  
  if (depth === 0 && i < lines.length - 1) {
    // We found a close that brings depth to 0 BEFORE the end!
    console.log('activeRequest is fully closed at line ' + i);
    console.log('Line contents: ' + line);
    // Let's print the next few lines
    for (let j = i+1; j < Math.min(i+15, lines.length); j++) {
      console.log('  ' + lines[j]);
    }
    break;
  }
}
