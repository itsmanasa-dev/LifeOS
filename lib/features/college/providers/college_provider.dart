import 'package:flutter/foundation.dart';

import '../models/timetable_model.dart';

class CollegeProvider extends ChangeNotifier {
  final List<TimetableEntry> _todayEntries = const [
    TimetableEntry(
      id: 'class-1',
      subjectName: 'Data Structures',
      subjectColor: '#6366F1',
      startTime: '09:00',
      endTime: '10:30',
      room: 'Lab 2',
    ),
    TimetableEntry(
      id: 'class-2',
      subjectName: 'Operating Systems',
      subjectColor: '#06B6D4',
      startTime: '11:00',
      endTime: '12:00',
      room: 'Room 401',
    ),
  ];

  List<TimetableEntry> get todayEntries => List.unmodifiable(_todayEntries);

  Future<void> load() async {
    await Future<void>.delayed(const Duration(milliseconds: 120));
    notifyListeners();
  }
}
