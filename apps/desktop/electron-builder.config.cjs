const path = require('node:path');

const desktopDir = __dirname;
const repoRoot = path.join(desktopDir, '../..');
const stagedBridge = path.join(repoRoot, '.desktop-pack/print-bridge');

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.niha.desktop',
  productName: 'Niha',
  electronVersion: '33.2.1',
  directories: {
    output: path.join(repoRoot, 'dist/desktop'),
    buildResources: path.join(desktopDir, 'resources'),
  },
  files: [
    'electron/**/*',
    'package.json',
  ],
  extraResources: [
    {
      from: path.join(repoRoot, 'apps/web/dist'),
      to: 'web/dist',
    },
    {
      from: stagedBridge,
      to: 'print-bridge',
    },
  ],
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    signAndEditExecutable: false,
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    shortcutName: 'Niha POS',
    language: 1025,
    multiLanguageInstaller: false,
    displayLanguageSelector: false,
    include: 'installer.nsh',
    warningsAsErrors: false,
  },
  asar: true,
  npmRebuild: false,
  nodeGypRebuild: false,
  forceCodeSigning: false,
  publish: {
    provider: 'github',
    owner: 'keylanyhotelaswan-cmyk',
    repo: 'niha',
    releaseType: 'release',
  },
};
