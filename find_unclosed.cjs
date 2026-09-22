const fs = require('fs');
let content = fs.readFileSync('php_shared_hosting/index.php', 'utf8');

const start = content.indexOf('<div v-else-if="activeRequest"');
const end = content.indexOf('<!-- Quick Auth Presets Modal -->');
const template = content.substring(start, end);

let openCount = (template.match(/<div(\s|>)/g) || []).length;
let closeCount = (template.match(/<\/div>/g) || []).length;

console.log('Total <divs> in activeRequest: ' + openCount);
console.log('Total </divs> in activeRequest: ' + closeCount);
