import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../../attendance/providers/attendance_provider.dart';
import '../models/attendance_model.dart';
import '../../../core/theme/app_theme.dart';

class SubjectDetailScreen extends StatefulWidget {
  final String subjectId;

  const SubjectDetailScreen({super.key, required this.subjectId});

  @override
  State<SubjectDetailScreen> createState() => _SubjectDetailScreenState();
}

class _SubjectDetailScreenState extends State<SubjectDetailScreen> {
  DateTime _focusedMonth = DateTime.now();
  DateTime _selectedDay = DateTime.now();
  bool _showCalendar = false;

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final attendance = context.watch<AttendanceProvider>();

    final subjectIndex = attendance.subjects.indexWhere((s) => s.id == widget.subjectId);
    if (subjectIndex < 0) {
      return Scaffold(
        appBar: AppBar(title: const Text('Subject Details')),
        body: const Center(child: Text('Subject not found')),
      );
    }

    final subject = attendance.subjects[subjectIndex];

    // Filter records for this subject
    final subjectRecords = attendance.records
        .where((r) => r.subjectId == widget.subjectId)
        .toList()
      ..sort((a, b) => b.date.compareTo(a.date));

    final absentCount = subject.totalCount - subject.attendedCount;
    final theoryCount = subjectRecords.where((r) => r.type == 'Lecture').length;
    final labCount = subjectRecords.where((r) => r.type == 'Lab').length;

    return Scaffold(
      appBar: AppBar(
        title: Text(subject.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded),
            onPressed: () => _confirmDeleteSubject(context, attendance, subject.id),
            tooltip: 'Delete Subject',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // Circular progress card
          Card(
            elevation: 0,
            color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.15),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
              side: BorderSide(color: theme.colorScheme.outlineVariant.withValues(alpha: 0.2)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${subject.percentage.toStringAsFixed(0)}%',
                            style: theme.textTheme.displayMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: subject.isBelowTarget ? AppTheme.errorColor : AppTheme.successColor,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Attendance percentage',
                            style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: (subject.isBelowTarget ? AppTheme.errorColor : AppTheme.successColor).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          subject.isBelowTarget ? 'Below Target' : 'On Track',
                          style: TextStyle(
                            color: subject.isBelowTarget ? AppTheme.errorColor : AppTheme.successColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 32),
                  // Detailed grid counters
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildStatColumn('Present', subject.attendedCount.toString(), Colors.green, theme),
                      _buildStatColumn('Absent', absentCount.toString(), Colors.red, theme),
                      _buildStatColumn('Total', subject.totalCount.toString(), AppTheme.primaryColor, theme),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildStatColumn('Theory', theoryCount.toString(), Colors.cyan, theme),
                      _buildStatColumn('Labs', labCount.toString(), Colors.amber, theme),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // View Toggler (Overview Tab vs Calendar Tab)
          Row(
            children: [
              Expanded(
                child: ChoiceChip(
                  label: const Center(child: Text('Overview History')),
                  selected: !_showCalendar,
                  onSelected: (val) {
                    if (val) setState(() => _showCalendar = false);
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ChoiceChip(
                  label: const Center(child: Text('Monthly Calendar')),
                  selected: _showCalendar,
                  onSelected: (val) {
                    if (val) setState(() => _showCalendar = true);
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Display Selected Mode
          if (!_showCalendar)
            _buildOverviewHistory(subjectRecords, theme)
          else
            _buildCalendarView(subjectRecords, theme),
        ],
      ),
    );
  }

  Widget _buildStatColumn(String label, String value, Color color, ThemeData theme) {
    return Column(
      children: [
        Text(
          value,
          style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800, color: color),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(color: Colors.grey, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  Widget _buildOverviewHistory(List<AttendanceRecord> records, ThemeData theme) {
    if (records.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 40.0),
          child: Column(
            children: [
              const Text('📅', style: TextStyle(fontSize: 40)),
              const SizedBox(height: 12),
              Text(
                'No class records logged yet.',
                style: theme.textTheme.titleSmall?.copyWith(color: Colors.grey),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 12.0),
          child: Text(
            'All Class Sessions',
            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
        ),
        ...records.map((r) => _buildRecordTile(r, context)),
      ],
    );
  }

  Widget _buildCalendarView(List<AttendanceRecord> subjectRecords, ThemeData theme) {
    final daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    final year = _focusedMonth.year;
    final month = _focusedMonth.month;
    
    final daysInMonth = DateTime(year, month + 1, 0).day;
    final firstWeekday = DateTime(year, month, 1).weekday; // 1 = Mon, 7 = Sun

    final monthName = DateFormat('MMMM yyyy').format(_focusedMonth);
    final selectedDayRecords = subjectRecords.where((r) => _isSameDay(r.date, _selectedDay)).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            IconButton(
              icon: const Icon(Icons.chevron_left_rounded),
              onPressed: () {
                setState(() {
                  _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month - 1);
                });
              },
            ),
            Text(
              monthName,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            IconButton(
              icon: const Icon(Icons.chevron_right_rounded),
              onPressed: () {
                setState(() {
                  _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1);
                });
              },
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: daysOfWeek.map((day) {
            return Expanded(
              child: Center(
                child: Text(
                  day,
                  style: TextStyle(
                    color: Colors.grey.shade400,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 8),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 7,
            mainAxisSpacing: 6,
            crossAxisSpacing: 6,
            childAspectRatio: 1,
          ),
          itemCount: daysInMonth + firstWeekday - 1,
          itemBuilder: (context, index) {
            if (index < firstWeekday - 1) {
              return const SizedBox.shrink();
            }
            final day = index - firstWeekday + 2;
            final date = DateTime(year, month, day);
            final isSelected = _isSameDay(date, _selectedDay);
            
            final dayRecords = subjectRecords.where((r) => _isSameDay(r.date, date)).toList();
            final hasRecords = dayRecords.isNotEmpty;
            final allPresent = hasRecords && dayRecords.every((r) => r.status == 'present');

            Color? bgColor;
            Color textColor = theme.colorScheme.onSurface;
            if (hasRecords) {
              bgColor = allPresent ? Colors.blue.withValues(alpha: 0.25) : Colors.red.withValues(alpha: 0.25);
              textColor = allPresent ? Colors.blue : Colors.redAccent;
            }

            return GestureDetector(
              onTap: () {
                setState(() {
                  _selectedDay = date;
                });
              },
              child: Container(
                decoration: BoxDecoration(
                  color: bgColor,
                  shape: BoxShape.circle,
                  border: isSelected ? Border.all(color: AppTheme.primaryColor, width: 2) : null,
                ),
                alignment: Alignment.center,
                child: Text(
                  day.toString(),
                  style: TextStyle(
                    fontWeight: isSelected || hasRecords ? FontWeight.bold : FontWeight.normal,
                    color: textColor,
                    fontSize: 13,
                  ),
                ),
              ),
            );
          },
        ),
        const Divider(height: 32),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                DateFormat('dd MMM yyyy').format(_selectedDay),
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              Text(
                '${selectedDayRecords.length} classes logged',
                style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        if (selectedDayRecords.isEmpty)
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text(
              'No class history logged for this date.',
              style: TextStyle(color: Colors.grey.shade500),
            ),
          )
        else
          ...selectedDayRecords.map((r) => _buildRecordTile(r, context)),
      ],
    );
  }

  Widget _buildRecordTile(AttendanceRecord record, BuildContext context) {
    final isPresent = record.status == 'present';
    final theme = Theme.of(context);
    final attendance = context.read<AttendanceProvider>();

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: theme.colorScheme.outlineVariant.withValues(alpha: 0.1)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        title: Text(
          DateFormat('EEEE, MMM d, y').format(record.date),
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
        subtitle: Row(
          children: [
            Text(
              DateFormat('hh:mm a').format(record.date),
              style: const TextStyle(color: Colors.grey, fontSize: 11),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: (record.type == 'Lab' ? Colors.orange : AppTheme.primaryColor).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                record.type,
                style: TextStyle(
                  fontSize: 8,
                  color: record.type == 'Lab' ? Colors.orange : AppTheme.primaryColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: (isPresent ? Colors.green : Colors.red).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                isPresent ? 'Present' : 'Absent',
                style: TextStyle(
                  color: isPresent ? Colors.green : Colors.red,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              icon: const Icon(Icons.delete_outline_rounded, size: 20),
              onPressed: () => attendance.deleteRecord(record.id),
              tooltip: 'Delete log',
            ),
          ],
        ),
        onTap: () {
          attendance.toggleRecordStatus(record.id);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Attendance status updated!'),
              duration: Duration(seconds: 1),
            ),
          );
        },
      ),
    );
  }

  void _confirmDeleteSubject(BuildContext context, AttendanceProvider provider, String subjectId) {
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Delete Subject?'),
          content: const Text(
            'This will permanently delete this subject and all its attendance log history.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                provider.deleteSubject(subjectId);
                Navigator.pop(ctx);
                context.go('/college');
              },
              style: FilledButton.styleFrom(backgroundColor: AppTheme.errorColor),
              child: const Text('Delete'),
            ),
          ],
        );
      },
    );
  }
}
