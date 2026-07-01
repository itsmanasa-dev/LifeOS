import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:percent_indicator/percent_indicator.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../providers/college_provider.dart';
import '../models/timetable_model.dart';
import '../../attendance/providers/attendance_provider.dart';
import '../services/gemini_service.dart';
import '../services/image_processor.dart';
import '../../../core/theme/app_theme.dart';

class CollegeHubScreen extends StatefulWidget {
  const CollegeHubScreen({super.key});

  @override
  State<CollegeHubScreen> createState() => _CollegeHubScreenState();
}

class _CollegeHubScreenState extends State<CollegeHubScreen> {
  bool _isExtracting = false;

  Future<void> _pickAndExtractTimetable() async {
    final apiKey = GeminiService.getApiKey();
    if (apiKey.isEmpty) {
      final configured = await _showApiKeyDialog(context);
      if (!configured) return;
    }

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

      // 1. Preprocess the image (Grayscale, Contrast boost, Gaussian Denoise, Crop margins)
      final processedFile = await ImageProcessor.preprocessImage(image);

      // 2. Perform AI Vision Layout Understanding & JSON Extraction
      final entries = await GeminiService.extractTimetable(processedFile);
      
      if (!mounted) return;

      if (entries.isEmpty) {
        throw Exception("Gemini Vision extracted 0 class schedules.");
      }

      // Pushes parsed entries straight to Preview editor screen
      context.go('/college/import-preview', extra: entries);
    } catch (e) {
      if (mounted) {
        _showOcrErrorDialog(context, e.toString());
      }
    } finally {
      if (mounted) {
        setState(() {
          _isExtracting = false;
        });
      }
    }
  }

  Future<bool> _showApiKeyDialog(BuildContext context) async {
    final controller = TextEditingController(text: GeminiService.getApiKey());
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Configure Gemini API Key'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'To understand your timetable layout, this app uses Google Gemini AI.\n\nPlease enter your Gemini API Key:',
                  style: TextStyle(fontSize: 12),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: controller,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    hintText: 'AIzaSy...',
                    labelText: 'Gemini API Key',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                final key = controller.text.trim();
                if (key.isNotEmpty) {
                  await GeminiService.saveApiKey(key);
                  if (ctx.mounted) {
                    Navigator.pop(ctx, true);
                  }
                }
              },
              child: const Text('Save Key'),
            ),
          ],
        );
      },
    );
    return result ?? false;
  }

  void _showOcrErrorDialog(BuildContext context, String errorMessage) {
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('AI Vision Extraction Failed'),
          content: Text(
            'Google Gemini could not extract your timetable slots.\n\nError details:\n$errorMessage\n\nWould you like to reconfigure your API key or input the classes manually?',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                _showApiKeyDialog(context);
              },
              child: const Text('Reconfigure API Key'),
            ),
            FilledButton(
              onPressed: () {
                Navigator.pop(ctx);
                context.go('/college/import-preview', extra: <TimetableEntry>[]);
              },
              child: const Text('Edit Manually'),
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

            // Timetable Upload trigger
            _buildOcrUploadWidget(theme),
            const SizedBox(height: 20),

            // Today's Classes chronological list
            _buildTodayClasses(todayClasses, attendance, theme),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildAttendanceOverviewCard(AttendanceProvider attendance, double overallPct, ThemeData theme) {
    return Card(
      elevation: 0,
      color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.15),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: BorderSide(color: theme.colorScheme.outlineVariant.withValues(alpha: 0.2)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Row(
          children: [
            CircularPercentIndicator(
              radius: 50.0,
              lineWidth: 10.0,
              percent: overallPct / 100.0,
              center: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '${overallPct.toStringAsFixed(0)}%',
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: overallPct >= 75.0 ? AppTheme.successColor : AppTheme.errorColor,
                    ),
                  ),
                  const Text('Overall', style: TextStyle(fontSize: 10, color: Colors.grey)),
                ],
              ),
              progressColor: overallPct >= 75.0 ? AppTheme.successColor : AppTheme.errorColor,
              backgroundColor: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
              circularStrokeCap: CircularStrokeCap.round,
            ),
            const SizedBox(width: 24),
            Expanded(
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildMiniStat('Attended', attendance.overallAttended.toString(), Colors.green),
                      _buildMiniStat('Absent', attendance.overallAbsent.toString(), Colors.red),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildMiniStat('Conducted', attendance.overallTotal.toString(), AppTheme.primaryColor),
                      _buildMiniStat('Theory', attendance.overallTheoryCount.toString(), Colors.cyan),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildMiniStat('Labs', attendance.overallLabCount.toString(), Colors.amber),
                      const SizedBox(width: 80),
                    ],
                  ),
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
      children: [
        Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
          ],
        ),
        Text(
          label,
          style: TextStyle(fontSize: 10, color: Colors.grey.shade400, fontWeight: FontWeight.w500),
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
              color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(16),
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
              margin: const EdgeInsets.only(bottom: 10),
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: theme.colorScheme.outlineVariant.withValues(alpha: 0.1)),
              ),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                leading: CircleAvatar(
                  backgroundColor: color.withValues(alpha: 0.1),
                  child: Text(
                    sub.name.split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join().toUpperCase(),
                    style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ),
                title: Text(sub.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 4.0),
                  child: Text(
                    'Present: ${sub.attendedCount} • Absent: ${sub.totalCount - sub.attendedCount} • Total: ${sub.totalCount}',
                    style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey),
                  ),
                ),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '${sub.percentage.toStringAsFixed(0)}%',
                      style: TextStyle(
                        color: sub.isBelowTarget ? AppTheme.errorColor : AppTheme.successColor,
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(Icons.chevron_right_rounded, color: Colors.grey.shade500),
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
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: theme.colorScheme.outlineVariant.withValues(alpha: 0.1)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Upload Timetable',
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.settings_outlined, size: 20, color: AppTheme.primaryColor),
                  onPressed: () => _showApiKeyDialog(context),
                  tooltip: 'Configure Gemini API Key',
                ),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 24),
              decoration: BoxDecoration(
                border: Border.all(color: theme.colorScheme.outlineVariant.withValues(alpha: 0.2), style: BorderStyle.solid),
                borderRadius: BorderRadius.circular(16),
                color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.1),
              ),
              child: Column(
                children: [
                  const Icon(Icons.psychology_outlined, size: 36, color: AppTheme.primaryColor),
                  const SizedBox(height: 8),
                  Text(
                    'Upload Timetable Image',
                    style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  Text(
                    'Gemini AI will understand your layout structure',
                    style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey),
                  ),
                  const SizedBox(height: 16),
                  _isExtracting
                      ? const Column(
                          children: [
                            CircularProgressIndicator(),
                            SizedBox(height: 10),
                            Text('Analyzing layout with Gemini AI...', style: TextStyle(fontSize: 12, color: Colors.grey)),
                          ],
                        )
                      : FilledButton(
                          onPressed: _pickAndExtractTimetable,
                          style: FilledButton.styleFrom(
                            backgroundColor: AppTheme.primaryColor,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          ),
                          child: const Text('Choose Image'),
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
              DateFormat('EEEE, d MMM').format(DateTime.now()),
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
              color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(16),
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
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: theme.colorScheme.outlineVariant.withValues(alpha: 0.1)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(c.startTime, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        Text(
                          c.endTime,
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade500, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                    const SizedBox(width: 16),
                    Container(
                      width: 4,
                      height: 38,
                      decoration: BoxDecoration(
                        color: Color(int.parse(c.subjectColor.replaceFirst('#', '0xFF'))),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(width: 12),
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
                    Row(
                      children: [
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green.withValues(alpha: 0.1),
                            foregroundColor: Colors.green,
                            shadowColor: Colors.transparent,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            minimumSize: const Size(60, 32),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: () {
                            attendance.logAttendance(c.subjectName, true, DateTime.now(), c.type);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Logged Present for ${c.subjectName}'),
                                duration: const Duration(seconds: 1),
                              ),
                            );
                          },
                          child: const Text('Present', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red.withValues(alpha: 0.1),
                            foregroundColor: Colors.red,
                            shadowColor: Colors.transparent,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            minimumSize: const Size(60, 32),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: () {
                            attendance.logAttendance(c.subjectName, false, DateTime.now(), c.type);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Logged Absent for ${c.subjectName}'),
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
