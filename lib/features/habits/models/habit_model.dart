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
}
