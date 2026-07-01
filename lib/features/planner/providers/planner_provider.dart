import 'package:flutter/foundation.dart';

import '../models/task_model.dart';

class PlannerProvider extends ChangeNotifier {
  PlannerProvider() : _tasks = _seedTasks();

  final List<TaskModel> _tasks;
  bool _isLoading = false;
  TaskFilter _activeFilter = TaskFilter.today;

  bool get isLoading => _isLoading;

  TaskFilter get activeFilter => _activeFilter;

  List<TaskModel> get tasks => List.unmodifiable(_tasks);

  List<TaskModel> get todayTasks =>
      _tasks
          .where(
            (task) =>
                task.dueDate != null &&
                _isSameDay(task.dueDate!, DateTime.now()),
          )
          .toList()
        ..sort(_compareTasks);

  List<TaskModel> get upcomingTasks => _tasks.where((task) {
    if (task.dueDate == null || task.isCompleted) {
      return false;
    }
    return _dateOnly(task.dueDate!).isAfter(_dateOnly(DateTime.now()));
  }).toList()..sort(_compareTasks);

  List<TaskModel> get completedTasks =>
      _tasks.where((task) => task.isCompleted).toList()..sort(_compareTasks);

  List<TaskModel> get filteredTasks {
    switch (_activeFilter) {
      case TaskFilter.today:
        return todayTasks;
      case TaskFilter.upcoming:
        return upcomingTasks;
      case TaskFilter.completed:
        return completedTasks;
      case TaskFilter.all:
        return List<TaskModel>.from(_tasks)..sort(_compareTasks);
    }
  }

  Future<void> loadTasks() async {
    _isLoading = true;
    notifyListeners();
    await Future<void>.delayed(const Duration(milliseconds: 150));
    _isLoading = false;
    notifyListeners();
  }

  void setFilter(TaskFilter filter) {
    if (_activeFilter == filter) {
      return;
    }
    _activeFilter = filter;
    notifyListeners();
  }

  void upsertTask(TaskModel task) {
    final index = _tasks.indexWhere((current) => current.id == task.id);
    if (index >= 0) {
      _tasks[index] = task;
    } else {
      _tasks.add(task);
    }
    notifyListeners();
  }

  void toggleComplete(String taskId) {
    final index = _tasks.indexWhere((task) => task.id == taskId);
    if (index < 0) {
      return;
    }
    final current = _tasks[index];
    _tasks[index] = current.copyWith(isCompleted: !current.isCompleted);
    notifyListeners();
  }

  void deleteTask(String taskId) {
    _tasks.removeWhere((task) => task.id == taskId);
    notifyListeners();
  }

  static int _compareTasks(TaskModel a, TaskModel b) {
    final aDue = a.dueDate;
    final bDue = b.dueDate;
    if (aDue == null && bDue == null) {
      return a.title.compareTo(b.title);
    }
    if (aDue == null) {
      return 1;
    }
    if (bDue == null) {
      return -1;
    }
    return aDue.compareTo(bDue);
  }

  static bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  static DateTime _dateOnly(DateTime value) {
    return DateTime(value.year, value.month, value.day);
  }

  static List<TaskModel> _seedTasks() {
    final now = DateTime.now();
    return [
      TaskModel(
        id: 'task-1',
        title: 'Review planner UI',
        description: 'Polish task card spacing and state styles.',
        priority: 'high',
        category: 'Work',
        dueDate: DateTime(now.year, now.month, now.day, 10),
      ),
      TaskModel(
        id: 'task-2',
        title: 'Submit attendance summary',
        priority: 'urgent',
        category: 'College',
        dueDate: DateTime(now.year, now.month, now.day, 17),
      ),
      TaskModel(
        id: 'task-3',
        title: 'Plan tomorrow study block',
        description: 'Prepare topics for reasoning and current affairs.',
        priority: 'medium',
        category: 'Study',
        dueDate: DateTime(now.year, now.month, now.day + 1, 8),
      ),
      TaskModel(
        id: 'task-4',
        title: 'Drink 3L water',
        priority: 'low',
        category: 'Health',
        dueDate: DateTime(now.year, now.month, now.day),
        isCompleted: true,
      ),
    ];
  }
}
