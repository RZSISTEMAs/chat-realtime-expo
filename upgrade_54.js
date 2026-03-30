const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'package.json');
let pkg = JSON.parse(fs.readFileSync(p, 'utf8'));

pkg.dependencies['expo'] = '~54.0.0';

const flexible = [
  "@react-native-async-storage/async-storage",
  "expo-av",
  "expo-constants",
  "expo-device",
  "expo-font",
  "expo-image",
  "expo-image-picker",
  "expo-linking",
  "expo-router",
  "expo-splash-screen",
  "expo-status-bar",
  "expo-symbols",
  "expo-system-ui",
  "expo-video",
  "expo-web-browser",
  "react-native",
  "react-native-gesture-handler",
  "react-native-reanimated",
  "react-native-safe-area-context",
  "react-native-screens",
  "react-native-web",
  "react",
  "react-dom"
];

for (const dep of flexible) {
   if (pkg.dependencies[dep]) {
       pkg.dependencies[dep] = '*';
   }
}

if(pkg.devDependencies && pkg.devDependencies['@types/react']) {
    pkg.devDependencies['@types/react'] = '*';
}

fs.writeFileSync(p, JSON.stringify(pkg, null, 2));
console.log('package.json adjusted for SDK 54 update!');
