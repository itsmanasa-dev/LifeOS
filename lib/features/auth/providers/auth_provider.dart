import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../repositories/auth_repository.dart';
import '../repositories/user_repository.dart';

class AuthProvider extends ChangeNotifier {
  AuthProvider({
    AuthRepository? authRepository,
    UserRepository? userRepository,
  })  : _authRepository = authRepository ?? AuthRepositoryImpl(
          authService: AuthService(),
          userRepository: userRepository ?? UserRepositoryImpl(),
        ),
        _userRepository = userRepository ?? UserRepositoryImpl() {
    _initSessionListener();
  }

  final AuthRepository _authRepository;
  final UserRepository _userRepository;

  UserModel? _user;
  bool _isLoading = false;
  StreamSubscription<UserModel?>? _authSubscription;

  UserModel? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get isLoading => _isLoading;

  bool get isFirebaseInitialized => Firebase.apps.isNotEmpty;

  void _initSessionListener() {
    _isLoading = true;
    notifyListeners();

    if (!isFirebaseInitialized) {
      debugPrint('Firebase not initialized. Attempting local user cache retrieval.');
      _userRepository.getCachedUser().then((cachedUser) {
        _user = cachedUser;
        _isLoading = false;
        notifyListeners();
      });
      return;
    }

    try {
      _authSubscription = _authRepository.onAuthStateChanged.listen((UserModel? user) {
        _user = user;
        _isLoading = false;
        notifyListeners();
      }, onError: (err, stackTrace) {
        debugPrint('Auth listener error: $err\n$stackTrace');
        _isLoading = false;
        notifyListeners();
      });
    } catch (e, stackTrace) {
      debugPrint('Auth listener init warning: $e\n$stackTrace');
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> signInWithEmailAndPassword(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      _user = await _authRepository.signInWithEmailAndPassword(email, password);
    } on FirebaseAuthException catch (_) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    } catch (e, stackTrace) {
      _isLoading = false;
      notifyListeners();
      debugPrint('Unexpected error: $e\n$stackTrace');
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> signUpWithEmailAndPassword(String email, String password, String fullName) async {
    _isLoading = true;
    notifyListeners();

    try {
      _user = await _authRepository.signUpWithEmailAndPassword(email, password, fullName);
    } on FirebaseAuthException catch (_) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    } catch (e, stackTrace) {
      _isLoading = false;
      notifyListeners();
      debugPrint('Unexpected error: $e\n$stackTrace');
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> signInWithGoogle() async {
    _isLoading = true;
    notifyListeners();

    try {
      _user = await _authRepository.signInWithGoogle();
    } on FirebaseAuthException catch (_) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    } catch (e, stackTrace) {
      _isLoading = false;
      notifyListeners();
      debugPrint('Unexpected error: $e\n$stackTrace');
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> resetPassword(String email) async {
    try {
      await _authRepository.sendPasswordResetEmail(email);
    } on FirebaseAuthException catch (_) {
      rethrow;
    } catch (e, stackTrace) {
      debugPrint('Unexpected error: $e\n$stackTrace');
      rethrow;
    }
  }

  Future<void> sendEmailVerification() async {
    try {
      await _authRepository.sendEmailVerification();
    } on FirebaseAuthException catch (_) {
      rethrow;
    } catch (e, stackTrace) {
      debugPrint('Unexpected error: $e\n$stackTrace');
      rethrow;
    }
  }

  Future<void> signOut() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _authRepository.signOut();
      _user = null;
    } catch (_) {
      _user = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }
}
