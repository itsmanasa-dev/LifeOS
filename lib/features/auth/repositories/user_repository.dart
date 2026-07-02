import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/services/hive_service.dart';
import '../models/user_model.dart';

abstract class UserRepository {
  Future<UserModel?> getUser(String uid);
  Future<void> saveUser(UserModel user);
  Future<void> cacheUserLocally(UserModel user);
  Future<UserModel?> getCachedUser();
  Future<void> clearLocalCache();
}

class UserRepositoryImpl implements UserRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  @override
  Future<UserModel?> getUser(String uid) async {
    try {
      final doc = await _firestore.collection('users').doc(uid).get();
      if (doc.exists && doc.data() != null) {
        return UserModel.fromJson(doc.data()!);
      }
    } catch (_) {
      // Return null on failure (e.g. offline) to fallback to Hive
    }
    return null;
  }

  @override
  Future<void> saveUser(UserModel user) async {
    try {
      await _firestore.collection('users').doc(user.uid).set(user.toJson());
    } catch (_) {
      // Offline fallback: save locally first, online sync will catch up later
    }
  }

  @override
  Future<void> cacheUserLocally(UserModel user) async {
    await HiveService.instance.put(
      AppConstants.userBox,
      'current_user',
      user.toJson(),
    );
  }

  @override
  Future<UserModel?> getCachedUser() async {
    final cachedData = HiveService.instance.get(
      AppConstants.userBox,
      'current_user',
    );
    if (cachedData != null) {
      return UserModel.fromJson(Map<String, dynamic>.from(cachedData as Map));
    }
    return null;
  }

  @override
  Future<void> clearLocalCache() async {
    await HiveService.instance.delete(
      AppConstants.userBox,
      'current_user',
    );
  }
}
