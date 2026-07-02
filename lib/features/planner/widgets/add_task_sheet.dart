import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/task_model.dart';
import '../providers/planner_provider.dart';

class AddTaskSheet extends StatefulWidget {
  const AddTaskSheet({super.key, this.existingTask});

  final TaskModel? existingTask;

  @override
  State<AddTaskSheet> createState() => _AddTaskSheetState();
}

class _AddTaskSheetState extends State<AddTaskSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _categoryController;
  late String _priority;
  DateTime? _dueDate;

  static const _priorities = ['low', 'medium', 'high', 'urgent'];

  bool get _isEditing => widget.existingTask != null;

  @override
  void initState() {
    super.initState();
    final task = widget.existingTask;
    _titleController = TextEditingController(text: task?.title ?? '');
    _descriptionController = TextEditingController(
      text: task?.description ?? '',
    );
    _categoryController = TextEditingController(text: task?.category ?? '');
    _priority = task?.priority ?? 'medium';
    _dueDate = task?.dueDate;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _categoryController.dispose();
    super.dispose();
  }

  Future<void> _pickDueDate() async {
    final now = DateTime.now();
    final selected = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 5),
    );
    if (!mounted || selected == null) {
      return;
    }
    setState(() {
      _dueDate = selected;
    });
  }

  void _save() {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final existingTask = widget.existingTask;
    context.read<PlannerProvider>().upsertTask(
      TaskModel(
        id:
            existingTask?.id ??
            DateTime.now().microsecondsSinceEpoch.toString(),
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text.trim(),
        priority: _priority,
        isCompleted: existingTask?.isCompleted ?? false,
        category: _categoryController.text.trim().isEmpty
            ? null
            : _categoryController.text.trim(),
        dueDate: _dueDate,
        createdAt: existingTask?.createdAt ?? DateTime.now(),
      ),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Material(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(24),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _isEditing ? 'Edit Task' : 'Add Task',
                  style: theme.textTheme.headlineSmall,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _titleController,
                  decoration: const InputDecoration(
                    labelText: 'Title',
                    hintText: 'What needs to get done?',
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Enter a task title';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _descriptionController,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                    hintText: 'Add extra details',
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _categoryController,
                  decoration: const InputDecoration(
                    labelText: 'Category',
                    hintText: 'Work, Study, Personal...',
                  ),
                ),
                const SizedBox(height: 16),
                Text('Priority', style: theme.textTheme.titleSmall),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: _priorities.map((priority) {
                    return ChoiceChip(
                      label: Text(priority.toUpperCase()),
                      selected: _priority == priority,
                      onSelected: (_) {
                        setState(() {
                          _priority = priority;
                        });
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        _dueDate == null
                            ? 'No due date selected'
                            : 'Due ${MaterialLocalizations.of(context).formatMediumDate(_dueDate!)}',
                        style: theme.textTheme.bodyMedium,
                      ),
                    ),
                    TextButton(
                      onPressed: _pickDueDate,
                      child: const Text('Pick date'),
                    ),
                    if (_dueDate != null)
                      IconButton(
                        onPressed: () {
                          setState(() {
                            _dueDate = null;
                          });
                        },
                        icon: const Icon(Icons.close_rounded),
                        tooltip: 'Clear due date',
                      ),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.of(context).pop(),
                        child: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton(
                        onPressed: _save,
                        child: Text(_isEditing ? 'Save' : 'Create'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
