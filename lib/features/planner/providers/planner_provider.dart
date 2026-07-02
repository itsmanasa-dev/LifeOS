import 'package:flutter/foundation.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/services/hive_service.dart';
import '../models/task_model.dart';

class PlannerProvider extends ChangeNotifier {
  PlannerProvider() {
    _loadFromHive();
  }

  List<TaskModel> _tasks = [];
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
                _isSameDay(task.dueDate!, DateTime.now()) &&
                !task.isCompleted,
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

  Future<void> _loadFromHive() async {
    _isLoading = true;
    notifyListeners();

    final rawTasks = HiveService.instance.getAll(AppConstants.tasksBox);
    if (rawTasks.isEmpty) {
      _tasks = _seedTasks();
      await _saveAllToHive();
    } else {
      _tasks = rawTasks
          .map((e) => TaskModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> loadTasks() async {
    await _loadFromHive();
  }

  void setFilter(TaskFilter filter) {
    if (_activeFilter == filter) {
      return;
    }
    _activeFilter = filter;
    notifyListeners();
  }

  Future<void> upsertTask(TaskModel task) async {
    final index = _tasks.indexWhere((current) => current.id == task.id);
    if (index >= 0) {
      _tasks[index] = task;
    } else {
      _tasks.add(task);
    }
    notifyListeners();
    await HiveService.instance.put(AppConstants.tasksBox, task.id, task.toJson());
  }

  Future<void> toggleComplete(String taskId) async {
    final index = _tasks.indexWhere((task) => task.id == taskId);
    if (index < 0) {
      return;
    }
    final current = _tasks[index];
    final updated = current.copyWith(isCompleted: !current.isCompleted);
    _tasks[index] = updated;
    notifyListeners();
    await HiveService.instance.put(AppConstants.tasksBox, taskId, updated.toJson());
  }

  Future<void> deleteTask(String taskId) async {
    _tasks.removeWhere((task) => task.id == taskId);
    notifyListeners();
    await HiveService.instance.delete(AppConstants.tasksBox, taskId);
  }

  Future<void> _saveAllToHive() async {
    for (final task in _tasks) {
      await HiveService.instance.put(AppConstants.tasksBox, task.id, task.toJson());
    }
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
        title: 'Review Planner UI Designs',
        description: 'Polish task card spacing and state styles.',
        priority: 'high',
        category: 'College',
        dueDate: DateTime(now.year, now.month, now.day, 10),
        createdAt: now,
      ),
      TaskModel(
        id: 'task-2',
        title: 'Finish OS Architecture Paper',
        priority: 'urgent',
        category: 'College',
        dueDate: DateTime(now.year, now.month, now.day, 17),
        createdAt: now,
      ),
      TaskModel(
        id: 'task-3',
        title: 'Refactor API Middleware',
        description: 'Optimize focus block database reads.',
        priority: 'medium',
        category: 'Coding',
        dueDate: DateTime(now.year, now.month, now.day + 1, 8),
        createdAt: now,
      ),
      TaskModel(
        id: 'task-4',
        title: 'Submit College Attendance Sheet',
        priority: 'low',
        category: 'College',
        dueDate: DateTime(now.year, now.month, now.day),
        isCompleted: true,
        createdAt: now,
      ),
    ];
  }
}
