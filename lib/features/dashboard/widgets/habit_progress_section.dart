import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../habits/models/habit_model.dart';
import '../../../core/theme/app_theme.dart';

class HabitProgressSection extends StatelessWidget {
  final List<HabitModel> habits;
  final Map<String, HabitLog> logs;

  const HabitProgressSection({
    super.key,
    required this.habits,
    required this.logs,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final activeHabits = habits.where((h) => h.isActive).take(4).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Habit Tracker',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            GestureDetector(
              onTap: () => context.go('/habits'),
              child: Text(
                'View all',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppTheme.primaryColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (activeHabits.isEmpty)
          _EmptyHabits()
        else
          Row(
            children: activeHabits.map((h) {
              final log = logs[h.id];
              final isCompleted = log?.isCompleted ?? false;
              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(
                    right: h != activeHabits.last ? 10 : 0,
                  ),
                  child: _HabitChip(habit: h, isCompleted: isCompleted),
                ),
              );
            }).toList(),
          ),
      ],
    );
  }
}

class _HabitChip extends StatelessWidget {
  final HabitModel habit;
  final bool isCompleted;

  const _HabitChip({required this.habit, required this.isCompleted});

  Color _parseColor(String hex) {
    try {
      return Color(int.parse(hex.replaceFirst('#', '0xFF')));
    } catch (_) {
      return AppTheme.primaryColor;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final color = _parseColor(habit.color);

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: isCompleted
            ? color.withValues(alpha: 0.15)
            : (isDark ? const Color(0xFF1E293B) : Colors.white),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isCompleted
              ? color.withValues(alpha: 0.4)
              : theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
      child: Column(
        children: [
          Text(habit.icon, style: const TextStyle(fontSize: 22)),
          const SizedBox(height: 6),
          Text(
            habit.name.split(' ').first,
            style: theme.textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: isCompleted ? color : null,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Icon(
            isCompleted
                ? Icons.check_circle_rounded
                : Icons.radio_button_unchecked_rounded,
            color: isCompleted
                ? color
                : theme.colorScheme.onSurface.withValues(alpha: 0.25),
            size: 16,
          ),
        ],
      ),
    );
  }
}

class _EmptyHabits extends StatelessWidget {
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
      child: Text(
        'Set up habits to track daily progress',
        style: theme.textTheme.bodyMedium,
        textAlign: TextAlign.center,
      ),
    );
  }
}
