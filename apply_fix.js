const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'package.json');
let pkg = JSON.parse(fs.readFileSync(p, 'utf8'));

const correctVersions = {
  "@react-native-async-storage/async-storage": "1.23.1",
  "expo-av": "~15.0.2",
  "expo-constants": "~17.0.8",
  "expo-device": "~7.0.3",
  "expo-font": "~13.0.4",
  "expo-image": "~2.0.7",
  "expo-image-picker": "~16.0.6",
  "expo-linking": "~7.0.5",
  "expo-router": "~4.0.22",
  "expo-splash-screen": "~0.29.24",
  "expo-status-bar": "~2.0.1",
  "expo-symbols": "~0.2.2",
  "expo-system-ui": "~4.0.9",
  "expo-video": "~2.0.6",
  "expo-web-browser": "~14.0.2",
  "react-native": "0.76.9",
  "react-native-gesture-handler": "~2.20.2",
  "react-native-reanimated": "~3.16.1",
  "react-native-safe-area-context": "4.12.0",
  "react-native-screens": "~4.4.0",
  "react-native-web": "~0.19.13",
  "react": "18.3.1",
  "react-dom": "18.3.1"
};

for (const [dep, version] of Object.entries(correctVersions)) {
  pkg.dependencies[dep] = version;
}
if(pkg.devDependencies && pkg.devDependencies['@types/react']) {
    pkg.devDependencies['@types/react'] = '~18.3.12';
}

fs.writeFileSync(p, JSON.stringify(pkg, null, 2));
console.log('package.json fully patched!');
