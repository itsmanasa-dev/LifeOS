import 'package:flutter/material.dart';
import '../core/constants/app_constants.dart';
import '../core/services/hive_service.dart';

class ThemeProvider extends ChangeNotifier {
  ThemeProvider() {
    _loadTheme();
  }

  ThemeMode _themeMode = ThemeMode.system;

  ThemeMode get themeMode => _themeMode;

  bool get isDarkMode {
    if (_themeMode == ThemeMode.system) {
      return WidgetsBinding.instance.platformDispatcher.platformBrightness == Brightness.dark;
    }
    return _themeMode == ThemeMode.dark;
  }

  void _loadTheme() {
    final savedTheme = HiveService.instance.get(
      AppConstants.settingsBox,
      AppConstants.themeKey,
      defaultValue: 'system',
    ) as String;

    _themeMode = _parseThemeMode(savedTheme);
    notifyListeners();
  }

  Future<void> toggleTheme(bool isDark) async {
    _themeMode = isDark ? ThemeMode.dark : ThemeMode.light;
    notifyListeners();
    await HiveService.instance.put(
      AppConstants.settingsBox,
      AppConstants.themeKey,
      isDark ? 'dark' : 'light',
    );
  }

  ThemeMode _parseThemeMode(String value) {
    switch (value) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      case 'system':
      default:
        return ThemeMode.system;
    }
  }
}
