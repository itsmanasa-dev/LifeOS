class AppConstants {
  // API
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api/v1',
  );

  // Hive boxes
  static const String userBox = 'user_box';
  static const String tasksBox = 'tasks_box';
  static const String habitsBox = 'habits_box';
  static const String habitLogsBox = 'habit_logs_box';
  static const String attendanceBox = 'attendance_box';
  static const String subjectsBox = 'subjects_box';
  static const String timetableBox = 'timetable_box';
  static const String studyProgressBox = 'study_progress_box';
  static const String settingsBox = 'settings_box';
  static const String authBox = 'auth_box';
  static const String govExamBox = 'govexam_box';
  static const String assignmentsBox = 'assignments_box';

  // Storage keys
  static const String tokenKey = 'auth_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userIdKey = 'user_id';
  static const String themeKey = 'theme_mode';
  static const String notificationsKey = 'notifications_enabled';

  // Pagination
  static const int defaultPageSize = 20;

  // Attendance
  static const double minAttendancePercent = 75.0;
  static const double safeAttendancePercent = 85.0;

  // Task priorities
  static const List<String> taskPriorities = [
    'low',
    'medium',
    'high',
    'urgent',
  ];

  // Habit types
  static const List<String> defaultHabits = [
    'Water',
    'Exercise',
    'Reading',
    'Coding',
    'Government Study',
    'Meditation',
  ];

  // Days of week
  static const List<String> daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  // Short days
  static const List<String> shortDays = [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
  ];

  // Months
  static const List<String> months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
}

class ApiEndpoints {
  // Auth
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String profile = '/auth/profile';
  static const String logout = '/auth/logout';
  static const String refreshToken = '/auth/refresh';

  // Tasks
  static const String tasks = '/tasks';
  static String taskById(String id) => '/tasks/$id';

  // Habits
  static const String habits = '/habits';
  static String habitById(String id) => '/habits/$id';
  static String habitLog(String id) => '/habits/$id/log';
  static const String habitLogs = '/habits/logs/today';

  // Attendance
  static const String attendance = '/attendance';
  static String attendanceBySubject(String subjectId) =>
      '/attendance/subject/$subjectId';
  static const String attendanceSummary = '/attendance/summary';

  // Subjects
  static const String subjects = '/subjects';
  static String subjectById(String id) => '/subjects/$id';

  // Timetable
  static const String timetable = '/timetable';

  // Study Progress
  static const String studyProgress = '/study-progress';
  static String studyProgressBySubject(String id) => '/study-progress/$id';

  // Assignments
  static const String assignments = '/assignments';
  static String assignmentById(String id) => '/assignments/$id';

  // Gov Exam Subjects
  static const String govExamSubjects = '/govexam/subjects';
  static String govExamSubjectById(String id) => '/govexam/subjects/$id';
  static String govExamProgress(String id) => '/govexam/subjects/$id/progress';

  // Dashboard
  static const String dashboardSummary = '/dashboard/summary';
}
