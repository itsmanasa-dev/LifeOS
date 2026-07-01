import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../attendance/providers/attendance_provider.dart';
import '../../../core/theme/app_theme.dart';

class SubjectDetailScreen extends StatelessWidget {
  final String subjectId;

  const SubjectDetailScreen({super.key, required this.subjectId});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final attendance = context.watch<AttendanceProvider>();

    final subjectIndex = attendance.subjects.indexWhere((s) => s.id == subjectId);
    if (subjectIndex < 0) {
      return Scaffold(
        appBar: AppBar(title: const Text('Subject Details')),
        body: const Center(child: Text('Subject not found')),
      );
    }

    final subject = attendance.subjects[subjectIndex];
    final color = Color(int.parse(subject.color.replaceFirst('#', '0xFF')));

    final subjectRecords = attendance.records
        .where((r) => r.subjectId == subjectId)
        .toList()
      ..sort((a, b) => b.date.compareTo(a.date));

    final absentCount = subject.totalCount - subject.attendedCount;

    return Scaffold(
      appBar: AppBar(
        title: Text(subject.name),
      ),
      body: Column(
        children: [
          Card(
            margin: const EdgeInsets.all(16),
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
                          color: color.withValues(alpha: 0.1),
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildStatColumn('Present', subject.attendedCount.toString(), Colors.green, theme),
                      _buildStatColumn('Absent', absentCount.toString(), Colors.red, theme),
                      _buildStatColumn('Total', subject.totalCount.toString(), AppTheme.primaryColor, theme),
                    ],
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Attendance History',
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                Text(
                  '${subjectRecords.length} sessions',
                  style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey),
                ),
              ],
            ),
          ),
          Expanded(
            child: subjectRecords.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text('📅', style: TextStyle(fontSize: 40)),
                        const SizedBox(height: 12),
                        Text(
                          'No classes logged yet',
                          style: theme.textTheme.titleSmall?.copyWith(color: Colors.grey),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Mark Present or Absent in the College Hub checklist.',
                          style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: subjectRecords.length,
                    itemBuilder: (context, index) {
                      final record = subjectRecords[index];
                      final isPresent = record.status == 'present';

                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
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
                          trailing: Container(
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
                    },
                  ),
          ),
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
}
