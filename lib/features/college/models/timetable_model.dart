class TimetableEntry {
  const TimetableEntry({
    required this.id,
    required this.subjectName,
    required this.subjectColor,
    required this.startTime,
    required this.endTime,
    this.room,
    this.dayOfWeek = 1,
    this.type = 'Lecture',
  });

  final String id;
  final String subjectName;
  final String subjectColor;
  final String startTime;
  final String endTime;
  final String? room;
  final int dayOfWeek;
  final String type;

  factory TimetableEntry.fromJson(Map<String, dynamic> json) {
    return TimetableEntry(
      id: json['id'] as String,
      subjectName: json['subjectName'] as String,
      subjectColor: json['subjectColor'] as String,
      startTime: json['startTime'] as String,
      endTime: json['endTime'] as String,
      room: json['room'] as String?,
      dayOfWeek: json['dayOfWeek'] as int? ?? 1,
      type: json['type'] as String? ?? 'Lecture',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'subjectName': subjectName,
      'subjectColor': subjectColor,
      'startTime': startTime,
      'endTime': endTime,
      'room': room,
      'dayOfWeek': dayOfWeek,
      'type': type,
    };
  }
}
