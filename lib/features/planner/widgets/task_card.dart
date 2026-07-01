import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../models/task_model.dart';
import '../providers/planner_provider.dart';
import '../widgets/add_task_sheet.dart';
import '../../../core/theme/app_theme.dart';

class TaskCard extends StatelessWidget {
  final TaskModel task;

  const TaskCard({super.key, required this.task});

  Color _priorityColor(String p) {
    switch (p) {
      case 'urgent':
        return AppTheme.errorColor;
      case 'high':
        return AppTheme.warningColor;
      case 'medium':
        return AppTheme.primaryColor;
      default:
        return AppTheme.successColor;
    }
  }

  IconData _priorityIcon(String p) {
    switch (p) {
      case 'urgent':
        return Icons.priority_high_rounded;
      case 'high':
        return Icons.keyboard_double_arrow_up_rounded;
      case 'medium':
        return Icons.remove_rounded;
      default:
        return Icons.keyboard_double_arrow_down_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final planner = context.read<PlannerProvider>();

    return Dismissible(
      key: Key(task.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: AppTheme.errorColor,
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Icon(
          Icons.delete_outline_rounded,
          color: Colors.white,
          size: 24,
        ),
      ),
      onDismissed: (_) => planner.deleteTask(task.id),
      child: GestureDetector(
        onTap: () => showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (_) => AddTaskSheet(existingTask: task),
        ),
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Checkbox
              GestureDetector(
                onTap: () => planner.toggleComplete(task.id),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.only(top: 2),
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    color: task.isCompleted
                        ? AppTheme.successColor
                        : Colors.transparent,
                    border: Border.all(
                      color: task.isCompleted
                          ? AppTheme.successColor
                          : theme.colorScheme.outline,
                      width: 2,
                    ),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: task.isCompleted
                      ? const Icon(
                          Icons.check_rounded,
                          color: Colors.white,
                          size: 14,
                        )
                      : null,
                ),
              ),
              const SizedBox(width: 12),
              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      task.title,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        decoration: task.isCompleted
                            ? TextDecoration.lineThrough
                            : null,
                        color: task.isCompleted
                            ? theme.colorScheme.onSurface.withValues(alpha: 0.4)
                            : null,
                      ),
                    ),
                    if (task.description != null &&
                        task.description!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        task.description!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface.withValues(
                            alpha: 0.5,
                          ),
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        // Priority badge
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: _priorityColor(
                              task.priority,
                            ).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                _priorityIcon(task.priority),
                                size: 12,
                                color: _priorityColor(task.priority),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                task.priority.toUpperCase(),
                                style: TextStyle(
                                  color: _priorityColor(task.priority),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (task.category != null) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.surfaceContainerHighest,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              task.category!,
                              style: theme.textTheme.labelSmall,
                            ),
                          ),
                        ],
                        if (task.dueDate != null) ...[
                          const Spacer(),
                          Icon(
                            Icons.schedule_outlined,
                            size: 12,
                            color: task.isOverdue
                                ? AppTheme.errorColor
                                : theme.colorScheme.onSurface.withValues(
                                    alpha: 0.4,
                                  ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            DateFormat('MMM d').format(task.dueDate!),
                            style: TextStyle(
                              fontSize: 12,
                              color: task.isOverdue
                                  ? AppTheme.errorColor
                                  : theme.colorScheme.onSurface.withValues(
                                      alpha: 0.4,
                                    ),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
