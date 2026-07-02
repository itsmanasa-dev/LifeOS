import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:percent_indicator/percent_indicator.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../providers/focus_provider.dart';
import '../../../core/theme/app_theme.dart';

class StudyTrackerScreen extends StatelessWidget {
  const StudyTrackerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final focus = context.watch<FocusProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Deep Work: Study Mode'),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded),
            onPressed: () => _showInfoDialog(context, theme),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: [
          // Streak card
          _buildStreakCard(context, focus, theme),
          const SizedBox(height: 20),

          // Focus timer card
          _buildTimerCard(context, focus, theme),
          const SizedBox(height: 20),

          // Govt Exam Prep Section
          _buildSyllabusSection(context, focus, theme),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildStreakCard(BuildContext context, FocusProvider focus, ThemeData theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.local_fire_department_rounded,
                color: Color(0xFFF59E0B),
                size: 30,
              )
                  .animate(onPlay: (controller) => controller.repeat(reverse: true))
                  .scale(end: const Offset(1.15, 1.15), duration: 800.ms, curve: Curves.easeInOut),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Daily Streak',
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${focus.streak} Days',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.emoji_events_rounded, color: Color(0xFFF59E0B), size: 16),
                  const SizedBox(width: 4),
                  Text(
                    'Level 3',
                    style: theme.textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimerCard(BuildContext context, FocusProvider focus, ThemeData theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Text(
              'FOCUS SESSION ACTIVE',
              style: theme.textTheme.labelMedium?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 20),
            CircularPercentIndicator(
              radius: 96.0,
              lineWidth: 12.0,
              percent: focus.progressFraction,
              center: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    focus.timerString,
                    style: theme.textTheme.displayMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                  Text(
                    'remaining',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
                    ),
                  ),
                ],
              ),
              circularStrokeCap: CircularStrokeCap.round,
              progressColor: AppTheme.primaryColor,
              backgroundColor: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
              animation: false,
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [25, 45, 60].map((mins) {
                final isSelected = focus.targetDurationMinutes == mins;
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  child: ChoiceChip(
                    label: Text('${mins}m'),
                    selected: isSelected,
                    onSelected: focus.isRunning ? null : (_) {
                      focus.setDuration(mins);
                    },
                    selectedColor: AppTheme.primaryColor.withValues(alpha: 0.2),
                    checkmarkColor: AppTheme.primaryColor,
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton.filledTonal(
                  icon: const Icon(Icons.replay_rounded),
                  iconSize: 24,
                  onPressed: focus.resetTimer,
                ),
                const SizedBox(width: 20),
                IconButton.filled(
                  icon: Icon(focus.isRunning ? Icons.pause_rounded : Icons.play_arrow_rounded),
                  iconSize: 40,
                  style: IconButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: focus.isRunning ? focus.pauseTimer : focus.startTimer,
                ),
                const SizedBox(width: 20),
                IconButton.filledTonal(
                  icon: const Icon(Icons.skip_next_rounded),
                  iconSize: 24,
                  onPressed: focus.isRunning ? () {
                    focus.resetTimer();
                  } : null,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSyllabusSection(BuildContext context, FocusProvider focus, ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Govt Exam Prep',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            Text(
              'View Syllabus',
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppTheme.primaryColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ...focus.syllabus.map((item) {
          final color = Color(int.parse(item.colorHex.replaceFirst('#', '0xFF')));
          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        item.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        '${(item.progress * 100).toStringAsFixed(0)}% Complete',
                        style: theme.textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: color,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: LinearProgressIndicator(
                          value: item.progress,
                          backgroundColor: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
                          color: color,
                          minHeight: 6,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.remove_rounded),
                            style: IconButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: const Size(28, 28),
                            ),
                            onPressed: () {
                              focus.updateSyllabusProgress(item.name, item.progress - 0.05);
                            },
                          ),
                          IconButton(
                            icon: const Icon(Icons.add_rounded),
                            style: IconButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: const Size(28, 28),
                            ),
                            onPressed: () {
                              focus.updateSyllabusProgress(item.name, item.progress + 0.05);
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  void _showInfoDialog(BuildContext context, ThemeData theme) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Study Mode Instructions'),
          content: const Text(
            'Use the focus timer to track your deep work sessions. Completing a focus session will increment your daily streak. Adjust progress on each syllabus subject to stay on top of your government exam preparation goals.',
          ),
          actions: [
            FilledButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Got it'),
            ),
          ],
        );
      },
    );
  }
}
