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

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    return TaskModel(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      priority: json['priority'] as String? ?? 'medium',
      isCompleted: json['isCompleted'] as bool? ?? false,
      category: json['category'] as String?,
      dueDate: json['dueDate'] != null ? DateTime.parse(json['dueDate'] as String) : null,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt'] as String) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'priority': priority,
      'isCompleted': isCompleted,
      'category': category,
      'dueDate': dueDate?.toIso8601String(),
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}
