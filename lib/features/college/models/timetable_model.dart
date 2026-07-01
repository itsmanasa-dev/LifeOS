class TimetableEntry {
  const TimetableEntry({
    required this.id,
    required this.subjectName,
    required this.subjectColor,
    required this.startTime,
    required this.endTime,
    this.room,
  });

  final String id;
  final String subjectName;
  final String subjectColor;
  final String startTime;
  final String endTime;
  final String? room;
}
