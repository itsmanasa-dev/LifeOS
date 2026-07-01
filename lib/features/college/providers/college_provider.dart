import 'package:flutter/foundation.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/services/hive_service.dart';
import '../models/timetable_model.dart';

class CollegeProvider extends ChangeNotifier {
  CollegeProvider() {
    _loadFromHive();
  }

  double _currentCgpa = 3.88;
  double _targetCgpa = 3.90;
  List<TimetableEntry> _timetable = [];
  bool _isLoading = false;

  double get currentCgpa => _currentCgpa;
  double get targetCgpa => _targetCgpa;
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

    // Load GPA
    _currentCgpa = HiveService.instance.get(
      AppConstants.settingsBox,
      'current_cgpa',
      defaultValue: 3.88,
    ) as double;

    _targetCgpa = HiveService.instance.get(
      AppConstants.settingsBox,
      'target_cgpa',
      defaultValue: 3.90,
    ) as double;

    // Load Timetable
    final rawEntries = HiveService.instance.getAll(AppConstants.timetableBox);
    if (rawEntries.isEmpty) {
      // Seed default classes if empty
      _timetable = _seedTimetable();
      await _saveAllToHive();
    } else {
      _timetable = rawEntries
          .map((e) => TimetableEntry.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> load() async {
    await _loadFromHive();
  }

  Future<void> updateCgpa(double current, double target) async {
    _currentCgpa = current;
    _targetCgpa = target;
    notifyListeners();

    await HiveService.instance.put(AppConstants.settingsBox, 'current_cgpa', current);
    await HiveService.instance.put(AppConstants.settingsBox, 'target_cgpa', target);
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

  List<TimetableEntry> _seedTimetable() {
    return const [
      // Monday
      TimetableEntry(
        id: 'class-1',
        subjectName: 'Data Structures',
        subjectColor: '#6366F1',
        startTime: '09:00',
        endTime: '10:30',
        room: 'Lab 2',
        dayOfWeek: 1,
      ),
      TimetableEntry(
        id: 'class-2',
        subjectName: 'Applied Math',
        subjectColor: '#10B981',
        startTime: '11:00',
        endTime: '12:30',
        room: 'L-403',
        dayOfWeek: 1,
      ),
      // Tuesday
      TimetableEntry(
        id: 'class-3',
        subjectName: 'Operating Systems',
        subjectColor: '#06B6D4',
        startTime: '09:00',
        endTime: '10:30',
        room: 'Room 401',
        dayOfWeek: 2,
      ),
      // Wednesday
      TimetableEntry(
        id: 'class-4',
        subjectName: 'Data Structures',
        subjectColor: '#6366F1',
        startTime: '09:00',
        endTime: '10:30',
        room: 'Lab 2',
        dayOfWeek: 3,
      ),
      // Thursday
      TimetableEntry(
        id: 'class-5',
        subjectName: 'User Experience',
        subjectColor: '#8B5CF6',
        startTime: '13:00',
        endTime: '14:30',
        room: 'Lab 4',
        dayOfWeek: 4,
      ),
      // Friday
      TimetableEntry(
        id: 'class-6',
        subjectName: 'Soft Skills',
        subjectColor: '#F59E0B',
        startTime: '10:00',
        endTime: '11:30',
        room: 'Seminar Room',
        dayOfWeek: 5,
      ),
    ];
  }
}
