import 'dotenv/config';

export default {
  name: 'Tricount',
  slug: 'tricount',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splashscreen_logo.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.paaztek.tricount',
  },
  android: {
    package: 'com.paaztek.tricount',
    adaptiveIcon: {
      backgroundColor: '#ffffff',
    },
  },
  web: {},
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#ffffff',
        //image: './assets/splash-icon.png',
      },
    ],
  ],
  scheme: 'tricount',
  newArchEnabled: true,
  extra: {
    eas: {
      projectId: 'your-project-id',
    },
    firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId:
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  },
  jsEngine: 'hermes',
};
