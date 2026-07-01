import 'package:flutter/foundation.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/services/hive_service.dart';
import '../models/attendance_model.dart';
import '../../college/models/timetable_model.dart';

class AttendanceProvider extends ChangeNotifier {
  AttendanceProvider() {
    _loadFromHive();
  }

  List<AttendanceSubject> _subjects = [];
  List<AttendanceRecord> _records = [];
  bool _isLoading = false;

  // Compute subject attendedCount, totalCount, and percentage dynamically
  List<AttendanceSubject> get subjects {
    return _subjects.map((sub) {
      final subRecords = _records.where((r) => r.subjectId == sub.id).toList();
      final attended = subRecords.where((r) => r.status == 'present').length;
      final total = subRecords.length;
      return sub.copyWith(
        attendedCount: attended,
        totalCount: total,
      );
    }).toList();
  }

  List<AttendanceRecord> get records => List.unmodifiable(_records);
  bool get isLoading => _isLoading;

  // Purely dynamic calculations from logged records
  double get overallPercentage {
    final totalConducted = _records.length;
    if (totalConducted == 0) return 100.0;
    final totalAttended = _records.where((r) => r.status == 'present').length;
    return (totalAttended / totalConducted) * 100.0;
  }

  int get overallAttended {
    return _records.where((r) => r.status == 'present').length;
  }

  int get overallAbsent {
    return _records.where((r) => r.status == 'absent').length;
  }

  int get overallTotal {
    return _records.length;
  }

  int get overallTheoryCount {
    return _records.where((r) => r.type == 'Lecture').length;
  }

  int get overallLabCount {
    return _records.where((r) => r.type == 'Lab').length;
  }

  Future<void> _loadFromHive() async {
    _isLoading = true;
    notifyListeners();

    final rawSubjects = HiveService.instance.getAll(AppConstants.attendanceBox);
    final subjectsOnly = rawSubjects.where((element) {
      if (element is Map) {
        return element.containsKey('id') && element.containsKey('name');
      }
      return false;
    });

    _subjects = subjectsOnly
        .map((e) => AttendanceSubject.fromJson(Map<String, dynamic>.from(e)))
        .toList();

    final rawRecords = HiveService.instance.get(AppConstants.attendanceBox, 'records');
    if (rawRecords != null) {
      _records = (rawRecords as List)
          .map((e) => AttendanceRecord.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } else {
      _records = [];
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> load() async {
    await _loadFromHive();
  }

  Future<void> syncSubjectsFromTimetable(List<TimetableEntry> timetable, {required bool keepHistory}) async {
    _isLoading = true;
    notifyListeners();

    if (!keepHistory) {
      _records.clear();
      await HiveService.instance.delete(AppConstants.attendanceBox, 'records');
    }

    final Map<String, TimetableEntry> uniqueSubjects = {};
    for (final entry in timetable) {
      uniqueSubjects[entry.subjectName] = entry;
    }

    final List<AttendanceSubject> newSubjectsList = [];

    // Keep existing subjects if in the new timetable, or if they have records logged (when keeping history)
    for (final sub in _subjects) {
      final existsInNew = uniqueSubjects.containsKey(sub.name);
      final hasHistory = _records.any((r) => r.subjectId == sub.id);
      if (existsInNew || (keepHistory && hasHistory)) {
        newSubjectsList.add(sub);
        uniqueSubjects.remove(sub.name);
      }
    }

    // Create new subjects
    for (final name in uniqueSubjects.keys) {
      final entry = uniqueSubjects[name]!;
      newSubjectsList.add(
        AttendanceSubject(
          id: 'subj-${DateTime.now().millisecondsSinceEpoch}-${name.hashCode.abs()}',
          name: name,
          color: entry.subjectColor,
          targetPercentage: 75.0,
          attendedCount: 0,
          totalCount: 0,
        ),
      );
    }

    // Reset Box data
    await HiveService.instance.clear(AppConstants.attendanceBox);
    _subjects = newSubjectsList;

    if (keepHistory && _records.isNotEmpty) {
      final recordsData = _records.map((r) => r.toJson()).toList();
      await HiveService.instance.put(AppConstants.attendanceBox, 'records', recordsData);
    }

    for (final sub in _subjects) {
      await HiveService.instance.put(AppConstants.attendanceBox, sub.id, sub.toJson());
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> logAttendance(String subjectName, bool isPresent, DateTime date, String type) async {
    final index = _subjects.indexWhere((s) => s.name.toLowerCase() == subjectName.toLowerCase());
    if (index < 0) return;

    final subject = _subjects[index];
    final record = AttendanceRecord(
      id: 'record-${DateTime.now().microsecondsSinceEpoch}-${subjectName.hashCode.abs()}',
      subjectId: subject.id,
      date: date,
      status: isPresent ? 'present' : 'absent',
      type: type,
    );

    _records.add(record);
    notifyListeners();

    await _saveRecordsToHive();
  }

  Future<void> toggleRecordStatus(String recordId) async {
    final index = _records.indexWhere((r) => r.id == recordId);
    if (index < 0) return;

    final record = _records[index];
    final newStatus = record.status == 'present' ? 'absent' : 'present';

    _records[index] = AttendanceRecord(
      id: record.id,
      subjectId: record.subjectId,
      date: record.date,
      status: newStatus,
      type: record.type,
    );

    notifyListeners();
    await _saveRecordsToHive();
  }

  Future<void> deleteRecord(String recordId) async {
    _records.removeWhere((r) => r.id == recordId);
    notifyListeners();
    await _saveRecordsToHive();
  }

  Future<void> addSubject(AttendanceSubject subject) async {
    _subjects.add(subject);
    notifyListeners();
    await HiveService.instance.put(AppConstants.attendanceBox, subject.id, subject.toJson());
  }

  Future<void> deleteSubject(String subjectId) async {
    _subjects.removeWhere((s) => s.id == subjectId);
    _records.removeWhere((r) => r.subjectId == subjectId);
    notifyListeners();
    await HiveService.instance.delete(AppConstants.attendanceBox, subjectId);
    await _saveRecordsToHive();
  }

  Future<void> _saveRecordsToHive() async {
    final data = _records.map((r) => r.toJson()).toList();
    await HiveService.instance.put(AppConstants.attendanceBox, 'records', data);
  }
}
