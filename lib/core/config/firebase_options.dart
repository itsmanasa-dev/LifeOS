import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb, TargetPlatform;
import 'firebase_keys.dart';

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
    apiKey: String.fromEnvironment('FIREBASE_API_KEY_WEB', defaultValue: FirebaseKeys.webApiKey),
    appId: String.fromEnvironment('FIREBASE_APP_ID_WEB', defaultValue: FirebaseKeys.webAppId),
    messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID_WEB', defaultValue: FirebaseKeys.webMessagingSenderId),
    projectId: String.fromEnvironment('FIREBASE_PROJECT_ID_WEB', defaultValue: FirebaseKeys.webProjectId),
    authDomain: String.fromEnvironment('FIREBASE_AUTH_DOMAIN_WEB', defaultValue: FirebaseKeys.webAuthDomain),
    storageBucket: String.fromEnvironment('FIREBASE_STORAGE_BUCKET_WEB', defaultValue: FirebaseKeys.webStorageBucket),
    measurementId: String.fromEnvironment('FIREBASE_MEASUREMENT_ID_WEB', defaultValue: FirebaseKeys.webMeasurementId),
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: String.fromEnvironment('FIREBASE_API_KEY_ANDROID', defaultValue: FirebaseKeys.androidApiKey),
    appId: String.fromEnvironment('FIREBASE_APP_ID_ANDROID', defaultValue: FirebaseKeys.androidAppId),
    messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID_ANDROID', defaultValue: FirebaseKeys.androidMessagingSenderId),
    projectId: String.fromEnvironment('FIREBASE_PROJECT_ID_ANDROID', defaultValue: FirebaseKeys.androidProjectId),
    storageBucket: String.fromEnvironment('FIREBASE_STORAGE_BUCKET_ANDROID', defaultValue: FirebaseKeys.androidStorageBucket),
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: String.fromEnvironment('FIREBASE_API_KEY_IOS', defaultValue: FirebaseKeys.iosApiKey),
    appId: String.fromEnvironment('FIREBASE_APP_ID_IOS', defaultValue: FirebaseKeys.iosAppId),
    messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID_IOS', defaultValue: FirebaseKeys.iosMessagingSenderId),
    projectId: String.fromEnvironment('FIREBASE_PROJECT_ID_IOS', defaultValue: FirebaseKeys.iosProjectId),
    storageBucket: String.fromEnvironment('FIREBASE_STORAGE_BUCKET_IOS', defaultValue: FirebaseKeys.iosStorageBucket),
    iosBundleId: String.fromEnvironment('FIREBASE_IOS_BUNDLE_ID', defaultValue: 'com.example.lifeos'),
  );

  static const FirebaseOptions macos = FirebaseOptions(
    apiKey: String.fromEnvironment('FIREBASE_API_KEY_MACOS', defaultValue: FirebaseKeys.macosApiKey),
    appId: String.fromEnvironment('FIREBASE_APP_ID_MACOS', defaultValue: FirebaseKeys.macosAppId),
    messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID_MACOS', defaultValue: FirebaseKeys.macosMessagingSenderId),
    projectId: String.fromEnvironment('FIREBASE_PROJECT_ID_MACOS', defaultValue: FirebaseKeys.macosProjectId),
    storageBucket: String.fromEnvironment('FIREBASE_STORAGE_BUCKET_MACOS', defaultValue: FirebaseKeys.macosStorageBucket),
    iosBundleId: String.fromEnvironment('FIREBASE_MACOS_BUNDLE_ID', defaultValue: 'com.example.lifeos'),
  );

  static const FirebaseOptions windows = FirebaseOptions(
    apiKey: String.fromEnvironment('FIREBASE_API_KEY_WINDOWS', defaultValue: FirebaseKeys.windowsApiKey),
    appId: String.fromEnvironment('FIREBASE_APP_ID_WINDOWS', defaultValue: FirebaseKeys.windowsAppId),
    messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID_WINDOWS', defaultValue: FirebaseKeys.windowsMessagingSenderId),
    projectId: String.fromEnvironment('FIREBASE_PROJECT_ID_WINDOWS', defaultValue: FirebaseKeys.windowsProjectId),
    storageBucket: String.fromEnvironment('FIREBASE_STORAGE_BUCKET_WINDOWS', defaultValue: FirebaseKeys.windowsStorageBucket),
  );

  static const FirebaseOptions linux = FirebaseOptions(
    apiKey: String.fromEnvironment('FIREBASE_API_KEY_LINUX', defaultValue: FirebaseKeys.linuxApiKey),
    appId: String.fromEnvironment('FIREBASE_APP_ID_LINUX', defaultValue: FirebaseKeys.linuxAppId),
    messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID_LINUX', defaultValue: FirebaseKeys.linuxMessagingSenderId),
    projectId: String.fromEnvironment('FIREBASE_PROJECT_ID_LINUX', defaultValue: FirebaseKeys.linuxProjectId),
    storageBucket: String.fromEnvironment('FIREBASE_STORAGE_BUCKET_LINUX', defaultValue: FirebaseKeys.linuxStorageBucket),
  );
}
