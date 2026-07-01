import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../features/dashboard/screens/dashboard_screen.dart';
import '../../features/planner/screens/planner_screen.dart';

class AppRouter {
  AppRouter._();

  static final GlobalKey<NavigatorState> _rootNavigatorKey =
      GlobalKey<NavigatorState>();
  static final GlobalKey<NavigatorState> _shellNavigatorKey =
      GlobalKey<NavigatorState>();

  static final GoRouter router = GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: AppRoutes.splash,
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        builder: (context, state) => const _SplashScreen(),
      ),
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const _AuthScreen(
          title: 'Welcome back',
          description: 'Sign in to continue into your LifeOS workspace.',
          primaryLabel: 'Open dashboard',
          primaryRoute: AppRoutes.dashboard,
          secondaryLabel: 'Create account',
          secondaryRoute: AppRoutes.register,
        ),
      ),
      GoRoute(
        path: AppRoutes.register,
        builder: (context, state) => const _AuthScreen(
          title: 'Create your space',
          description: 'Start with a clean productivity workspace.',
          primaryLabel: 'Get started',
          primaryRoute: AppRoutes.dashboard,
          secondaryLabel: 'Back to login',
          secondaryRoute: AppRoutes.login,
        ),
      ),
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) {
          return _MainShell(currentLocation: state.uri.path, child: child);
        },
        routes: [
          GoRoute(
            path: AppRoutes.dashboard,
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: AppRoutes.college,
            builder: (context, state) => const _SectionScreen(
              title: 'College',
              description: 'Keep classes, subjects, and deadlines in one view.',
              icon: Icons.school_outlined,
            ),
          ),
          GoRoute(
            path: AppRoutes.attendance,
            builder: (context, state) => const _SectionScreen(
              title: 'Attendance',
              description:
                  'Monitor attendance goals and stay above your target.',
              icon: Icons.fact_check_outlined,
            ),
          ),
          GoRoute(
            path: AppRoutes.planner,
            builder: (context, state) => const PlannerScreen(),
          ),
          GoRoute(
            path: AppRoutes.habits,
            builder: (context, state) => const _SectionScreen(
              title: 'Habits',
              description: 'Build consistency with daily habit tracking.',
              icon: Icons.track_changes_outlined,
            ),
          ),
          GoRoute(
            path: AppRoutes.govExam,
            builder: (context, state) => const _SectionScreen(
              title: 'Gov Exam',
              description: 'Plan exam preparation and review study progress.',
              icon: Icons.menu_book_outlined,
            ),
          ),
          GoRoute(
            path: AppRoutes.settings,
            builder: (context, state) => const _SectionScreen(
              title: 'Settings',
              description: 'Adjust preferences and shape the app around you.',
              icon: Icons.settings_outlined,
            ),
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Page not found: ${state.uri}',
            textAlign: TextAlign.center,
          ),
        ),
      ),
    ),
  );
}

class AppRoutes {
  AppRoutes._();

  static const String splash = '/splash';
  static const String login = '/login';
  static const String register = '/register';
  static const String dashboard = '/dashboard';
  static const String college = '/college';
  static const String attendance = '/attendance';
  static const String planner = '/planner';
  static const String habits = '/habits';
  static const String govExam = '/govexam';
  static const String settings = '/settings';
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Icon(
                    Icons.bolt_rounded,
                    size: 72,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'LifeOS',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.displaySmall,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'A clean starting point for your productivity app.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 32),
                  FilledButton(
                    onPressed: () => context.go(AppRoutes.dashboard),
                    child: const Text('Continue'),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: () => context.go(AppRoutes.login),
                    child: const Text('Login'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _AuthScreen extends StatelessWidget {
  const _AuthScreen({
    required this.title,
    required this.description,
    required this.primaryLabel,
    required this.primaryRoute,
    required this.secondaryLabel,
    required this.secondaryRoute,
  });

  final String title;
  final String description;
  final String primaryLabel;
  final String primaryRoute;
  final String secondaryLabel;
  final String secondaryRoute;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(title, style: theme.textTheme.headlineSmall),
                      const SizedBox(height: 12),
                      Text(description, style: theme.textTheme.bodyMedium),
                      const SizedBox(height: 24),
                      FilledButton(
                        onPressed: () => context.go(primaryRoute),
                        child: Text(primaryLabel),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton(
                        onPressed: () => context.go(secondaryRoute),
                        child: Text(secondaryLabel),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SectionScreen extends StatelessWidget {
  const _SectionScreen({
    required this.title,
    required this.description,
    required this.icon,
  });

  final String title;
  final String description;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(icon, size: 40, color: theme.colorScheme.primary),
                    const SizedBox(height: 16),
                    Text(title, style: theme.textTheme.headlineSmall),
                    const SizedBox(height: 8),
                    Text(description, style: theme.textTheme.bodyLarge),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MainShell extends StatelessWidget {
  const _MainShell({required this.currentLocation, required this.child});

  final String currentLocation;
  final Widget child;

  static const List<_NavItem> _items = [
    _NavItem(
      route: AppRoutes.dashboard,
      label: 'Home',
      icon: Icons.home_outlined,
    ),
    _NavItem(
      route: AppRoutes.college,
      label: 'College',
      icon: Icons.school_outlined,
    ),
    _NavItem(
      route: AppRoutes.attendance,
      label: 'Attendance',
      icon: Icons.fact_check_outlined,
    ),
    _NavItem(
      route: AppRoutes.planner,
      label: 'Planner',
      icon: Icons.event_note_outlined,
    ),
    _NavItem(
      route: AppRoutes.settings,
      label: 'Settings',
      icon: Icons.settings_outlined,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          final targetRoute = _items[index].route;
          if (targetRoute != currentLocation) {
            context.go(targetRoute);
          }
        },
        destinations: _items
            .map(
              (item) => NavigationDestination(
                icon: Icon(item.icon),
                label: item.label,
              ),
            )
            .toList(),
      ),
    );
  }

  int get _selectedIndex {
    final index = _items.indexWhere((item) => currentLocation == item.route);
    return index >= 0 ? index : 0;
  }
}

class _NavItem {
  const _NavItem({
    required this.route,
    required this.label,
    required this.icon,
  });

  final String route;
  final String label;
  final IconData icon;
}
