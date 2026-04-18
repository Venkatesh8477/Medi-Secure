const fs = require('fs');
const path = require('path');

const routeDir = path.join(__dirname, 'routes');

const parts = ['comprehensive_1.js', 'comprehensive_2.js', 'comprehensive_3.js'];

let combined = '';
for (const part of parts) {
    combined += fs.readFileSync(path.join(routeDir, part), 'utf8') + '\n';
}

fs.writeFileSync(path.join(routeDir, 'comprehensiveRoutes.js'), combined, 'utf8');
console.log('Successfully combined comprehensiveRoutes.js');

for (const part of parts) {
    fs.unlinkSync(path.join(routeDir, part));
}
console.log('Cleaned up temp files.');
