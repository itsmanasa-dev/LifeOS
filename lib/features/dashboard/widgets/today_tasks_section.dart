import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../planner/models/task_model.dart';
import '../../planner/providers/planner_provider.dart';
import '../../../core/theme/app_theme.dart';

class TodayTasksSection extends StatelessWidget {
  final List<TaskModel> tasks;

  const TodayTasksSection({super.key, required this.tasks});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              "Today's Tasks",
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            GestureDetector(
              onTap: () => context.go('/planner'),
              child: Text(
                'See all',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppTheme.primaryColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (tasks.isEmpty)
          _EmptyTasks()
        else
          ...tasks.take(4).map((t) => _TaskItem(task: t)),
        if (tasks.length > 4)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              '+${tasks.length - 4} more tasks',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
              ),
            ),
          ),
      ],
    );
  }
}

class _TaskItem extends StatelessWidget {
  final TaskModel task;

  const _TaskItem({required this.task});

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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        leading: GestureDetector(
          onTap: () => context.read<PlannerProvider>().toggleComplete(task.id),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 24,
            height: 24,
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
                ? const Icon(Icons.check_rounded, color: Colors.white, size: 14)
                : null,
          ),
        ),
        title: Text(
          task.title,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w500,
            decoration: task.isCompleted ? TextDecoration.lineThrough : null,
            color: task.isCompleted
                ? theme.colorScheme.onSurface.withValues(alpha: 0.4)
                : null,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: _priorityColor(task.priority).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            task.priority,
            style: TextStyle(
              color: _priorityColor(task.priority),
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptyTasks extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(20),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: [
          const Text('✅', style: TextStyle(fontSize: 28)),
          const SizedBox(height: 8),
          Text(
            'All caught up!',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          Text('No tasks for today', style: theme.textTheme.bodySmall),
        ],
      ),
    );
  }
}
