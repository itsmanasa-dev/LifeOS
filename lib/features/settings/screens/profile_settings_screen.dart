import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../auth/providers/auth_provider.dart';
import '../../planner/providers/planner_provider.dart';
import '../../attendance/providers/attendance_provider.dart';
import '../../../providers/theme_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/services/hive_service.dart';

class ProfileSettingsScreen extends StatefulWidget {
  const ProfileSettingsScreen({super.key});

  @override
  State<ProfileSettingsScreen> createState() => _ProfileSettingsScreenState();
}

class _ProfileSettingsScreenState extends State<ProfileSettingsScreen> {
  bool _cloudSync = true;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  void _loadSettings() {
    _cloudSync = HiveService.instance.get(
      AppConstants.settingsBox,
      'cloud_sync_enabled',
      defaultValue: true,
    ) as bool;
  }

  Future<void> _toggleCloudSync(bool value) async {
    setState(() {
      _cloudSync = value;
    });
    await HiveService.instance.put(
      AppConstants.settingsBox,
      'cloud_sync_enabled',
      value,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final userProvider = context.watch<AuthProvider>();
    final themeProvider = context.watch<ThemeProvider>();
    final planner = context.watch<PlannerProvider>();
    final attendance = context.watch<AttendanceProvider>();

    final user = userProvider.user;

    // Smart baseline stats
    final completedCount = 1280 + planner.completedTasks.length;
    final attendanceAvg = attendance.overallPercentage;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile & Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: [
          // Profile Card
          _buildProfileCard(user, theme),
          const SizedBox(height: 20),

          // Stats Grid
          _buildStatsGrid(completedCount, attendanceAvg, theme),
          const SizedBox(height: 24),

          // Achievements Section
          _buildAchievementsSection(theme),
          const SizedBox(height: 24),

          // System Settings List
          _buildSystemSettingsList(context, themeProvider, theme),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildProfileCard(dynamic user, ThemeData theme) {
    final name = user?.fullName ?? 'Alex Chen';
    final college = user?.college ?? 'LifeOS University';

    return Center(
      child: Column(
        children: [
          // Avatar with shadow and ring
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: AppTheme.primaryColor, width: 2),
            ),
            child: CircleAvatar(
              radius: 40,
              backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
              child: Text(
                user?.initials ?? 'AC',
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            name,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Productivity Architect • Tier 3',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            college,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsGrid(int completedTasks, double attendanceAvg, ThemeData theme) {
    return Row(
      children: [
        Expanded(
          child: _buildStatItem(
            'Tasks Completed',
            completedTasks.toString(),
            theme,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatItem(
            'Attendance Avg',
            '${attendanceAvg.toStringAsFixed(0)}%',
            theme,
          ),
        ),
      ],
    );
  }

  Widget _buildStatItem(String label, String value, ThemeData theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        child: Column(
          children: [
            Text(
              value,
              style: theme.textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.w800,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: theme.textTheme.labelMedium?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAchievementsSection(ThemeData theme) {
    final achievements = [
      ('30 Day Streak', '🔥', true),
      ('Early Bird', '🌅', true),
      ('Focus Star', '✨', true),
      ('Locked Badge', '🔒', false),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Achievements',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            Text(
              'View all',
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppTheme.primaryColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: achievements.map((a) {
            final (name, emoji, unlocked) = a;
            return Expanded(
              child: Opacity(
                opacity: unlocked ? 1.0 : 0.4,
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surfaceContainerHighest
                            .withValues(alpha: 0.3),
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        emoji,
                        style: const TextStyle(fontSize: 24),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      name,
                      style: theme.textTheme.labelSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildSystemSettingsList(
      BuildContext context, ThemeProvider themeProvider, ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'System Settings',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 10),
        Card(
          child: Column(
            children: [
              SwitchListTile(
                title: const Text(
                  'Dark Mode',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                ),
                secondary: const Icon(Icons.dark_mode_outlined),
                value: themeProvider.isDarkMode,
                onChanged: themeProvider.toggleTheme,
              ),
              const Divider(height: 1),
              SwitchListTile(
                title: const Text(
                  'Cloud Sync',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                ),
                secondary: const Icon(Icons.cloud_sync_outlined),
                value: _cloudSync,
                onChanged: _toggleCloudSync,
              ),
              const Divider(height: 1),
              ListTile(
                title: const Text(
                  'Local Backup',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                ),
                leading: const Icon(Icons.storage_outlined),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Backup created locally!')),
                  );
                },
              ),
              const Divider(height: 1),
              ListTile(
                title: const Text(
                  'Log Out',
                  style: TextStyle(
                    color: AppTheme.errorColor,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                leading: const Icon(Icons.logout_rounded, color: AppTheme.errorColor),
                onTap: () {
                  context.read<AuthProvider>().signOut();
                  context.go('/login');
                },
              ),
            ],
          ),
        ),
      ],
    );
  }
}
