import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../features/dashboard/screens/dashboard_screen.dart';
import '../../features/planner/screens/planner_screen.dart';
import '../../features/college/screens/college_hub_screen.dart';
import '../../features/college/screens/timetable_preview_screen.dart';
import '../../features/college/models/timetable_model.dart';
import '../../features/exams/screens/study_tracker_screen.dart';
import '../../features/settings/screens/profile_settings_screen.dart';
import '../../features/attendance/screens/subject_detail_screen.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../theme/app_theme.dart';
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;

void _showErrorSnackBar(BuildContext context, dynamic error) {
  String errorMsg;
  if (error is FirebaseAuthException) {
    errorMsg = 'Auth Error [${error.code}]: ${error.message}';
  } else {
    errorMsg = error.toString().replaceAll('Exception: ', '');
  }
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(errorMsg),
      backgroundColor: AppTheme.errorColor,
    ),
  );
}


class AppRouter {
  AppRouter._();

  static final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>();
  static final GlobalKey<NavigatorState> _shellNavigatorKey = GlobalKey<NavigatorState>();

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
        builder: (context, state) => const _LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.register,
        builder: (context, state) => const _RegisterScreen(),
      ),
      GoRoute(
        path: AppRoutes.forgotPassword,
        builder: (context, state) => const _ForgotPasswordScreen(),
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
            builder: (context, state) => const CollegeHubScreen(),
            routes: [
              GoRoute(
                path: 'import-preview',
                builder: (context, state) {
                  final rawEntries = state.extra as List<TimetableEntry>? ?? [];
                  return TimetablePreviewScreen(initialEntries: rawEntries);
                },
              ),
              GoRoute(
                path: 'subject/:id',
                builder: (context, state) {
                  final subjectId = state.pathParameters['id']!;
                  return SubjectDetailScreen(subjectId: subjectId);
                },
              ),
            ],
          ),
          GoRoute(
            path: AppRoutes.planner,
            builder: (context, state) => const PlannerScreen(),
          ),
          GoRoute(
            path: AppRoutes.govExam,
            builder: (context, state) => const StudyTrackerScreen(),
          ),
          GoRoute(
            path: AppRoutes.settings,
            builder: (context, state) => const ProfileSettingsScreen(),
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
  static const String forgotPassword = '/forgot-password';
  static const String dashboard = '/dashboard';
  static const String college = '/college';
  static const String attendance = '/attendance';
  static const String planner = '/planner';
  static const String habits = '/habits';
  static const String govExam = '/govexam';
  static const String settings = '/settings';
}

// ---------------------------------------------------------
// 1. Splash Screen (Auto checks Firebase current session)
// ---------------------------------------------------------
class _SplashScreen extends StatefulWidget {
  const _SplashScreen();

  @override
  State<_SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<_SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkSessionAndNavigate();
  }

  Future<void> _checkSessionAndNavigate() async {
    // Brief delay to allow native SDK state initialization & show premium logo
    await Future.delayed(const Duration(milliseconds: 1500));
    if (!mounted) return;

    final auth = context.read<AuthProvider>();
    if (auth.isAuthenticated) {
      context.go(AppRoutes.dashboard);
    } else {
      context.go(AppRoutes.login);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: AppGradients.background,
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.bolt_rounded,
                  size: 64,
                  color: AppTheme.accentColor,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'LifeOS',
                style: theme.textTheme.displaySmall?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: AppTheme.darkTextPrimary,
                  letterSpacing: -1,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Initializing your workspace...',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: AppTheme.darkTextSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------
// 2. Premium Glassmorphic Login Screen
// ---------------------------------------------------------
class _LoginScreen extends StatefulWidget {
  const _LoginScreen();

  @override
  State<_LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<_LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submitLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    try {
      await auth.signInWithEmailAndPassword(
        _emailController.text.trim(),
        _passwordController.text.trim(),
      );
      if (mounted) {
        context.go(AppRoutes.dashboard);
      }
    } catch (e) {
      if (mounted) {
        _showErrorSnackBar(context, e);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: AppGradients.background,
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  children: [
                    // LifeOS Branding Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.bolt_rounded, color: AppTheme.accentColor, size: 36),
                        const SizedBox(width: 8),
                        Text(
                          'LifeOS',
                          style: theme.textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: AppTheme.darkTextPrimary,
                            letterSpacing: -1,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Ultimate Productivity Workspace',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppTheme.darkTextSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Glassmorphic Card
                    ClipRRect(
                      borderRadius: BorderRadius.circular(24),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 16.0, sigmaY: 16.0),
                        child: Container(
                          decoration: BoxDecoration(
                            color: AppTheme.darkCardColor.withValues(alpha: 0.65),
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(
                              color: AppTheme.darkTextSecondary.withValues(alpha: 0.1),
                              width: 1.5,
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(28.0),
                            child: Form(
                              key: _formKey,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Text(
                                    'Welcome back',
                                    style: theme.textTheme.titleLarge?.copyWith(
                                      color: AppTheme.darkTextPrimary,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Sign in to sync your local schedule & habits.',
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color: AppTheme.darkTextSecondary,
                                    ),
                                  ),
                                  const SizedBox(height: 24),

                                  // Email Input
                                  TextFormField(
                                    controller: _emailController,
                                    keyboardType: TextInputType.emailAddress,
                                    textInputAction: TextInputAction.next,
                                    style: const TextStyle(color: AppTheme.darkTextPrimary),
                                    decoration: const InputDecoration(
                                      labelText: 'Email',
                                      prefixIcon: Icon(Icons.email_outlined, size: 20),
                                    ),
                                    validator: (value) {
                                      if (value == null || value.trim().isEmpty) {
                                        return 'Please enter your email.';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 16),

                                  // Password Input
                                  TextFormField(
                                    controller: _passwordController,
                                    obscureText: _obscurePassword,
                                    style: const TextStyle(color: AppTheme.darkTextPrimary),
                                    decoration: InputDecoration(
                                      labelText: 'Password',
                                      prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                                      suffixIcon: IconButton(
                                        icon: Icon(
                                          _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                          size: 20,
                                        ),
                                        onPressed: () {
                                          setState(() => _obscurePassword = !_obscurePassword);
                                        },
                                      ),
                                    ),
                                    validator: (value) {
                                      if (value == null || value.trim().isEmpty) {
                                        return 'Please enter your password.';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 12),

                                  // Forgot Password
                                  Align(
                                    alignment: Alignment.centerRight,
                                    child: TextButton(
                                      onPressed: () => context.go(AppRoutes.forgotPassword),
                                      style: TextButton.styleFrom(
                                        padding: EdgeInsets.zero,
                                        minimumSize: const Size(50, 30),
                                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                      ),
                                      child: const Text(
                                        'Forgot password?',
                                        style: TextStyle(
                                          color: AppTheme.accentColor,
                                          fontWeight: FontWeight.w600,
                                          fontSize: 13,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 20),

                                  // Sign In Button
                                  auth.isLoading
                                      ? const Center(child: CircularProgressIndicator())
                                      : FilledButton(
                                          onPressed: _submitLogin,
                                          style: FilledButton.styleFrom(
                                            backgroundColor: AppTheme.primaryColor,
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                          ),
                                          child: const Text('Sign In'),
                                        ),
                                  const SizedBox(height: 16),

                                  // Google Button Separator
                                  Row(
                                    children: [
                                      Expanded(child: Divider(color: AppTheme.darkTextSecondary.withValues(alpha: 0.2))),
                                      Padding(
                                        padding: const EdgeInsets.symmetric(horizontal: 12),
                                        child: Text(
                                          'or continue with',
                                          style: theme.textTheme.bodySmall?.copyWith(fontSize: 11),
                                        ),
                                      ),
                                      Expanded(child: Divider(color: AppTheme.darkTextSecondary.withValues(alpha: 0.2))),
                                    ],
                                  ),
                                  const SizedBox(height: 16),

                                  // Google Login Button
                                  _buildGoogleButton(context, auth, theme),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Redirect to Register
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          "Don't have an account?",
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: AppTheme.darkTextSecondary,
                          ),
                        ),
                        TextButton(
                          onPressed: () => context.go(AppRoutes.register),
                          child: const Text(
                            'Create Account',
                            style: TextStyle(
                              color: AppTheme.accentColor,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGoogleButton(BuildContext context, AuthProvider auth, ThemeData theme) {
    return OutlinedButton(
      onPressed: () async {
        try {
          await auth.signInWithGoogle();
          if (context.mounted) {
            context.go(AppRoutes.dashboard);
          }
        } catch (e) {
          if (context.mounted) {
            _showErrorSnackBar(context, e);
          }
        }
      },
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        side: BorderSide(color: AppTheme.darkTextSecondary.withValues(alpha: 0.2)),
        backgroundColor: Colors.transparent,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Image.network(
            'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.png',
            height: 18,
            width: 18,
            errorBuilder: (context, error, stackTrace) => const Icon(Icons.g_mobiledata_rounded, size: 20, color: Colors.white),
          ),
          const SizedBox(width: 10),
          const Text(
            'Continue with Google',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.darkTextPrimary),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------
// 3. Register / Create Account Screen
// ---------------------------------------------------------
class _RegisterScreen extends StatefulWidget {
  const _RegisterScreen();

  @override
  State<_RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<_RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submitRegister() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    try {
      await auth.signUpWithEmailAndPassword(
        _emailController.text.trim(),
        _passwordController.text.trim(),
        _nameController.text.trim(),
      );
      if (mounted) {
        context.go(AppRoutes.dashboard);
      }
    } catch (e) {
      if (mounted) {
        _showErrorSnackBar(context, e);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: AppGradients.background,
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.bolt_rounded, color: AppTheme.accentColor, size: 36),
                        const SizedBox(width: 8),
                        Text(
                          'LifeOS',
                          style: theme.textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: AppTheme.darkTextPrimary,
                            letterSpacing: -1,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),

                    ClipRRect(
                      borderRadius: BorderRadius.circular(24),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 16.0, sigmaY: 16.0),
                        child: Container(
                          decoration: BoxDecoration(
                            color: AppTheme.darkCardColor.withValues(alpha: 0.65),
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(
                              color: AppTheme.darkTextSecondary.withValues(alpha: 0.1),
                              width: 1.5,
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(28.0),
                            child: Form(
                              key: _formKey,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Text(
                                    'Create Account',
                                    style: theme.textTheme.titleLarge?.copyWith(
                                      color: AppTheme.darkTextPrimary,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Build your local timetable & tracking database.',
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color: AppTheme.darkTextSecondary,
                                    ),
                                  ),
                                  const SizedBox(height: 24),

                                  // Name Field
                                  TextFormField(
                                    controller: _nameController,
                                    keyboardType: TextInputType.name,
                                    textInputAction: TextInputAction.next,
                                    style: const TextStyle(color: AppTheme.darkTextPrimary),
                                    decoration: const InputDecoration(
                                      labelText: 'Full Name',
                                      prefixIcon: Icon(Icons.person_outline_rounded, size: 20),
                                    ),
                                    validator: (value) {
                                      if (value == null || value.trim().isEmpty) {
                                        return 'Please enter your name.';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 16),

                                  // Email Field
                                  TextFormField(
                                    controller: _emailController,
                                    keyboardType: TextInputType.emailAddress,
                                    textInputAction: TextInputAction.next,
                                    style: const TextStyle(color: AppTheme.darkTextPrimary),
                                    decoration: const InputDecoration(
                                      labelText: 'Email Address',
                                      prefixIcon: Icon(Icons.email_outlined, size: 20),
                                    ),
                                    validator: (value) {
                                      if (value == null || value.trim().isEmpty) {
                                        return 'Please enter your email.';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 16),

                                  // Password Field
                                  TextFormField(
                                    controller: _passwordController,
                                    obscureText: true,
                                    style: const TextStyle(color: AppTheme.darkTextPrimary),
                                    decoration: const InputDecoration(
                                      labelText: 'Password',
                                      prefixIcon: Icon(Icons.lock_outline_rounded, size: 20),
                                    ),
                                    validator: (value) {
                                      if (value == null || value.trim().length < 6) {
                                        return 'Password must be at least 6 characters.';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 24),

                                  // Submit Button
                                  auth.isLoading
                                      ? const Center(child: CircularProgressIndicator())
                                      : FilledButton(
                                          onPressed: _submitRegister,
                                          style: FilledButton.styleFrom(
                                            backgroundColor: AppTheme.primaryColor,
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                          ),
                                          child: const Text('Create Workspace'),
                                        ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Redirect to Login
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          "Already have an account?",
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: AppTheme.darkTextSecondary,
                          ),
                        ),
                        TextButton(
                          onPressed: () => context.go(AppRoutes.login),
                          child: const Text(
                            'Sign In',
                            style: TextStyle(
                              color: AppTheme.accentColor,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------
// 4. Forgot Password Screen
// ---------------------------------------------------------
class _ForgotPasswordScreen extends StatefulWidget {
  const _ForgotPasswordScreen();

  @override
  State<_ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<_ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _isSending = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submitReset() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSending = true);
    final auth = context.read<AuthProvider>();

    try {
      await auth.resetPassword(_emailController.text.trim());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Password reset instructions sent. Check your inbox!'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        context.go(AppRoutes.login);
      }
    } catch (e) {
      if (mounted) {
        _showErrorSnackBar(context, e);
      }
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: AppGradients.background,
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.bolt_rounded, color: AppTheme.accentColor, size: 36),
                        const SizedBox(width: 8),
                        Text(
                          'LifeOS',
                          style: theme.textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: AppTheme.darkTextPrimary,
                            letterSpacing: -1,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),

                    ClipRRect(
                      borderRadius: BorderRadius.circular(24),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 16.0, sigmaY: 16.0),
                        child: Container(
                          decoration: BoxDecoration(
                            color: AppTheme.darkCardColor.withValues(alpha: 0.65),
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(
                              color: AppTheme.darkTextSecondary.withValues(alpha: 0.1),
                              width: 1.5,
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(28.0),
                            child: Form(
                              key: _formKey,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Text(
                                    'Recover Password',
                                    style: theme.textTheme.titleLarge?.copyWith(
                                      color: AppTheme.darkTextPrimary,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Enter your email to request recovery link.',
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color: AppTheme.darkTextSecondary,
                                    ),
                                  ),
                                  const SizedBox(height: 24),

                                  // Email Input
                                  TextFormField(
                                    controller: _emailController,
                                    keyboardType: TextInputType.emailAddress,
                                    style: const TextStyle(color: AppTheme.darkTextPrimary),
                                    decoration: const InputDecoration(
                                      labelText: 'Email Address',
                                      prefixIcon: Icon(Icons.email_outlined, size: 20),
                                    ),
                                    validator: (value) {
                                      if (value == null || value.trim().isEmpty) {
                                        return 'Please enter your email.';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 24),

                                  // Submit Button
                                  _isSending
                                      ? const Center(child: CircularProgressIndicator())
                                      : FilledButton(
                                          onPressed: _submitReset,
                                          style: FilledButton.styleFrom(
                                            backgroundColor: AppTheme.primaryColor,
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                          ),
                                          child: const Text('Send Reset Instructions'),
                                        ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Redirect back to Login
                    TextButton.icon(
                      onPressed: () => context.go(AppRoutes.login),
                      icon: const Icon(Icons.arrow_back_rounded, size: 16, color: AppTheme.accentColor),
                      label: const Text(
                        'Back to login',
                        style: TextStyle(
                          color: AppTheme.accentColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------
// 5. Polished Selection Shell Navigation
// ---------------------------------------------------------
class _MainShell extends StatelessWidget {
  const _MainShell({required this.currentLocation, required this.child});

  final String currentLocation;
  final Widget child;

  static const List<_NavItem> _items = [
    _NavItem(
      route: AppRoutes.dashboard,
      label: 'Home',
      icon: Icons.home_outlined,
      selectedIcon: Icons.home_rounded,
    ),
    _NavItem(
      route: AppRoutes.college,
      label: 'College',
      icon: Icons.school_outlined,
      selectedIcon: Icons.school_rounded,
    ),
    _NavItem(
      route: AppRoutes.govExam,
      label: 'Study',
      icon: Icons.local_fire_department_outlined,
      selectedIcon: Icons.local_fire_department_rounded,
    ),
    _NavItem(
      route: AppRoutes.planner,
      label: 'Tasks',
      icon: Icons.check_box_outlined,
      selectedIcon: Icons.check_box_rounded,
    ),
    _NavItem(
      route: AppRoutes.settings,
      label: 'Profile',
      icon: Icons.person_outline_rounded,
      selectedIcon: Icons.person_rounded,
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
        destinations: _items.map((item) {
          final isSelected = currentLocation == item.route;
          return NavigationDestination(
            icon: Icon(isSelected ? item.selectedIcon : item.icon),
            label: item.label,
          );
        }).toList(),
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
    required this.selectedIcon,
  });

  final String route;
  final String label;
  final IconData icon;
  final IconData selectedIcon;
}
