import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import 'user_repository.dart';

abstract class AuthRepository {
  Stream<UserModel?> get onAuthStateChanged;
  Future<UserModel?> get currentUser;
  Future<UserModel> signInWithEmailAndPassword(String email, String password);
  Future<UserModel> signUpWithEmailAndPassword(String email, String password, String fullName);
  Future<UserModel> signInWithGoogle();
  Future<void> sendPasswordResetEmail(String email);
  Future<void> sendEmailVerification();
  Future<void> signOut();
}

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl({
    required AuthService authService,
    required UserRepository userRepository,
  })  : _authService = authService,
        _userRepository = userRepository;

  final AuthService _authService;
  final UserRepository _userRepository;

  @override
  Stream<UserModel?> get onAuthStateChanged {
    return _authService.authStateChanges.asyncMap((User? firebaseUser) async {
      if (firebaseUser == null) {
        await _userRepository.clearLocalCache();
        return null;
      }
      
      // Fetch user profile from Firestore or fallback to local cache if offline
      UserModel? user = await _userRepository.getUser(firebaseUser.uid);
      if (user != null) {
        await _userRepository.cacheUserLocally(user);
        return user;
      }

      // Check Hive cache for user profile
      final cachedUser = await _userRepository.getCachedUser();
      if (cachedUser != null && cachedUser.uid == firebaseUser.uid) {
        return cachedUser;
      }

      // In case user profile is missing on Firestore (e.g. initial Google Sign-In)
      final newUser = UserModel(
        uid: firebaseUser.uid,
        fullName: firebaseUser.displayName ?? 'LifeOS User',
        email: firebaseUser.email ?? '',
        photoUrl: firebaseUser.photoURL,
        provider: firebaseUser.providerData.isNotEmpty 
            ? firebaseUser.providerData.first.providerId 
            : 'password',
        createdAt: DateTime.now(),
        lastLogin: DateTime.now(),
      );
      await _userRepository.saveUser(newUser);
      await _userRepository.cacheUserLocally(newUser);
      return newUser;
    });
  }

  @override
  Future<UserModel?> get currentUser async {
    final firebaseUser = _authService.currentUser;
    if (firebaseUser == null) {
      return await _userRepository.getCachedUser();
    }

    final user = await _userRepository.getUser(firebaseUser.uid);
    if (user != null) {
      await _userRepository.cacheUserLocally(user);
      return user;
    }

    return await _userRepository.getCachedUser();
  }

  @override
  Future<UserModel> signInWithEmailAndPassword(String email, String password) async {
    final credential = await _authService.signInWithEmailAndPassword(email, password);
    final firebaseUser = credential.user!;
    
    UserModel? user = await _userRepository.getUser(firebaseUser.uid);
    if (user == null) {
      user = UserModel(
        uid: firebaseUser.uid,
        fullName: firebaseUser.displayName ?? 'LifeOS User',
        email: firebaseUser.email ?? '',
        photoUrl: firebaseUser.photoURL,
        provider: 'password',
        createdAt: DateTime.now(),
        lastLogin: DateTime.now(),
      );
      await _userRepository.saveUser(user);
    } else {
      user = user.copyWith(lastLogin: DateTime.now());
      await _userRepository.saveUser(user);
    }
    
    await _userRepository.cacheUserLocally(user);
    return user;
  }

  @override
  Future<UserModel> signUpWithEmailAndPassword(
    String email,
    String password,
    String fullName,
  ) async {
    final credential = await _authService.createUserWithEmailAndPassword(email, password);
    final firebaseUser = credential.user!;
    await firebaseUser.updateDisplayName(fullName);

    final user = UserModel(
      uid: firebaseUser.uid,
      fullName: fullName,
      email: email,
      photoUrl: firebaseUser.photoURL,
      provider: 'password',
      createdAt: DateTime.now(),
      lastLogin: DateTime.now(),
    );

    await _userRepository.saveUser(user);
    await _userRepository.cacheUserLocally(user);
    return user;
  }

  @override
  Future<UserModel> signInWithGoogle() async {
    final credential = await _authService.signInWithGoogle();
    final firebaseUser = credential.user!;

    UserModel? user = await _userRepository.getUser(firebaseUser.uid);
    if (user == null) {
      user = UserModel(
        uid: firebaseUser.uid,
        fullName: firebaseUser.displayName ?? 'LifeOS User',
        email: firebaseUser.email ?? '',
        photoUrl: firebaseUser.photoURL,
        provider: 'google',
        createdAt: DateTime.now(),
        lastLogin: DateTime.now(),
      );
      await _userRepository.saveUser(user);
    } else {
      user = user.copyWith(
        lastLogin: DateTime.now(),
        fullName: firebaseUser.displayName ?? user.fullName,
        photoUrl: firebaseUser.photoURL ?? user.photoUrl,
      );
      await _userRepository.saveUser(user);
    }

    await _userRepository.cacheUserLocally(user);
    return user;
  }

  @override
  Future<void> sendPasswordResetEmail(String email) async {
    await _authService.sendPasswordResetEmail(email);
  }

  @override
  Future<void> sendEmailVerification() async {
    await _authService.sendEmailVerification();
  }

  @override
  Future<void> signOut() async {
    await _authService.signOut();
    await _userRepository.clearLocalCache();
  }
}
