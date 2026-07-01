import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../models/timetable_model.dart';
import '../providers/college_provider.dart';
import '../../attendance/providers/attendance_provider.dart';
import '../services/timetable_ocr_parser.dart';
import '../../../core/theme/app_theme.dart';

class TimetablePreviewScreen extends StatefulWidget {
  final List<TimetableEntry> initialEntries;

  const TimetablePreviewScreen({super.key, required this.initialEntries});

  @override
  State<TimetablePreviewScreen> createState() => _TimetablePreviewScreenState();
}

class _TimetablePreviewScreenState extends State<TimetablePreviewScreen> {
  late List<TimetableEntry> _entries;

  @override
  void initState() {
    super.initState();
    _entries = List.from(widget.initialEntries);
  }

  void _addSlot() {
    setState(() {
      _entries.add(
        TimetableEntry(
          id: 'manual-${Random().nextInt(1000000)}',
          subjectName: 'New Class',
          subjectColor: '#6366F1',
          startTime: '09:00',
          endTime: '09:50',
          room: 'L-101',
          dayOfWeek: 1,
          type: 'Lecture',
        ),
      );
    });
  }

  void _deleteSlot(int index) {
    setState(() {
      _entries.removeAt(index);
    });
  }

  void _updateSlot(int index, TimetableEntry updated) {
    setState(() {
      _entries[index] = updated;
    });
  }

  Future<void> _importTimetable() async {
    if (_entries.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please add at least one class slot before importing.')),
      );
      return;
    }

    final college = context.read<CollegeProvider>();
    final attendance = context.read<AttendanceProvider>();

    final keepHistory = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Replace Timetable?'),
          content: const Text(
            'Keep your existing attendance history?\nSelect NO to reset all class logs.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('NO (RESET LOGS)', style: TextStyle(color: AppTheme.errorColor)),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('YES (KEEP HISTORY)'),
            ),
          ],
        );
      },
    );

    if (keepHistory == null) return;

    await college.importTimetable(_entries);
    await attendance.syncSubjectsFromTimetable(_entries, keepHistory: keepHistory);

    if (mounted) {
      context.go('/college');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Successfully imported ${_entries.length} class slots!'),
          backgroundColor: AppTheme.successColor,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    final types = ['Lecture', 'Lab'];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Preview Extracted Data'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            onPressed: _addSlot,
            tooltip: 'Add new class slot',
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => context.go('/college'),
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: _importTimetable,
                  style: FilledButton.styleFrom(backgroundColor: AppTheme.primaryColor),
                  child: const Text('Import Timetable'),
                ),
              ),
            ],
          ),
        ),
      ),
      body: _entries.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('📅', style: TextStyle(fontSize: 48)),
                  const SizedBox(height: 16),
                  Text('No slots to preview.', style: theme.textTheme.titleMedium),
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: _addSlot,
                    icon: const Icon(Icons.add),
                    label: const Text('Add Class Slot Manually'),
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _entries.length,
              itemBuilder: (context, index) {
                final entry = _entries[index];
                final isLowSubject = entry.lowConfidenceFields.contains('subjectName');
                final isLowDay = entry.lowConfidenceFields.contains('dayOfWeek');
                final isLowStart = entry.lowConfidenceFields.contains('startTime');
                final isLowEnd = entry.lowConfidenceFields.contains('endTime');
                final isLowRoom = entry.lowConfidenceFields.contains('room');

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: entry.lowConfidenceFields.isNotEmpty
                        ? const BorderSide(color: Colors.orange, width: 1.5)
                        : BorderSide(color: theme.colorScheme.outlineVariant.withValues(alpha: 0.1)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (entry.lowConfidenceFields.isNotEmpty) ...[
                          const Row(
                            children: [
                              Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 16),
                              SizedBox(width: 6),
                              Text(
                                'Low confidence matches found - please review',
                                style: TextStyle(color: Colors.orange, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                        ],
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                initialValue: entry.subjectName,
                                decoration: InputDecoration(
                                  labelText: 'Subject Name',
                                  border: const UnderlineInputBorder(),
                                  isDense: true,
                                  focusedBorder: isLowSubject
                                      ? const UnderlineInputBorder(borderSide: BorderSide(color: Colors.orange, width: 2))
                                      : null,
                                  enabledBorder: isLowSubject
                                      ? const UnderlineInputBorder(borderSide: BorderSide(color: Colors.orange))
                                      : null,
                                  suffixIcon: isLowSubject
                                      ? const Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 18)
                                      : null,
                                ),
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                onChanged: (val) {
                                  _updateSlot(
                                    index,
                                    TimetableEntry(
                                      id: entry.id,
                                      subjectName: val,
                                      subjectColor: TimetableOcrParser.getColorForSubject(val),
                                      startTime: entry.startTime,
                                      endTime: entry.endTime,
                                      room: entry.room,
                                      dayOfWeek: entry.dayOfWeek,
                                      type: entry.type,
                                      lowConfidenceFields: entry.lowConfidenceFields.difference({'subjectName'}),
                                    ),
                                  );
                                },
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline_rounded, color: AppTheme.errorColor),
                              onPressed: () => _deleteSlot(index),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: DropdownButtonFormField<int>(
                                initialValue: entry.dayOfWeek,
                                decoration: InputDecoration(
                                  labelText: 'Day',
                                  isDense: true,
                                  focusedBorder: isLowDay
                                      ? const UnderlineInputBorder(borderSide: BorderSide(color: Colors.orange, width: 2))
                                      : null,
                                  enabledBorder: isLowDay
                                      ? const UnderlineInputBorder(borderSide: BorderSide(color: Colors.orange))
                                      : null,
                                ),
                                items: List.generate(7, (i) {
                                  return DropdownMenuItem(value: i + 1, child: Text(days[i]));
                                }),
                                onChanged: (val) {
                                  if (val != null) {
                                    _updateSlot(
                                      index,
                                      TimetableEntry(
                                        id: entry.id,
                                        subjectName: entry.subjectName,
                                        subjectColor: entry.subjectColor,
                                        startTime: entry.startTime,
                                        endTime: entry.endTime,
                                        room: entry.room,
                                        dayOfWeek: val,
                                        type: entry.type,
                                        lowConfidenceFields: entry.lowConfidenceFields.difference({'dayOfWeek'}),
                                      ),
                                    );
                                  }
                                },
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                initialValue: entry.type,
                                decoration: const InputDecoration(labelText: 'Type', isDense: true),
                                items: types.map((t) {
                                  return DropdownMenuItem(value: t, child: Text(t));
                                }).toList(),
                                onChanged: (val) {
                                  if (val != null) {
                                    _updateSlot(
                                      index,
                                      TimetableEntry(
                                        id: entry.id,
                                        subjectName: entry.subjectName,
                                        subjectColor: entry.subjectColor,
                                        startTime: entry.startTime,
                                        endTime: entry.endTime,
                                        room: entry.room,
                                        dayOfWeek: entry.dayOfWeek,
                                        type: val,
                                        lowConfidenceFields: entry.lowConfidenceFields,
                                      ),
                                    );
                                  }
                                },
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                initialValue: entry.startTime,
                                decoration: InputDecoration(
                                  labelText: 'Start Time',
                                  hintText: 'HH:mm',
                                  isDense: true,
                                  focusedBorder: isLowStart
                                      ? const UnderlineInputBorder(borderSide: BorderSide(color: Colors.orange, width: 2))
                                      : null,
                                  enabledBorder: isLowStart
                                      ? const UnderlineInputBorder(borderSide: BorderSide(color: Colors.orange))
                                      : null,
                                ),
                                onChanged: (val) {
                                  _updateSlot(
                                    index,
                                    TimetableEntry(
                                      id: entry.id,
                                      subjectName: entry.subjectName,
                                      subjectColor: entry.subjectColor,
                                      startTime: val,
                                      endTime: entry.endTime,
                                      room: entry.room,
                                      dayOfWeek: entry.dayOfWeek,
                                      type: entry.type,
                                      lowConfidenceFields: entry.lowConfidenceFields.difference({'startTime'}),
                                    ),
                                  );
                                },
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextFormField(
                                initialValue: entry.endTime,
                                decoration: InputDecoration(
                                  labelText: 'End Time',
                                  hintText: 'HH:mm',
                                  isDense: true,
                                  focusedBorder: isLowEnd
                                      ? const UnderlineInputBorder(borderSide: BorderSide(color: Colors.orange, width: 2))
                                      : null,
                                  enabledBorder: isLowEnd
                                      ? const UnderlineInputBorder(borderSide: BorderSide(color: Colors.orange))
                                      : null,
                                ),
                                onChanged: (val) {
                                  _updateSlot(
                                    index,
                                    TimetableEntry(
                                      id: entry.id,
                                      subjectName: entry.subjectName,
                                      subjectColor: entry.subjectColor,
                                      startTime: entry.startTime,
                                      endTime: val,
                                      room: entry.room,
                                      dayOfWeek: entry.dayOfWeek,
                                      type: entry.type,
                                      lowConfidenceFields: entry.lowConfidenceFields.difference({'endTime'}),
                                    ),
                                  );
                                },
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextFormField(
                                initialValue: entry.room ?? '',
                                decoration: InputDecoration(
                                  labelText: 'Room',
                                  isDense: true,
                                  focusedBorder: isLowRoom
                                      ? const UnderlineInputBorder(borderSide: BorderSide(color: Colors.orange, width: 2))
                                      : null,
                                  enabledBorder: isLowRoom
                                      ? const UnderlineInputBorder(borderSide: BorderSide(color: Colors.orange))
                                      : null,
                                ),
                                onChanged: (val) {
                                  _updateSlot(
                                    index,
                                    TimetableEntry(
                                      id: entry.id,
                                      subjectName: entry.subjectName,
                                      subjectColor: entry.subjectColor,
                                      startTime: entry.startTime,
                                      endTime: entry.endTime,
                                      room: val.trim().isEmpty ? null : val.trim(),
                                      dayOfWeek: entry.dayOfWeek,
                                      type: entry.type,
                                      lowConfidenceFields: entry.lowConfidenceFields.difference({'room'}),
                                    ),
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
