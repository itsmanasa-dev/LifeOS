import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        return macos;
      case TargetPlatform.windows:
        return windows;
      case TargetPlatform.linux:
        return linux;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: String.fromEnvironment('FIREBASE_API_KEY_WEB', defaultValue: 'AIzaSyDlq5axei_TvTAoZrmDd7VxmB3GDfGYbrE'),
    appId: String.fromEnvironment('FIREBASE_APP_ID_WEB', defaultValue: '1:634862114444:web:7087ea9efb4aa7ffe40da9'),
    messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID_WEB', defaultValue: '634862114444'),
    projectId: String.fromEnvironment('FIREBASE_PROJECT_ID_WEB', defaultValue: 'lifeos-80f46'),
    authDomain: String.fromEnvironment('FIREBASE_AUTH_DOMAIN_WEB', defaultValue: 'lifeos-80f46.firebaseapp.com'),
    storageBucket: String.fromEnvironment('FIREBASE_STORAGE_BUCKET_WEB', defaultValue: 'lifeos-80f46.firebasestorage.app'),
    measurementId: String.fromEnvironment('FIREBASE_MEASUREMENT_ID_WEB', defaultValue: 'G-EPNM2216KG'),
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: String.fromEnvironment('FIREBASE_API_KEY_ANDROID', defaultValue: 'AIzaSyDlq5axei_TvTAoZrmDd7VxmB3GDfGYbrE'),
    appId: String.fromEnvironment('FIREBASE_APP_ID_ANDROID', defaultValue: '1:634862114444:android:mock-android-id'),
    messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID_ANDROID', defaultValue: '634862114444'),
    projectId: String.fromEnvironment('FIREBASE_PROJECT_ID_ANDROID', defaultValue: 'lifeos-80f46'),
    storageBucket: String.fromEnvironment('FIREBASE_STORAGE_BUCKET_ANDROID', defaultValue: 'lifeos-80f46.firebasestorage.app'),
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: String.fromEnvironment('FIREBASE_API_KEY_IOS', defaultValue: 'AIzaSyDlq5axei_TvTAoZrmDd7VxmB3GDfGYbrE'),
    appId: String.fromEnvironment('FIREBASE_APP_ID_IOS', defaultValue: '1:634862114444:ios:mock-ios-id'),
    messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID_IOS', defaultValue: '634862114444'),
    projectId: String.fromEnvironment('FIREBASE_PROJECT_ID_IOS', defaultValue: 'lifeos-80f46'),
    storageBucket: String.fromEnvironment('FIREBASE_STORAGE_BUCKET_IOS', defaultValue: 'lifeos-80f46.firebasestorage.app'),
    iosBundleId: String.fromEnvironment('FIREBASE_IOS_BUNDLE_ID', defaultValue: 'com.example.lifeos'),
  );

  static const FirebaseOptions macos = FirebaseOptions(
    apiKey: String.fromEnvironment('FIREBASE_API_KEY_MACOS', defaultValue: 'AIzaSyDlq5axei_TvTAoZrmDd7VxmB3GDfGYbrE'),
    appId: String.fromEnvironment('FIREBASE_APP_ID_MACOS', defaultValue: '1:634862114444:ios:mock-macos-id'),
    messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID_MACOS', defaultValue: '634862114444'),
    projectId: String.fromEnvironment('FIREBASE_PROJECT_ID_MACOS', defaultValue: 'lifeos-80f46'),
    storageBucket: String.fromEnvironment('FIREBASE_STORAGE_BUCKET_MACOS', defaultValue: 'lifeos-80f46.firebasestorage.app'),
    iosBundleId: String.fromEnvironment('FIREBASE_MACOS_BUNDLE_ID', defaultValue: 'com.example.lifeos'),
  );

  static const FirebaseOptions windows = FirebaseOptions(
    apiKey: String.fromEnvironment('FIREBASE_API_KEY_WINDOWS', defaultValue: 'AIzaSyDlq5axei_TvTAoZrmDd7VxmB3GDfGYbrE'),
    appId: String.fromEnvironment('FIREBASE_APP_ID_WINDOWS', defaultValue: '1:634862114444:web:7087ea9efb4aa7ffe40da9'),
    messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID_WINDOWS', defaultValue: '634862114444'),
    projectId: String.fromEnvironment('FIREBASE_PROJECT_ID_WINDOWS', defaultValue: 'lifeos-80f46'),
    storageBucket: String.fromEnvironment('FIREBASE_STORAGE_BUCKET_WINDOWS', defaultValue: 'lifeos-80f46.firebasestorage.app'),
  );

  static const FirebaseOptions linux = FirebaseOptions(
    apiKey: String.fromEnvironment('FIREBASE_API_KEY_LINUX', defaultValue: 'AIzaSyDlq5axei_TvTAoZrmDd7VxmB3GDfGYbrE'),
    appId: String.fromEnvironment('FIREBASE_APP_ID_LINUX', defaultValue: '1:634862114444:web:7087ea9efb4aa7ffe40da9'),
    messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID_LINUX', defaultValue: '634862114444'),
    projectId: String.fromEnvironment('FIREBASE_PROJECT_ID_LINUX', defaultValue: 'lifeos-80f46'),
    storageBucket: String.fromEnvironment('FIREBASE_STORAGE_BUCKET_LINUX', defaultValue: 'lifeos-80f46.firebasestorage.app'),
  );
}
