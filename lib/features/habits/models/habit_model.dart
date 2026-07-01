class HabitModel {
  const HabitModel({
    required this.id,
    required this.name,
    required this.icon,
    required this.color,
    this.isActive = true,
  });

  final String id;
  final String name;
  final String icon;
  final String color;
  final bool isActive;

  factory HabitModel.fromJson(Map<String, dynamic> json) {
    return HabitModel(
      id: json['id'] as String,
      name: json['name'] as String,
      icon: json['icon'] as String,
      color: json['color'] as String,
      isActive: json['isActive'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'icon': icon,
      'color': color,
      'isActive': isActive,
    };
  }
}

class HabitLog {
  const HabitLog({
    required this.habitId,
    required this.date,
    required this.isCompleted,
  });

  final String habitId;
  final DateTime date;
  final bool isCompleted;

  factory HabitLog.fromJson(Map<String, dynamic> json) {
    return HabitLog(
      habitId: json['habitId'] as String,
      date: DateTime.parse(json['date'] as String),
      isCompleted: json['isCompleted'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'habitId': habitId,
      'date': date.toIso8601String(),
      'isCompleted': isCompleted,
    };
  }
}
