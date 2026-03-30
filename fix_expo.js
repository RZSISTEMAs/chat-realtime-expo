const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'package.json');
let pkg = JSON.parse(fs.readFileSync(p, 'utf8'));

for(let d in pkg.dependencies) {
  if (d === 'expo') {
    pkg.dependencies[d] = '~52.0.49';
  } else if(d.startsWith('expo-') || pkg.dependencies[d].includes('55.0') || pkg.dependencies[d].includes('canary')) {
     pkg.dependencies[d] = '*'; // Allow any version temporarily, so npx expo install --fix can resolve it
  }
}
pkg.dependencies['react'] = '18.3.1';
pkg.dependencies['react-dom'] = '18.3.1';
pkg.dependencies['react-native'] = '0.76.6';

fs.writeFileSync(p, JSON.stringify(pkg, null, 2));
console.log('package.json set to * for expo-* modules');
