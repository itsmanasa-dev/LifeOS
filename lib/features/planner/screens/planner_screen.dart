import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import '../providers/planner_provider.dart';
import '../models/task_model.dart';
import '../widgets/add_task_sheet.dart';
import '../../../core/theme/app_theme.dart';

class PlannerScreen extends StatefulWidget {
  const PlannerScreen({super.key});

  @override
  State<PlannerScreen> createState() => _PlannerScreenState();
}

class _PlannerScreenState extends State<PlannerScreen> {
  String _selectedCategory = 'All';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final planner = context.watch<PlannerProvider>();

    // Get uncompleted tasks based on both active filter (Today/Upcoming/Completed) and selectedCategory
    List<TaskModel> filteredList = planner.filteredTasks;

    if (_selectedCategory != 'All') {
      filteredList = filteredList.where((task) {
        return task.category?.toLowerCase() == _selectedCategory.toLowerCase();
      }).toList();
    }

    final pendingCount = planner.tasks.where((t) => !t.isCompleted).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Daily Planner'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list_rounded),
            onPressed: () => _showFilterOptions(context, planner),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddTask(context),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text(
          'Add Task',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Summary
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Today's Focus",
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  pendingCount > 0
                      ? 'You have $pendingCount tasks remaining.'
                      : 'All done! Enjoy your day.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),

          // Horizontal Category Tabs
          _buildCategoryFilterRow(theme),

          // Main Tasks List
          Expanded(
            child: planner.isLoading
                ? const Center(child: CircularProgressIndicator())
                : filteredList.isEmpty
                    ? _EmptyState(category: _selectedCategory)
                    : RefreshIndicator(
                        onRefresh: planner.loadTasks,
                        child: ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                          itemCount: filteredList.length,
                          itemBuilder: (context, i) {
                            final task = filteredList[i];
                            return _buildSlidableTaskCard(context, task, planner, theme);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryFilterRow(ThemeData theme) {
    final categories = ['All', 'College', 'Personal', 'Coding'];
    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final cat = categories[index];
          final isSelected = _selectedCategory == cat;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(
                cat,
                style: TextStyle(
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected ? Colors.white : theme.colorScheme.onSurface,
                ),
              ),
              selected: isSelected,
              selectedColor: AppTheme.primaryColor,
              backgroundColor: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
              onSelected: (val) {
                if (val) {
                  setState(() {
                    _selectedCategory = cat;
                  });
                }
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildSlidableTaskCard(
      BuildContext context, TaskModel task, PlannerProvider planner, ThemeData theme) {
    return Padding(
      key: ValueKey(task.id),
      padding: const EdgeInsets.only(bottom: 10),
      child: Slidable(
        key: ValueKey(task.id),
        endActionPane: ActionPane(
          motion: const ScrollMotion(),
          extentRatio: 0.25,
          children: [
            SlidableAction(
              onPressed: (_) => planner.deleteTask(task.id),
              backgroundColor: AppTheme.errorColor,
              foregroundColor: Colors.white,
              icon: Icons.delete_outline_rounded,
              borderRadius: BorderRadius.circular(16),
              label: 'Delete',
            ),
          ],
        ),
        child: Card(
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(
              color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
            ),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            leading: Checkbox(
              value: task.isCompleted,
              activeColor: AppTheme.primaryColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(4),
              ),
              onChanged: (_) {
                planner.toggleComplete(task.id);
              },
            ),
            title: Text(
              task.title,
              style: TextStyle(
                decoration: task.isCompleted ? TextDecoration.lineThrough : null,
                color: task.isCompleted
                    ? theme.colorScheme.onSurface.withValues(alpha: 0.4)
                    : theme.colorScheme.onSurface,
                fontWeight: FontWeight.w700,
                fontSize: 15,
              ),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (task.description != null && task.description!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    task.description!,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                Row(
                  children: [
                    // Priority Indicator
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: task.priority == 'high' || task.priority == 'urgent'
                            ? AppTheme.errorColor
                            : task.priority == 'medium'
                                ? AppTheme.warningColor
                                : AppTheme.successColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Category Tag
                    if (task.category != null) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          task.category!.toUpperCase(),
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: AppTheme.primaryColor,
                            fontWeight: FontWeight.w800,
                            fontSize: 9,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                    ],
                    // Due Date
                    if (task.dueDate != null)
                      Row(
                        children: [
                          Icon(
                            Icons.access_time_filled_rounded,
                            size: 13,
                            color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _formatDueDate(task.dueDate!),
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ],
            ),
            trailing: IconButton(
              icon: Icon(
                Icons.edit_note_rounded,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
              ),
              onPressed: () => _showEditTask(context, task),
            ),
          ),
        ),
      ),
    );
  }

  String _formatDueDate(DateTime dt) {
    final now = DateTime.now();
    if (dt.year == now.year && dt.month == now.month && dt.day == now.day) {
      return 'TODAY, ${DateFormat('h:mm a').format(dt)}';
    } else if (dt.year == now.year && dt.month == now.month && dt.day == now.day + 1) {
      return 'TOMORROW, ${DateFormat('h:mm a').format(dt)}';
    }
    return DateFormat('MMM d, h:mm a').format(dt);
  }

  void _showAddTask(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AddTaskSheet(),
    );
  }

  void _showEditTask(BuildContext context, TaskModel task) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AddTaskSheet(existingTask: task),
    );
  }

  void _showFilterOptions(BuildContext context, PlannerProvider planner) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        final theme = Theme.of(ctx);
        final filterOptions = [
          (TaskFilter.today, 'Today', Icons.today_rounded),
          (TaskFilter.upcoming, 'Upcoming', Icons.upcoming_rounded),
          (TaskFilter.completed, 'Completed', Icons.check_circle_outline_rounded),
          (TaskFilter.all, 'All Tasks', Icons.list_alt_rounded),
        ];

        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Text(
                  'Filter by Timing',
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              ...filterOptions.map((opt) {
                final (filter, label, icon) = opt;
                final isSelected = planner.activeFilter == filter;
                return ListTile(
                  leading: Icon(icon, color: isSelected ? AppTheme.primaryColor : null),
                  title: Text(
                    label,
                    style: TextStyle(
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected ? AppTheme.primaryColor : null,
                    ),
                  ),
                  trailing: isSelected
                      ? const Icon(Icons.check_circle_rounded, color: AppTheme.primaryColor)
                      : const Icon(Icons.radio_button_unchecked_rounded, color: Colors.grey),
                  onTap: () {
                    planner.setFilter(filter);
                    Navigator.pop(ctx);
                  },
                );
              }),
            ],
          ),
        );
      },
    );
  }
}

class _EmptyState extends StatelessWidget {
  final String category;
  const _EmptyState({required this.category});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('🎯', style: TextStyle(fontSize: 48)),
          const SizedBox(height: 16),
          Text(
            'No tasks in $category',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Tap + to add a task.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
            ),
          ),
        ],
      ),
    );
  }
}
