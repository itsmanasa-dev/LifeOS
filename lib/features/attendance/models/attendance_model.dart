class AttendanceSubject {
  const AttendanceSubject({
    required this.id,
    required this.name,
    required this.color,
    this.targetPercentage = 75.0,
    this.attendedCount = 0,
    this.totalCount = 0,
  });

  final String id;
  final String name;
  final String color;
  final double targetPercentage;
  final int attendedCount;
  final int totalCount;

  double get percentage {
    if (totalCount == 0) return 100.0;
    return (attendedCount / totalCount) * 100.0;
  }

  bool get isBelowTarget => percentage < targetPercentage;

  AttendanceSubject copyWith({
    String? id,
    String? name,
    String? color,
    double? targetPercentage,
    int? attendedCount,
    int? totalCount,
  }) {
    return AttendanceSubject(
      id: id ?? this.id,
      name: name ?? this.name,
      color: color ?? this.color,
      targetPercentage: targetPercentage ?? this.targetPercentage,
      attendedCount: attendedCount ?? this.attendedCount,
      totalCount: totalCount ?? this.totalCount,
    );
  }

  factory AttendanceSubject.fromJson(Map<String, dynamic> json) {
    return AttendanceSubject(
      id: json['id'] as String,
      name: json['name'] as String,
      color: json['color'] as String,
      targetPercentage: (json['targetPercentage'] as num?)?.toDouble() ?? 75.0,
      attendedCount: json['attendedCount'] as int? ?? 0,
      totalCount: json['totalCount'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'color': color,
      'targetPercentage': targetPercentage,
      'attendedCount': attendedCount,
      'totalCount': totalCount,
    };
  }
}

class AttendanceRecord {
  const AttendanceRecord({
    required this.id,
    required this.subjectId,
    required this.date,
    required this.status, // 'present', 'absent', 'cancelled'
    this.type = 'Lecture',
  });

  final String id;
  final String subjectId;
  final DateTime date;
  final String status;
  final String type;

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceRecord(
      id: json['id'] as String,
      subjectId: json['subjectId'] as String,
      date: DateTime.parse(json['date'] as String),
      status: json['status'] as String,
      type: json['type'] as String? ?? 'Lecture',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'subjectId': subjectId,
      'date': date.toIso8601String(),
      'status': status,
      'type': type,
    };
  }
}
