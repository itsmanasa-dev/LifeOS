import 'package:flutter/foundation.dart';

import '../models/habit_model.dart';

class HabitProvider extends ChangeNotifier {
  final List<HabitModel> _habits = const [
    HabitModel(
      id: 'habit-1',
      name: 'Drink Water',
      icon: '💧',
      color: '#06B6D4',
    ),
    HabitModel(id: 'habit-2', name: 'Exercise', icon: '🏃', color: '#10B981'),
    HabitModel(id: 'habit-3', name: 'Reading', icon: '📚', color: '#8B5CF6'),
    HabitModel(id: 'habit-4', name: 'Meditation', icon: '🧘', color: '#F59E0B'),
  ];

  final Map<String, HabitLog> _todayLogs = {
    'habit-1': HabitLog(
      habitId: 'habit-1',
      date: DateTime.now(),
      isCompleted: true,
    ),
    'habit-2': HabitLog(
      habitId: 'habit-2',
      date: DateTime.now(),
      isCompleted: false,
    ),
    'habit-3': HabitLog(
      habitId: 'habit-3',
      date: DateTime.now(),
      isCompleted: true,
    ),
  };

  List<HabitModel> get habits => List.unmodifiable(_habits);

  Map<String, HabitLog> get todayLogs => Map.unmodifiable(_todayLogs);

  int get totalActiveHabits => _habits.where((habit) => habit.isActive).length;

  int get todayCompleted =>
      _todayLogs.values.where((log) => log.isCompleted).length;

  double get todayProgress {
    final total = totalActiveHabits;
    if (total == 0) {
      return 0;
    }
    return todayCompleted / total;
  }

  Future<void> loadHabits() async {
    await Future<void>.delayed(const Duration(milliseconds: 120));
    notifyListeners();
  }
}
