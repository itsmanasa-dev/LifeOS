import 'package:flutter/foundation.dart';

import '../models/user_model.dart';

class AuthProvider extends ChangeNotifier {
  UserModel? _user = const UserModel(
    id: 'demo-user',
    firstName: 'Aman',
    lastName: 'Student',
    email: 'aman@example.com',
    college: 'LifeOS University',
  );

  UserModel? get user => _user;

  bool get isAuthenticated => _user != null;

  Future<void> loadUser() async {}

  void signIn(UserModel user) {
    _user = user;
    notifyListeners();
  }

  void signOut() {
    _user = null;
    notifyListeners();
  }
}
