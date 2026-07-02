import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:google_sign_in/google_sign_in.dart';

class AuthService {
  bool get isFirebaseInitialized => Firebase.apps.isNotEmpty;

  FirebaseAuth get _auth => FirebaseAuth.instance;

  // Lazily initialized singleton only invoked on native platforms to prevent Web assertion errors
  static final GoogleSignIn _googleSignInInstance = GoogleSignIn();

  Stream<User?> get authStateChanges {
    if (!isFirebaseInitialized) return const Stream.empty();
    return _auth.authStateChanges();
  }

  User? get currentUser {
    if (!isFirebaseInitialized) return null;
    return _auth.currentUser;
  }

  Future<UserCredential> signInWithEmailAndPassword(String email, String password) async {
    if (!isFirebaseInitialized) {
      throw Exception('Firebase is not initialized. Please verify your platform options.');
    }
    return await _auth.signInWithEmailAndPassword(email: email, password: password);
  }

  Future<UserCredential> createUserWithEmailAndPassword(String email, String password) async {
    if (!isFirebaseInitialized) {
      throw Exception('Firebase is not initialized. Please verify your platform options.');
    }
    return await _auth.createUserWithEmailAndPassword(email: email, password: password);
  }

  Future<UserCredential> signInWithGoogle() async {
    if (!isFirebaseInitialized) {
      throw Exception('Firebase is not initialized. Please verify your platform options.');
    }

    if (kIsWeb) {
      // Production Web Google flow using FirebaseAuth popup dialogs directly (no clientId needed)
      final GoogleAuthProvider provider = GoogleAuthProvider();
      return await _auth.signInWithPopup(provider);
    } else {
      // Native Google flow exchanging credentials with standard API wrappers
      final GoogleSignIn googleSignIn = _googleSignInInstance;
      final GoogleSignInAccount? googleUser = await googleSignIn.signIn();
      if (googleUser == null) {
        throw FirebaseAuthException(code: 'sign_in_canceled', message: 'Google Sign-In canceled.');
      }
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final AuthCredential credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );
      return await _auth.signInWithCredential(credential);
    }
  }

  Future<void> sendPasswordResetEmail(String email) async {
    if (!isFirebaseInitialized) {
      throw Exception('Firebase is not initialized. Please verify your platform options.');
    }
    await _auth.sendPasswordResetEmail(email: email);
  }

  Future<void> sendEmailVerification() async {
    if (!isFirebaseInitialized) {
      throw Exception('Firebase is not initialized. Please verify your platform options.');
    }
    await _auth.currentUser?.sendEmailVerification();
  }

  Future<void> signOut() async {
    if (!isFirebaseInitialized) return;
    await _auth.signOut();
    if (!kIsWeb) {
      try {
        await _googleSignInInstance.signOut();
      } catch (_) {
        // Catch trace in case device platform session was already cleared
      }
    }
  }
}
