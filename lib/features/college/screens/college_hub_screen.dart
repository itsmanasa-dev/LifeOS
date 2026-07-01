import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:percent_indicator/percent_indicator.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../providers/college_provider.dart';
import '../models/timetable_model.dart';
import '../../attendance/providers/attendance_provider.dart';
import '../services/timetable_ocr_parser.dart';
import '../../../core/theme/app_theme.dart';

class CollegeHubScreen extends StatefulWidget {
  const CollegeHubScreen({super.key});

  @override
  State<CollegeHubScreen> createState() => _CollegeHubScreenState();
}

class _CollegeHubScreenState extends State<CollegeHubScreen> {
  bool _isExtracting = false;

  Future<void> _pickAndExtractTimetable() async {
    setState(() {
      _isExtracting = true;
    });

    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(source: ImageSource.gallery);
      
      if (image == null) {
        setState(() {
          _isExtracting = false;
        });
        return;
      }

      final inputImage = InputImage.fromFilePath(image.path);
      final textRecognizer = TextRecognizer(script: TextRecognitionScript.latin);
      final RecognizedText recognizedText = await textRecognizer.processImage(inputImage);
      final text = recognizedText.text;
      await textRecognizer.close();

      final entries = TimetableOcrParser.parse(text);
      if (entries.isEmpty) {
        throw Exception("No timetable classes matched regex filters.");
      }

      if (!mounted) return;

      final collegeProvider = context.read<CollegeProvider>();
      final attendanceProvider = context.read<AttendanceProvider>();

      // Save extracted entries to Timetable & sync Subjects list
      await collegeProvider.importTimetable(entries);
      await attendanceProvider.syncSubjectsFromTimetable(entries);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Successfully extracted ${entries.length} classes from timetable!'),
          backgroundColor: AppTheme.successColor,
        ),
      );
    } catch (e) {
      if (mounted) {
        _showOcrFallbackDialog(context);
      }
    } finally {
      if (mounted) {
        setState(() {
          _isExtracting = false;
        });
      }
    }
  }

  void _showOcrFallbackDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Timetable Parsing Failed'),
          content: const Text(
            'We could not extract structured class slots from this image automatically.\n\nWould you like to import the demo timetable (8 classes across Mon-Wed) instead?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                final collegeProvider = context.read<CollegeProvider>();
                final attendanceProvider = context.read<AttendanceProvider>();
                Navigator.pop(ctx);
                final demoEntries = TimetableOcrParser.getSeedTimetable();
                await collegeProvider.importTimetable(demoEntries);
                await attendanceProvider.syncSubjectsFromTimetable(demoEntries);
                if (ctx.mounted) {
                  ScaffoldMessenger.of(ctx).showSnackBar(
                    const SnackBar(
                      content: Text('Demo timetable imported successfully!'),
                      backgroundColor: AppTheme.successColor,
                    ),
                  );
                }
              },
              child: const Text('Import Demo'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final college = context.watch<CollegeProvider>();
    final attendance = context.watch<AttendanceProvider>();

    final todayClasses = college.todayEntries;
    final overallPct = attendance.overallPercentage;

    return Scaffold(
      appBar: AppBar(
        title: const Text('College Hub'),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await college.load();
          await attendance.load();
        },
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          children: [
            // Attendance Overview Top Card
            _buildAttendanceOverviewCard(attendance, overallPct, theme),
            const SizedBox(height: 20),

            // Subjects Overview List
            _buildSubjectsOverview(attendance, theme),
            const SizedBox(height: 20),

            // Timetable OCR Upload Widget
            _buildOcrUploadWidget(theme),
            const SizedBox(height: 20),

            // Today's Classes checklist
            _buildTodayClasses(todayClasses, attendance, theme),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildAttendanceOverviewCard(AttendanceProvider attendance, double overallPct, ThemeData theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            // Circular overall pct
            CircularPercentIndicator(
              radius: 44.0,
              lineWidth: 8.0,
              percent: overallPct / 100.0,
              center: Text(
                '${overallPct.toStringAsFixed(0)}%',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold, fontSize: 18),
              ),
              progressColor: overallPct >= 75.0 ? AppTheme.successColor : AppTheme.errorColor,
              backgroundColor: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
              circularStrokeCap: CircularStrokeCap.round,
            ),
            const SizedBox(width: 20),
            // Dynamic Grid info
            Expanded(
              child: GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                childAspectRatio: 2.2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 8,
                children: [
                  _buildMiniStat('Classes Attended', attendance.overallAttended.toString(), Colors.green),
                  _buildMiniStat('Classes Absent', attendance.overallAbsent.toString(), Colors.red),
                  _buildMiniStat('Total Classes', attendance.overallTotal.toString(), AppTheme.primaryColor),
                  _buildMiniStat('Lab Classes', attendance.overallLabCount.toString(), Colors.amber),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMiniStat(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(fontSize: 10, color: Colors.grey.shade500, fontWeight: FontWeight.w500),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }

  Widget _buildSubjectsOverview(AttendanceProvider attendance, ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Subjects Overview',
          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 10),
        if (attendance.subjects.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Text(
              'No subjects tracked. Upload a timetable to begin.',
              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey),
            ),
          )
        else
          ...attendance.subjects.map((sub) {
            final color = Color(int.parse(sub.color.replaceFirst('#', '0xFF')));
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                leading: CircleAvatar(
                  backgroundColor: color.withValues(alpha: 0.1),
                  child: Text(
                    sub.name.split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join().toUpperCase(),
                    style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
                title: Text(sub.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                subtitle: Text(
                  '${sub.attendedCount} Present • ${sub.totalCount - sub.attendedCount} Absent • ${sub.totalCount} Total',
                  style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey),
                ),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '${sub.percentage.toStringAsFixed(0)}%',
                      style: TextStyle(
                        color: sub.isBelowTarget ? AppTheme.errorColor : AppTheme.successColor,
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(Icons.chevron_right_rounded, color: Colors.grey.shade400),
                  ],
                ),
                onTap: () {
                  context.go('/college/subject/${sub.id}');
                },
              ),
            );
          }),
      ],
    );
  }

  Widget _buildOcrUploadWidget(ThemeData theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Text(
              'Upload Timetable',
              style: theme.textTheme.labelMedium?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 24),
              decoration: BoxDecoration(
                border: Border.all(color: theme.colorScheme.outlineVariant, style: BorderStyle.solid),
                borderRadius: BorderRadius.circular(14),
                color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.2),
              ),
              child: Column(
                children: [
                  const Icon(Icons.cloud_upload_outlined, size: 36, color: AppTheme.primaryColor),
                  const SizedBox(height: 8),
                  Text(
                    'Upload Timetable Image',
                    style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  Text(
                    "We'll extract your classes automatically",
                    style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey),
                  ),
                  const SizedBox(height: 16),
                  _isExtracting
                      ? const CircularProgressIndicator()
                      : FilledButton(
                          onPressed: _pickAndExtractTimetable,
                          style: FilledButton.styleFrom(
                            backgroundColor: AppTheme.primaryColor,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          ),
                          child: const Text('Upload Image'),
                        ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTodayClasses(List<TimetableEntry> classes, AttendanceProvider attendance, ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              "Today's Classes",
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            Text(
              DateFormat('EEE, d MMM').format(DateTime.now()),
              style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (classes.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Text(
              'No classes scheduled for today! 🎉',
              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey),
            ),
          )
        else
          ...classes.map((c) {
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    // Time Range
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(c.startTime, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        const SizedBox(height: 2),
                        Text(
                          c.endTime,
                          style: TextStyle(fontSize: 11, color: Colors.grey.shade500, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                    const SizedBox(width: 16),
                    // Vertical Separator color line
                    Container(
                      width: 3.5,
                      height: 36,
                      decoration: BoxDecoration(
                        color: Color(int.parse(c.subjectColor.replaceFirst('#', '0xFF'))),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Subject info
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(c.subjectName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: (c.type == 'Lab' ? Colors.orange : AppTheme.primaryColor).withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              c.type,
                              style: TextStyle(
                                fontSize: 9,
                                color: c.type == 'Lab' ? Colors.orange : AppTheme.primaryColor,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Action Buttons
                    Row(
                      children: [
                        OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Colors.green),
                            foregroundColor: Colors.green,
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            minimumSize: const Size(60, 32),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: () {
                            attendance.logAttendance(c.subjectName, true, DateTime.now(), c.type);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Logged PRESENT for ${c.subjectName}'),
                                duration: const Duration(seconds: 1),
                              ),
                            );
                          },
                          child: const Text('Present', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                        ),
                        const SizedBox(width: 6),
                        OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Colors.red),
                            foregroundColor: Colors.red,
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            minimumSize: const Size(60, 32),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: () {
                            attendance.logAttendance(c.subjectName, false, DateTime.now(), c.type);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Logged ABSENT for ${c.subjectName}'),
                                duration: const Duration(seconds: 1),
                              ),
                            );
                          },
                          child: const Text('Absent', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
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
}
