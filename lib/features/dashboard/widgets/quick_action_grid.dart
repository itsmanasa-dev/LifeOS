import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class QuickActionGrid extends StatelessWidget {
  const QuickActionGrid({super.key});

  static const _actions = [
    _QuickAction(
      'Attendance',
      Icons.how_to_reg_outlined,
      Color(0xFF6366F1),
      '/attendance',
    ),
    _QuickAction(
      'Timetable',
      Icons.schedule_outlined,
      Color(0xFF06B6D4),
      '/college',
    ),
    _QuickAction(
      'Add Task',
      Icons.add_circle_outline_rounded,
      Color(0xFF10B981),
      '/planner',
    ),
    _QuickAction(
      'Study',
      Icons.menu_book_outlined,
      Color(0xFF8B5CF6),
      '/govexam',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Row(
      children: _actions.map((action) {
        return Expanded(
          child: GestureDetector(
            onTap: () => context.go(action.route),
            child: _QuickActionCard(action: action),
          ),
        );
      }).toList(),
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  final _QuickAction action;
  const _QuickActionCard({required this.action});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      margin: EdgeInsets.only(right: action.label != 'Study' ? 8 : 0),
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: action.color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(action.icon, color: action.color, size: 20),
          ),
          const SizedBox(height: 8),
          Text(
            action.label,
            style: theme.textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _QuickAction {
  final String label;
  final IconData icon;
  final Color color;
  final String route;
  const _QuickAction(this.label, this.icon, this.color, this.route);
}
