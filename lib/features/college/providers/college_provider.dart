import 'package:flutter/foundation.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/services/hive_service.dart';
import '../models/timetable_model.dart';

class CollegeProvider extends ChangeNotifier {
  CollegeProvider() {
    _loadFromHive();
  }

  List<TimetableEntry> _timetable = [];
  bool _isLoading = false;

  List<TimetableEntry> get timetable => List.unmodifiable(_timetable);
  bool get isLoading => _isLoading;

  List<TimetableEntry> get todayEntries {
    final weekday = DateTime.now().weekday; // 1 = Monday, 7 = Sunday
    return getEntriesForDay(weekday);
  }

  List<TimetableEntry> getEntriesForDay(int dayOfWeek) {
    return _timetable.where((entry) => entry.dayOfWeek == dayOfWeek).toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));
  }

  Future<void> _loadFromHive() async {
    _isLoading = true;
    notifyListeners();

    // Load Timetable
    final rawEntries = HiveService.instance.getAll(AppConstants.timetableBox);
    _timetable = rawEntries
        .map((e) => TimetableEntry.fromJson(Map<String, dynamic>.from(e)))
        .toList();

    _isLoading = false;
    notifyListeners();
  }

  Future<void> load() async {
    await _loadFromHive();
  }

  Future<void> importTimetable(List<TimetableEntry> entries) async {
    _isLoading = true;
    notifyListeners();

    // Clear old timetable from Hive & Memory
    await HiveService.instance.clear(AppConstants.timetableBox);
    _timetable.clear();

    // Put new entries
    _timetable.addAll(entries);
    await _saveAllToHive();

    _isLoading = false;
    notifyListeners();
  }

  Future<void> upsertEntry(TimetableEntry entry) async {
    final index = _timetable.indexWhere((element) => element.id == entry.id);
    if (index >= 0) {
      _timetable[index] = entry;
    } else {
      _timetable.add(entry);
    }
    notifyListeners();
    await HiveService.instance.put(AppConstants.timetableBox, entry.id, entry.toJson());
  }

  Future<void> deleteEntry(String id) async {
    _timetable.removeWhere((entry) => entry.id == id);
    notifyListeners();
    await HiveService.instance.delete(AppConstants.timetableBox, id);
  }

  Future<void> _saveAllToHive() async {
    for (final entry in _timetable) {
      await HiveService.instance.put(AppConstants.timetableBox, entry.id, entry.toJson());
    }
  }
}
