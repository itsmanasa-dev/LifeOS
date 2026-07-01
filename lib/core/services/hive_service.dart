import 'package:hive_flutter/hive_flutter.dart';
import '../constants/app_constants.dart';

class HiveService {
  HiveService._();
  static final HiveService instance = HiveService._();

  Future<void> init() async {
    await Hive.initFlutter();
    
    // Open all necessary boxes for local storage
    await Future.wait([
      Hive.openBox(AppConstants.userBox),
      Hive.openBox(AppConstants.tasksBox),
      Hive.openBox(AppConstants.habitsBox),
      Hive.openBox(AppConstants.habitLogsBox),
      Hive.openBox(AppConstants.attendanceBox),
      Hive.openBox(AppConstants.timetableBox),
      Hive.openBox(AppConstants.settingsBox),
    ]);
  }

  /// Write a value to a specific box under a given key
  Future<void> put(String boxName, String key, dynamic value) async {
    final box = Hive.box(boxName);
    await box.put(key, value);
  }

  /// Retrieve a value from a specific box
  dynamic get(String boxName, String key, {dynamic defaultValue}) {
    final box = Hive.box(boxName);
    return box.get(key, defaultValue: defaultValue);
  }

  /// Delete a key-value pair from a specific box
  Future<void> delete(String boxName, String key) async {
    final box = Hive.box(boxName);
    await box.delete(key);
  }

  /// Clear all entries in a specific box
  Future<void> clear(String boxName) async {
    final box = Hive.box(boxName);
    await box.clear();
  }

  /// Get all values stored in a specific box
  List<dynamic> getAll(String boxName) {
    final box = Hive.box(boxName);
    return box.values.toList();
  }

  /// Write multiple key-value pairs in a single operation
  Future<void> putAll(String boxName, Map<String, dynamic> entries) async {
    final box = Hive.box(boxName);
    await box.putAll(entries);
  }
}
