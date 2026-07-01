import 'package:flutter/foundation.dart';

class AttendanceProvider extends ChangeNotifier {
  double _overallPercentage = 82.0;

  double get overallPercentage => _overallPercentage;

  Future<void> load() async {
    await Future<void>.delayed(const Duration(milliseconds: 120));
    notifyListeners();
  }

  void updateOverallPercentage(double value) {
    _overallPercentage = value;
    notifyListeners();
  }
}
