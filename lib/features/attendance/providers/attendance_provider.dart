import 'package:flutter/foundation.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/services/hive_service.dart';
import '../models/attendance_model.dart';

class AttendanceProvider extends ChangeNotifier {
  AttendanceProvider() {
    _loadFromHive();
  }

  List<AttendanceSubject> _subjects = [];
  final List<AttendanceRecord> _records = [];
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

  Future<void> _loadFromHive() async {
    _isLoading = true;
    notifyListeners();

    // Load subjects
    final rawSubjects = HiveService.instance.getAll(AppConstants.attendanceBox);
    if (rawSubjects.isEmpty) {
      _subjects = _seedSubjects();
      await _saveSubjectsToHive();
    } else {
      _subjects = rawSubjects
          .map((e) => AttendanceSubject.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> load() async {
    await _loadFromHive();
  }

  Future<void> logAttendance(String subjectId, bool isPresent) async {
    final index = _subjects.indexWhere((s) => s.id == subjectId);
    if (index < 0) return;

    final subject = _subjects[index];
    final updated = subject.copyWith(
      attendedCount: isPresent ? subject.attendedCount + 1 : subject.attendedCount,
      totalCount: subject.totalCount + 1,
    );

    _subjects[index] = updated;
    notifyListeners();

    await HiveService.instance.put(AppConstants.attendanceBox, subjectId, updated.toJson());

    final record = AttendanceRecord(
      id: 'record-${DateTime.now().millisecondsSinceEpoch}',
      subjectId: subjectId,
      date: DateTime.now(),
      status: isPresent ? 'present' : 'absent',
    );
    _records.add(record);
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

  List<AttendanceSubject> _seedSubjects() {
    return const [
      AttendanceSubject(
        id: 'subj-1',
        name: 'Data Structures',
        color: '#6366F1',
        attendedCount: 18,
        totalCount: 22,
      ),
      AttendanceSubject(
        id: 'subj-2',
        name: 'User Experience',
        color: '#8B5CF6',
        attendedCount: 12,
        totalCount: 16,
      ),
      AttendanceSubject(
        id: 'subj-3',
        name: 'Applied Math',
        color: '#10B981',
        attendedCount: 18,
        totalCount: 20,
      ),
      AttendanceSubject(
        id: 'subj-4',
        name: 'Soft Skills',
        color: '#F59E0B',
        attendedCount: 8,
        totalCount: 8,
      ),
    ];
  }
}
