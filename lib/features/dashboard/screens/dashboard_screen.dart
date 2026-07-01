import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../widgets/greeting_card.dart';
import '../widgets/stat_card.dart';
import '../widgets/quick_action_grid.dart';
import '../widgets/today_tasks_section.dart';
import '../widgets/habit_progress_section.dart';
import '../widgets/today_schedule_section.dart';
import '../../auth/providers/auth_provider.dart';
import '../../planner/providers/planner_provider.dart';
import '../../habits/providers/habit_provider.dart';
import '../../college/providers/college_provider.dart';
import '../../attendance/providers/attendance_provider.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _refresh());
  }

  Future<void> _refresh() async {
    await Future.wait([
      context.read<PlannerProvider>().loadTasks(),
      context.read<HabitProvider>().loadHabits(),
      context.read<CollegeProvider>().load(),
      context.read<AttendanceProvider>().load(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final user = context.watch<AuthProvider>().user;
    final planner = context.watch<PlannerProvider>();
    final habits = context.watch<HabitProvider>();
    final attendance = context.watch<AttendanceProvider>();
    final college = context.watch<CollegeProvider>();

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // App Bar
            SliverAppBar(
              floating: true,
              snap: true,
              title: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    DateFormat('EEEE, MMM d').format(DateTime.now()),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                    ),
                  ),
                  Text(
                    'LifeOS',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.settings_outlined),
                  onPressed: () => context.push('/settings'),
                ),
                const SizedBox(width: 8),
              ],
            ),

            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // Greeting card
                  GreetingCard(user: user),
                  const SizedBox(height: 20),

                  // Stats row
                  Row(
                    children: [
                      Expanded(
                        child: StatCard(
                          label: 'Tasks Today',
                          value: planner.todayTasks.length.toString(),
                          icon: Icons.check_circle_outline_rounded,
                          color: const Color(0xFF6366F1),
                          subtitle: '${planner.completedTasks.length} done',
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: StatCard(
                          label: 'Attendance',
                          value:
                              '${attendance.overallPercentage.toStringAsFixed(0)}%',
                          icon: Icons.how_to_reg_outlined,
                          color: attendance.overallPercentage >= 75
                              ? const Color(0xFF10B981)
                              : const Color(0xFFEF4444),
                          subtitle: attendance.overallPercentage >= 75
                              ? 'On track'
                              : 'At risk',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: StatCard(
                          label: 'Habits',
                          value:
                              '${habits.todayCompleted}/${habits.totalActiveHabits}',
                          icon: Icons.local_fire_department_outlined,
                          color: const Color(0xFFF59E0B),
                          subtitle:
                              '${(habits.todayProgress * 100).toStringAsFixed(0)}% done',
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: StatCard(
                          label: 'Classes Today',
                          value: college.todayEntries.length.toString(),
                          icon: Icons.school_outlined,
                          color: const Color(0xFF06B6D4),
                          subtitle: college.todayEntries.isEmpty
                              ? 'Free day!'
                              : 'Scheduled',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Quick actions
                  Text(
                    'Quick Actions',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 12),
                  const QuickActionGrid(),
                  const SizedBox(height: 24),

                  // Today's schedule
                  TodayScheduleSection(entries: college.todayEntries),
                  const SizedBox(height: 24),

                  // Today's tasks
                  TodayTasksSection(tasks: planner.todayTasks),
                  const SizedBox(height: 24),

                  // Habit progress
                  HabitProgressSection(
                    habits: habits.habits,
                    logs: habits.todayLogs,
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
