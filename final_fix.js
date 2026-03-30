const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'package.json');
let pkg = JSON.parse(fs.readFileSync(p, 'utf8'));

for(let d in pkg.dependencies) {
  if (pkg.dependencies[d] === '*') {
     delete pkg.dependencies[d]; // delete the ones left out of the exact list
  }
}
fs.writeFileSync(p, JSON.stringify(pkg, null, 2));
console.log('Orphan dependencies removed!');
