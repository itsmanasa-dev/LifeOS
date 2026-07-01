import 'dart:math';
import '../models/timetable_model.dart';

class TimetableOcrParser {
  static const List<String> _colors = [
    '#6366F1', // Indigo
    '#8B5CF6', // Purple
    '#10B981', // Emerald
    '#06B6D4', // Cyan
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#3B82F6', // Blue
  ];

  static String getColorForSubject(String subject) {
    final clean = subject.trim().toLowerCase();
    if (clean.isEmpty) return _colors[0];
    int hash = 0;
    for (int i = 0; i < clean.length; i++) {
      hash = clean.codeUnitAt(i) + ((hash << 5) - hash);
    }
    final index = hash.abs() % _colors.length;
    return _colors[index];
  }

  static List<TimetableEntry> parse(String text) {
    final List<TimetableEntry> entries = [];
    final lines = text.split('\n');
    int currentDay = 1; // Default to Monday

    final timeRegex = RegExp(r'(\d{1,2}[:.]\d{2})\s*(?:-|–|to)\s*(\d{1,2}[:.]\d{2})', caseSensitive: false);
    final roomRegex = RegExp(r'\b(?:room|lab|class|hall)\s*([a-zA-Z0-9_-]+)\b', caseSensitive: false);

    for (var line in lines) {
      final cleanLine = line.trim();
      if (cleanLine.isEmpty) continue;

      final lowerLine = cleanLine.toLowerCase();
      if (lowerLine.contains('monday') || lowerLine.contains('mon')) {
        currentDay = 1;
      } else if (lowerLine.contains('tuesday') || lowerLine.contains('tue')) {
        currentDay = 2;
      } else if (lowerLine.contains('wednesday') || lowerLine.contains('wed')) {
        currentDay = 3;
      } else if (lowerLine.contains('thursday') || lowerLine.contains('thu')) {
        currentDay = 4;
      } else if (lowerLine.contains('friday') || lowerLine.contains('fri')) {
        currentDay = 5;
      } else if (lowerLine.contains('saturday') || lowerLine.contains('sat')) {
        currentDay = 6;
      } else if (lowerLine.contains('sunday') || lowerLine.contains('sun')) {
        currentDay = 7;
      }

      final timeMatch = timeRegex.firstMatch(cleanLine);
      if (timeMatch != null) {
        String startTime = timeMatch.group(1)!.replaceAll('.', ':');
        String endTime = timeMatch.group(2)!.replaceAll('.', ':');

        if (startTime.length == 4) startTime = '0$startTime';
        if (endTime.length == 4) endTime = '0$endTime';

        String type = 'Lecture';
        if (lowerLine.contains('lab') || lowerLine.contains('practical') || lowerLine.contains('laboratory')) {
          type = 'Lab';
        }

        String? room;
        final roomMatch = roomRegex.firstMatch(cleanLine);
        if (roomMatch != null) {
          room = roomMatch.group(1);
        } else {
          final rPattern = RegExp(r'\b([rlRL]-\d{3}|\d{3})\b');
          final rMatch = rPattern.firstMatch(cleanLine);
          if (rMatch != null) {
            room = rMatch.group(1);
          }
        }

        String subjectText = cleanLine
            .replaceAll(timeRegex, '')
            .replaceAll(roomRegex, '')
            .replaceAll(RegExp(r'\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b', caseSensitive: false), '')
            .replaceAll(RegExp(r'\b(?:lecture|lab|class|room|hall|practical|subject)\b', caseSensitive: false), '')
            .replaceAll(RegExp(r'[^a-zA-Z0-9\s&]'), '')
            .trim();

        subjectText = subjectText.replaceAll(RegExp(r'\s+'), ' ');

        if (subjectText.isEmpty) {
          subjectText = type == 'Lab' ? 'Practical Lab' : 'Lecture Slot';
        }

        if (subjectText.length > 2) {
          entries.add(
            TimetableEntry(
              id: 'extracted-${Random().nextInt(1000000)}',
              subjectName: subjectText,
              subjectColor: getColorForSubject(subjectText),
              startTime: startTime,
              endTime: endTime,
              room: room,
              dayOfWeek: currentDay,
              type: type,
            ),
          );
        }
      }
    }

    return entries;
  }

  static List<TimetableEntry> getSeedTimetable() {
    return const [
      // Monday
      TimetableEntry(id: 'c-1', subjectName: 'Data Structures', subjectColor: '#6366F1', startTime: '09:00', endTime: '09:50', room: 'L-403', dayOfWeek: 1, type: 'Lecture'),
      TimetableEntry(id: 'c-2', subjectName: 'DBMS', subjectColor: '#06B6D4', startTime: '10:00', endTime: '10:50', room: 'L-403', dayOfWeek: 1, type: 'Lecture'),
      TimetableEntry(id: 'c-3', subjectName: 'Operating Systems', subjectColor: '#8B5CF6', startTime: '11:10', endTime: '12:00', room: 'Room 401', dayOfWeek: 1, type: 'Lecture'),
      TimetableEntry(id: 'c-4', subjectName: 'DS Lab', subjectColor: '#10B981', startTime: '13:00', endTime: '14:00', room: 'Lab 2', dayOfWeek: 1, type: 'Lab'),
      TimetableEntry(id: 'c-5', subjectName: 'Computer Networks', subjectColor: '#F59E0B', startTime: '14:10', endTime: '15:00', room: 'L-403', dayOfWeek: 1, type: 'Lecture'),
      
      // Tuesday
      TimetableEntry(id: 'c-6', subjectName: 'Design & Analysis of Algorithms', subjectColor: '#6366F1', startTime: '09:00', endTime: '09:50', room: 'Room 402', dayOfWeek: 2, type: 'Lecture'),
      TimetableEntry(id: 'c-7', subjectName: 'Computer Organization', subjectColor: '#F59E0B', startTime: '10:00', endTime: '10:50', room: 'Room 402', dayOfWeek: 2, type: 'Lecture'),
      
      // Wednesday
      TimetableEntry(id: 'c-8', subjectName: 'DBMS Lab', subjectColor: '#06B6D4', startTime: '11:10', endTime: '12:00', room: 'Lab 2', dayOfWeek: 3, type: 'Lab'),
    ];
  }
}
