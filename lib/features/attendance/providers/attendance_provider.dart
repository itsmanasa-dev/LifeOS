import 'dart:math';
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

  List<AttendanceSubject> get subjects => List.unmodifiable(_subjects);
  List<AttendanceRecord> get records => List.unmodifiable(_records);
  bool get isLoading => _isLoading;

  double get overallPercentage {
    if (_subjects.isEmpty) return 100.0;
    int totalAttended = 0;
    int totalClasses = 0;
    for (final s in _subjects) {
      totalAttended += s.attendedCount;
      totalClasses += s.totalCount;
    }
    if (totalClasses == 0) return 100.0;
    return (totalAttended / totalClasses) * 100.0;
  }

  int get overallAttended {
    return _subjects.fold(0, (sum, s) => sum + s.attendedCount);
  }

  int get overallAbsent {
    return _subjects.fold(0, (sum, s) => sum + (s.totalCount - s.attendedCount));
  }

  int get overallTotal {
    return _subjects.fold(0, (sum, s) => sum + s.totalCount);
  }

  int get overallLabCount {
    // Filter subjects where the name contains 'lab' or type is lab
    return _subjects
        .where((s) => s.name.toLowerCase().contains('lab'))
        .fold(0, (sum, s) => sum + s.attendedCount);
  }

  Future<void> _loadFromHive() async {
    _isLoading = true;
    notifyListeners();

    // Load subjects
    final rawSubjects = HiveService.instance.getAll(AppConstants.attendanceBox);
    if (rawSubjects.isEmpty) {
      _subjects = _seedSubjects();
      await _saveSubjectsToHive();
    } else {
      // Filter out 'records' which is stored under a custom key in the same box
      final subjectsOnly = rawSubjects.where((element) {
        if (element is Map) {
          return element.containsKey('id') && element.containsKey('name');
        }
        return false;
      });

      _subjects = subjectsOnly
          .map((e) => AttendanceSubject.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }

    // Load records
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

  Future<void> syncSubjectsFromTimetable(List<TimetableEntry> timetable) async {
    _isLoading = true;
    notifyListeners();

    // 1. Clear old data
    await HiveService.instance.clear(AppConstants.attendanceBox);
    _subjects.clear();
    _records.clear();

    // 2. Extract unique subjects
    final Map<String, TimetableEntry> uniqueSubjects = {};
    for (final entry in timetable) {
      uniqueSubjects[entry.subjectName] = entry;
    }

    // 3. Create subjects
    for (final name in uniqueSubjects.keys) {
      final entry = uniqueSubjects[name]!;
      _subjects.add(
        AttendanceSubject(
          id: 'subj-${DateTime.now().millisecondsSinceEpoch}-${name.hashCode.abs()}',
          name: name,
          color: entry.subjectColor,
          attendedCount: 0,
          totalCount: 0,
        ),
      );
    }

    // 4. Save to Hive
    await _saveSubjectsToHive();
    await _saveRecordsToHive();

    _isLoading = false;
    notifyListeners();
  }

  Future<void> logAttendance(String subjectName, bool isPresent, DateTime date, String type) async {
    final index = _subjects.indexWhere((s) => s.name.toLowerCase() == subjectName.toLowerCase());
    if (index < 0) return;

    final subject = _subjects[index];
    final updated = subject.copyWith(
      attendedCount: isPresent ? subject.attendedCount + 1 : subject.attendedCount,
      totalCount: subject.totalCount + 1,
    );

    _subjects[index] = updated;
    notifyListeners();

    await HiveService.instance.put(AppConstants.attendanceBox, subject.id, updated.toJson());

    final record = AttendanceRecord(
      id: 'record-${DateTime.now().millisecondsSinceEpoch}-${subjectName.hashCode.abs()}',
      subjectId: subject.id,
      date: date,
      status: isPresent ? 'present' : 'absent',
      type: type,
    );
    _records.add(record);

    await _saveRecordsToHive();
  }

  Future<void> toggleRecordStatus(String recordId) async {
    final recordIndex = _records.indexWhere((r) => r.id == recordId);
    if (recordIndex < 0) return;

    final record = _records[recordIndex];
    final oldStatus = record.status;
    final newStatus = oldStatus == 'present' ? 'absent' : 'present';

    _records[recordIndex] = AttendanceRecord(
      id: record.id,
      subjectId: record.subjectId,
      date: record.date,
      status: newStatus,
      type: record.type,
    );

    final subjectId = record.subjectId;
    final subjectIndex = _subjects.indexWhere((s) => s.id == subjectId);
    if (subjectIndex >= 0) {
      final subject = _subjects[subjectIndex];
      int newAttended = subject.attendedCount;
      if (oldStatus == 'present' && newStatus == 'absent') {
        newAttended = max(0, newAttended - 1);
      } else if (oldStatus == 'absent' && newStatus == 'present') {
        newAttended = newAttended + 1;
      }
      _subjects[subjectIndex] = subject.copyWith(attendedCount: newAttended);
      await HiveService.instance.put(AppConstants.attendanceBox, subject.id, _subjects[subjectIndex].toJson());
    }

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
    notifyListeners();
    await HiveService.instance.delete(AppConstants.attendanceBox, subjectId);
  }

  Future<void> _saveSubjectsToHive() async {
    for (final s in _subjects) {
      await HiveService.instance.put(AppConstants.attendanceBox, s.id, s.toJson());
    }
  }

  Future<void> _saveRecordsToHive() async {
    final data = _records.map((r) => r.toJson()).toList();
    await HiveService.instance.put(AppConstants.attendanceBox, 'records', data);
  }

  List<AttendanceSubject> _seedSubjects() {
    return const [
      AttendanceSubject(id: 'subj-1', name: 'Data Structures', color: '#6366F1', attendedCount: 18, totalCount: 20),
      AttendanceSubject(id: 'subj-2', name: 'DBMS', color: '#06B6D4', attendedCount: 19, totalCount: 20),
      AttendanceSubject(id: 'subj-3', name: 'Operating Systems', color: '#8B5CF6', attendedCount: 16, totalCount: 20),
      AttendanceSubject(id: 'subj-4', name: 'DS Lab', color: '#10B981', attendedCount: 8, totalCount: 8),
      AttendanceSubject(id: 'subj-5', name: 'Computer Networks', color: '#F59E0B', attendedCount: 17, totalCount: 20),
      AttendanceSubject(id: 'subj-6', name: 'Design & Analysis of Algorithms', color: '#6366F1', attendedCount: 17, totalCount: 20),
      AttendanceSubject(id: 'subj-7', name: 'Computer Organization', color: '#F59E0B', attendedCount: 15, totalCount: 20),
      AttendanceSubject(id: 'subj-8', name: 'DBMS Lab', color: '#06B6D4', attendedCount: 8, totalCount: 8),
    ];
  }
}
