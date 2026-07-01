import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/planner_provider.dart';
import '../models/task_model.dart';
import '../widgets/task_card.dart';
import '../widgets/add_task_sheet.dart';
import '../../../core/theme/app_theme.dart';

class PlannerScreen extends StatelessWidget {
  const PlannerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Daily Planner'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list_rounded),
            onPressed: () {},
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
      body: Consumer<PlannerProvider>(
        builder: (context, planner, _) {
          return Column(
            children: [
              // Filter tabs
              _FilterTabs(
                selected: planner.activeFilter,
                onSelected: planner.setFilter,
                planner: planner,
              ),
              Expanded(
                child: planner.isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : planner.filteredTasks.isEmpty
                    ? _EmptyState(filter: planner.activeFilter)
                    : RefreshIndicator(
                        onRefresh: planner.loadTasks,
                        child: ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                          itemCount: planner.filteredTasks.length,
                          itemBuilder: (context, i) {
                            return TaskCard(task: planner.filteredTasks[i]);
                          },
                        ),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showAddTask(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AddTaskSheet(),
    );
  }
}

class _FilterTabs extends StatelessWidget {
  final TaskFilter selected;
  final ValueChanged<TaskFilter> onSelected;
  final PlannerProvider planner;

  const _FilterTabs({
    required this.selected,
    required this.onSelected,
    required this.planner,
  });

  @override
  Widget build(BuildContext context) {
    final filters = [
      (TaskFilter.today, 'Today', planner.todayTasks.length),
      (TaskFilter.upcoming, 'Upcoming', planner.upcomingTasks.length),
      (TaskFilter.completed, 'Done', planner.completedTasks.length),
    ];

    return Container(
      height: 52,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Row(
        children: filters.map((f) {
          final (filter, label, count) = f;
          final isSelected = selected == filter;
          return Expanded(
            child: GestureDetector(
              onTap: () => onSelected(filter),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: EdgeInsets.only(right: f != filters.last ? 8 : 0),
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppTheme.primaryColor
                      : Theme.of(context).colorScheme.surfaceContainerHighest
                            .withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(10),
                ),
                alignment: Alignment.center,
                child: Text(
                  count > 0 ? '$label ($count)' : label,
                  style: TextStyle(
                    color: isSelected
                        ? Colors.white
                        : Theme.of(
                            context,
                          ).colorScheme.onSurface.withValues(alpha: 0.7),
                    fontSize: 13,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final TaskFilter filter;
  const _EmptyState({required this.filter});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (emoji, title, subtitle) = switch (filter) {
      TaskFilter.today => ('🎯', 'No tasks today', 'Tap + to add one'),
      TaskFilter.upcoming => ('📅', 'Nothing upcoming', 'Plan ahead!'),
      TaskFilter.completed => (
        '🏆',
        'No completed tasks',
        'Start checking them off',
      ),
      TaskFilter.all => ('📝', 'No tasks yet', 'Add your first task'),
    };

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 48)),
          const SizedBox(height: 16),
          Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
            ),
          ),
        ],
      ),
    );
  }
}
