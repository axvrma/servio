const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    name: 'Servio',
    executableName: 'servio',
    icon: './assets/icon',
    appBundleId: 'com.abhishekverma.servio',
    appCategoryType: 'public.app-category.developer-tools',
    darwinDarkModeSupport: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'Servio',
        setupIcon: './assets/icon.ico',
      },
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'Servio',
        icon: './assets/icon.icns',
        format: 'ULFO',
        overwrite: true,
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          name: 'servio',
          productName: 'Servio',
          genericName: 'Process Manager',
          description: 'A desktop app for managing and monitoring server processes',
          categories: ['Development', 'Utility'],
          icon: './assets/icon.png',
          maintainer: 'Abhishek Verma',
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          name: 'servio',
          productName: 'Servio',
          genericName: 'Process Manager',
          description: 'A desktop app for managing and monitoring server processes',
          categories: ['Development', 'Utility'],
          icon: './assets/icon.png',
        },
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
