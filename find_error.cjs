const fs = require('fs');
const { parse } = require('@vue/compiler-dom');
const code = fs.readFileSync('left_panel.html', 'utf8');

const lines = code.split('\n');

// Try parsing line 5 to line X
for (let end = 5; end < lines.length; end++) {
    const snippet = lines.slice(4, end).join('\n') + '\n</div></div></div></div></div></div></div></div></div></div></div></div></div>'; // give it plenty of closing tags
    try {
        parse(snippet);
    } catch (e) {
        if (e.message.includes('Element is missing end tag') && e.loc.start.line !== 1) {
            console.log(`Error starts happening at line ${end + 4}: ${e.message}`);
            break;
        } else if (e.message.includes('Invalid end tag')) {
            // Ignore extra end tags
        } else {
             // console.log(`Other error at ${end}: ${e.message}`);
        }
    }
}
