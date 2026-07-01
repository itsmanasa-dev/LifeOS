enum TaskFilter { all, today, upcoming, completed }

class TaskModel {
  const TaskModel({
    required this.id,
    required this.title,
    this.description,
    this.priority = 'medium',
    this.isCompleted = false,
    this.category,
    this.dueDate,
    this.createdAt,
  });

  final String id;
  final String title;
  final String? description;
  final String priority;
  final bool isCompleted;
  final String? category;
  final DateTime? dueDate;
  final DateTime? createdAt;

  bool get isOverdue {
    if (dueDate == null || isCompleted) {
      return false;
    }
    return dueDate!.isBefore(DateTime.now());
  }

  TaskModel copyWith({
    String? id,
    String? title,
    String? description,
    String? priority,
    bool? isCompleted,
    String? category,
    DateTime? dueDate,
    bool clearDueDate = false,
    DateTime? createdAt,
  }) {
    return TaskModel(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      priority: priority ?? this.priority,
      isCompleted: isCompleted ?? this.isCompleted,
      category: category ?? this.category,
      dueDate: clearDueDate ? null : (dueDate ?? this.dueDate),
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
