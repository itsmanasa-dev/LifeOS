import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/college_provider.dart';
import '../../attendance/providers/attendance_provider.dart';
import '../../planner/providers/planner_provider.dart';
import '../../planner/models/task_model.dart';
import '../models/timetable_model.dart';
import '../../../core/theme/app_theme.dart';

class CollegeHubScreen extends StatefulWidget {
  const CollegeHubScreen({super.key});

  @override
  State<CollegeHubScreen> createState() => _CollegeHubScreenState();
}

class _CollegeHubScreenState extends State<CollegeHubScreen> {
  int _selectedDay = DateTime.now().weekday;

  @override
  void initState() {
    super.initState();
    // Default to Monday if it's weekend
    if (_selectedDay > 5) {
      _selectedDay = 1;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final college = context.watch<CollegeProvider>();
    final attendance = context.watch<AttendanceProvider>();
    final planner = context.watch<PlannerProvider>();

    // Filter uncompleted tasks with category 'College'
    final collegeTasks = planner.tasks
        .where((t) => !t.isCompleted && (t.category?.toLowerCase() == 'college' || t.category?.toLowerCase() == 'study'))
        .toList();

    final classesForDay = college.getEntriesForDay(_selectedDay);

    return Scaffold(
      appBar: AppBar(
        title: const Text('College Hub'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            onPressed: () => _showAddClassSheet(context),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await college.load();
          await attendance.load();
          await planner.loadTasks();
        },
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          children: [
            // GPA Card
            _buildGpaCard(context, college, theme),
            const SizedBox(height: 20),

            // Today's Focus
            _buildTodayFocus(context, collegeTasks, planner, theme),
            const SizedBox(height: 20),

            // Weekly Timetable
            _buildWeeklyTimetable(context, classesForDay, theme),
            const SizedBox(height: 20),

            // Course Attendance
            _buildCourseAttendance(context, attendance, theme),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildGpaCard(BuildContext context, CollegeProvider college, ThemeData theme) {
    final percent = (college.currentCgpa / 4.0).clamp(0.0, 1.0);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'ACADEMIC STANDING',
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                  ),
                ),
                GestureDetector(
                  onTap: () => _showEditGpaDialog(context, college),
                  child: Text(
                    'Update Target',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppTheme.primaryColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  college.currentCgpa.toStringAsFixed(2),
                  style: theme.textTheme.displayMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  ' / 4.00 CGPA',
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.successColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Target: ${college.targetCgpa.toStringAsFixed(2)}',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: AppTheme.successColor,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            LinearProgressIndicator(
              value: percent,
              backgroundColor: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
              color: AppTheme.primaryColor,
              borderRadius: BorderRadius.circular(4),
              minHeight: 8,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTodayFocus(BuildContext context, List<TaskModel> tasks, PlannerProvider planner, ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Today's Focus",
          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 10),
        if (tasks.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Text(
              'No pending deadlines!',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
              ),
            ),
          )
        else
          ...tasks.map((task) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                  leading: Checkbox(
                    value: task.isCompleted,
                    activeColor: AppTheme.primaryColor,
                    onChanged: (_) {
                      planner.toggleComplete(task.id);
                    },
                  ),
                  title: Text(
                    task.title,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  subtitle: task.dueDate != null
                      ? Text(
                          'Deadline: ${DateFormat('MMM d, hh:mm a').format(task.dueDate!)}',
                          style: TextStyle(
                            fontSize: 11,
                            color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                          ),
                        )
                      : null,
                ),
              )),
      ],
    );
  }

  Widget _buildWeeklyTimetable(BuildContext context, List<TimetableEntry> classes, ThemeData theme) {
    final days = [
      (1, 'Mon'),
      (2, 'Tue'),
      (3, 'Wed'),
      (4, 'Thu'),
      (5, 'Fri'),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Weekly Timetable',
          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: days.map((day) {
            final isSelected = _selectedDay == day.$1;
            return Expanded(
              child: GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedDay = day.$1;
                  });
                },
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: isSelected ? AppTheme.primaryColor : theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    day.$2,
                    style: TextStyle(
                      color: isSelected ? Colors.white : theme.colorScheme.onSurface.withValues(alpha: 0.7),
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
        if (classes.isEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Text(
              'No classes scheduled for this day.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
              ),
            ),
          )
        else
          ...classes.map((c) {
            final color = Color(int.parse(c.subjectColor.replaceFirst('#', '0xFF')));
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    Container(
                      width: 4,
                      height: 36,
                      decoration: BoxDecoration(
                        color: color,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            c.subjectName,
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${c.startTime} - ${c.endTime} | Room: ${c.room ?? "TBD"}',
                            style: TextStyle(
                              color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildCourseAttendance(BuildContext context, AttendanceProvider attendance, ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Course Attendance',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            Text(
              'Target: 75%',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        ...attendance.subjects.map((sub) {
          final color = Color(int.parse(sub.color.replaceFirst('#', '0xFF')));
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        sub.name,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                      ),
                      Text(
                        '${sub.attendedCount}/${sub.totalCount} classes',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: LinearProgressIndicator(
                          value: sub.totalCount > 0 ? (sub.attendedCount / sub.totalCount) : 1.0,
                          backgroundColor: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
                          color: color,
                          minHeight: 6,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        '${sub.percentage.toStringAsFixed(0)}%',
                        style: TextStyle(
                          color: sub.isBelowTarget ? AppTheme.errorColor : AppTheme.successColor,
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton.icon(
                        icon: const Icon(Icons.check_circle_outline_rounded, size: 16),
                        label: const Text('Present'),
                        style: TextButton.styleFrom(
                          foregroundColor: AppTheme.successColor,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          minimumSize: const Size(60, 32),
                        ),
                        onPressed: () {
                          attendance.logAttendance(sub.id, true);
                        },
                      ),
                      const SizedBox(width: 8),
                      TextButton.icon(
                        icon: const Icon(Icons.cancel_outlined, size: 16),
                        label: const Text('Absent'),
                        style: TextButton.styleFrom(
                          foregroundColor: AppTheme.errorColor,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          minimumSize: const Size(60, 32),
                        ),
                        onPressed: () {
                          attendance.logAttendance(sub.id, false);
                        },
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

  void _showEditGpaDialog(BuildContext context, CollegeProvider college) {
    final currentController = TextEditingController(text: college.currentCgpa.toString());
    final targetController = TextEditingController(text: college.targetCgpa.toString());

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Edit CGPA Target'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: currentController,
                decoration: const InputDecoration(labelText: 'Current CGPA'),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: targetController,
                decoration: const InputDecoration(labelText: 'Target CGPA'),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                final current = double.tryParse(currentController.text) ?? college.currentCgpa;
                final target = double.tryParse(targetController.text) ?? college.targetCgpa;
                college.updateCgpa(current, target);
                Navigator.pop(context);
              },
              child: const Text('Save'),
            ),
          ],
        );
      },
    );
  }

  void _showAddClassSheet(BuildContext context) {
    final nameController = TextEditingController();
    final roomController = TextEditingController();
    final startController = TextEditingController(text: '09:00');
    final endController = TextEditingController(text: '10:30');
    int classDay = 1;
    String classColor = '#6366F1';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final theme = Theme.of(ctx);
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              decoration: BoxDecoration(
                color: theme.scaffoldBackgroundColor,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              ),
              padding: EdgeInsets.fromLTRB(16, 20, 16, MediaQuery.of(context).viewInsets.bottom + 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Add Timetable Entry',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(labelText: 'Subject Name'),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: startController,
                          decoration: const InputDecoration(labelText: 'Start Time (HH:MM)'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: endController,
                          decoration: const InputDecoration(labelText: 'End Time (HH:MM)'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: roomController,
                    decoration: const InputDecoration(labelText: 'Room'),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<int>(
                    initialValue: classDay,
                    decoration: const InputDecoration(labelText: 'Day of Week'),
                    items: const [
                      DropdownMenuItem(value: 1, child: Text('Monday')),
                      DropdownMenuItem(value: 2, child: Text('Tuesday')),
                      DropdownMenuItem(value: 3, child: Text('Wednesday')),
                      DropdownMenuItem(value: 4, child: Text('Thursday')),
                      DropdownMenuItem(value: 5, child: Text('Friday')),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setModalState(() {
                          classDay = val;
                        });
                      }
                    },
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      '#6366F1',
                      '#8B5CF6',
                      '#10B981',
                      '#06B6D4',
                      '#F59E0B',
                    ].map((colorHex) {
                      final parsed = Color(int.parse(colorHex.replaceFirst('#', '0xFF')));
                      final isSelected = classColor == colorHex;
                      return GestureDetector(
                        onTap: () {
                          setModalState(() {
                            classColor = colorHex;
                          });
                        },
                        child: CircleAvatar(
                          backgroundColor: parsed,
                          radius: 16,
                          child: isSelected ? const Icon(Icons.check, color: Colors.white, size: 16) : null,
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: () {
                      if (nameController.text.isNotEmpty) {
                        final entry = TimetableEntry(
                          id: 'class-${DateTime.now().millisecondsSinceEpoch}',
                          subjectName: nameController.text,
                          subjectColor: classColor,
                          startTime: startController.text,
                          endTime: endController.text,
                          room: roomController.text.isEmpty ? null : roomController.text,
                          dayOfWeek: classDay,
                        );
                        context.read<CollegeProvider>().upsertEntry(entry);
                        Navigator.pop(ctx);
                      }
                    },
                    child: const Text('Add Entry'),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
