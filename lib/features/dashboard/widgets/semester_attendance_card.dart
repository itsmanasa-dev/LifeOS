import 'package:flutter/material.dart';
import 'package:percent_indicator/percent_indicator.dart';
import '../../../core/theme/app_theme.dart';

class SemesterAttendanceCard extends StatelessWidget {
  final double percentage;

  const SemesterAttendanceCard({super.key, required this.percentage});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isBelowTarget = percentage < 75.0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'SEMESTER ATTENDANCE',
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                  ),
                ),
                Icon(
                  isBelowTarget
                      ? Icons.warning_amber_rounded
                      : Icons.check_circle_outline_rounded,
                  color: isBelowTarget ? AppTheme.errorColor : AppTheme.successColor,
                  size: 18,
                ),
              ],
            ),
            const SizedBox(height: 16),
            CircularPercentIndicator(
              radius: 54.0,
              lineWidth: 10.0,
              percent: percentage / 100.0,
              center: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '${percentage.toStringAsFixed(0)}%',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                      fontSize: 22,
                    ),
                  ),
                  Text(
                    'Attendance',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              circularStrokeCap: CircularStrokeCap.round,
              progressColor: isBelowTarget ? AppTheme.errorColor : AppTheme.successColor,
              backgroundColor: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
              animation: true,
              animationDuration: 1000,
            ),
            const SizedBox(height: 12),
            Text(
              isBelowTarget
                  ? 'Attendance is below your 75% target. Attendance is critical!'
                  : 'On track! Keep attending classes to maintain your target.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                height: 1.3,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
