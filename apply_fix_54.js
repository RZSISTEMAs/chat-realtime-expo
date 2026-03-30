const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'package.json');
let pkg = JSON.parse(fs.readFileSync(p, 'utf8'));

const correctVersions = {
  "@react-native-async-storage/async-storage": "2.2.0",
  "expo-av": "~16.0.0",
  "expo-constants": "~18.0.13",
  "expo-device": "~8.0.10",
  "expo-font": "~14.0.11",
  "expo-image": "~3.0.11",
  "expo-image-picker": "~17.0.10",
  "expo-linking": "~8.0.11",
  "expo-router": "~6.0.23",
  "expo-splash-screen": "~31.0.13",
  "expo-status-bar": "~3.0.9",
  "expo-symbols": "~1.0.8",
  "expo-system-ui": "~6.0.9",
  "expo-video": "~3.0.16",
  "expo-web-browser": "~15.0.10",
  "react-native": "0.81.5",
  "react-native-gesture-handler": "~2.28.0",
  "react-native-reanimated": "~4.1.1",
  "react-native-safe-area-context": "~5.6.0",
  "react-native-screens": "~4.16.0",
  "react": "19.1.0",
  "react-dom": "19.1.0",
  "expo": "~54.0.0"
};

for (const [dep, version] of Object.entries(correctVersions)) {
  pkg.dependencies[dep] = version;
}
if(pkg.devDependencies && pkg.devDependencies['@types/react']) {
    pkg.devDependencies['@types/react'] = '~19.1.10';
}
// Clean any leftover '*' orphaned dependencies that aren't mapped
for (let d in pkg.dependencies) {
  if (pkg.dependencies[d] === '*') {
     delete pkg.dependencies[d];
  }
}

fs.writeFileSync(p, JSON.stringify(pkg, null, 2));
console.log('package.json fully patched for SDK 54!');
