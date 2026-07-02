import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  AppTheme._();

  // Premium Brand Colors
  static const Color primaryColor = Color(0xFF4F46E5);
  static const Color accentColor = Color(0xFF06B6D4);
  static const Color successColor = Color(0xFF22C55E);
  static const Color warningColor = Color(0xFFF59E0B);
  static const Color errorColor = Color(0xFFEF4444);

  // Dark Theme Colors (Primary Mode)
  static const Color darkBackground = Color(0xFF0B1220);
  static const Color darkSurface = Color(0xFF111827);
  static const Color darkCardColor = Color(0xFF1B2433);
  static const Color darkTextPrimary = Color(0xFFF8FAFC);
  static const Color darkTextSecondary = Color(0xFF94A3B8);

  // Light Theme Colors (Clean Complement)
  static const Color lightBackground = Color(0xFFF8FAFC);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightCardColor = Color(0xFFF1F5F9);
  static const Color lightTextPrimary = Color(0xFF0F172A);
  static const Color lightTextSecondary = Color(0xFF475569);

  static ThemeData get lightTheme {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: primaryColor,
      brightness: Brightness.light,
      primary: primaryColor,
      secondary: accentColor,
      surface: lightSurface,
      error: errorColor,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: lightBackground,
      textTheme: _buildTextTheme(lightTextPrimary, lightTextSecondary),
      cardTheme: _buildCardTheme(lightCardColor),
      appBarTheme: _buildAppBarTheme(lightBackground, lightTextPrimary),
      bottomNavigationBarTheme: _buildBottomNavTheme(lightSurface),
      inputDecorationTheme: _buildInputTheme(colorScheme, lightTextPrimary, lightTextSecondary),
      elevatedButtonTheme: _buildElevatedButtonTheme(),
      filledButtonTheme: _buildFilledButtonTheme(),
      outlinedButtonTheme: _buildOutlinedButtonTheme(colorScheme),
      chipTheme: _buildChipTheme(),
      dialogTheme: _buildDialogTheme(lightSurface),
      dividerTheme: DividerThemeData(
        color: lightCardColor.withValues(alpha: 0.8),
        thickness: 1,
      ),
      navigationBarTheme: _buildNavBarTheme(colorScheme, lightSurface),
    );
  }

  static ThemeData get darkTheme {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: primaryColor,
      brightness: Brightness.dark,
      primary: primaryColor,
      secondary: accentColor,
      surface: darkSurface,
      error: errorColor,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: darkBackground,
      textTheme: _buildTextTheme(darkTextPrimary, darkTextSecondary),
      cardTheme: _buildCardTheme(darkCardColor),
      appBarTheme: _buildAppBarTheme(darkBackground, darkTextPrimary),
      bottomNavigationBarTheme: _buildBottomNavTheme(darkSurface),
      inputDecorationTheme: _buildInputTheme(colorScheme, darkTextPrimary, darkTextSecondary),
      elevatedButtonTheme: _buildElevatedButtonTheme(),
      filledButtonTheme: _buildFilledButtonTheme(),
      outlinedButtonTheme: _buildOutlinedButtonTheme(colorScheme),
      chipTheme: _buildChipTheme(),
      dialogTheme: _buildDialogTheme(darkSurface),
      dividerTheme: const DividerThemeData(
        color: Color(0xFF1E293B),
        thickness: 1,
      ),
      navigationBarTheme: _buildNavBarTheme(colorScheme, darkSurface),
    );
  }

  static TextTheme _buildTextTheme(Color primaryTextColor, Color secondaryTextColor) {
    return GoogleFonts.interTextTheme(
      TextTheme(
        displayLarge: TextStyle(fontSize: 57, fontWeight: FontWeight.w800, color: primaryTextColor),
        displayMedium: TextStyle(fontSize: 45, fontWeight: FontWeight.w800, color: primaryTextColor),
        displaySmall: TextStyle(fontSize: 36, fontWeight: FontWeight.w700, color: primaryTextColor),
        headlineLarge: TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: primaryTextColor),
        headlineMedium: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: primaryTextColor),
        headlineSmall: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: primaryTextColor),
        titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: primaryTextColor, letterSpacing: -0.5),
        titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: primaryTextColor),
        titleSmall: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: primaryTextColor),
        bodyLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: primaryTextColor, height: 1.5),
        bodyMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: secondaryTextColor, height: 1.4),
        bodySmall: TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: secondaryTextColor),
        labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: primaryTextColor),
        labelMedium: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: secondaryTextColor),
        labelSmall: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: secondaryTextColor),
      ),
    );
  }

  static CardThemeData _buildCardTheme(Color cardColor) {
    return CardThemeData(
      color: cardColor,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
      ),
      margin: EdgeInsets.zero,
    );
  }

  static DialogThemeData _buildDialogTheme(Color bgColor) {
    return DialogThemeData(
      backgroundColor: bgColor,
      elevation: 16,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
      ),
    );
  }

  static AppBarTheme _buildAppBarTheme(Color backgroundColor, Color foregroundColor) {
    return AppBarTheme(
      backgroundColor: backgroundColor,
      foregroundColor: foregroundColor,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: GoogleFonts.inter(
        fontSize: 20,
        fontWeight: FontWeight.w800,
        color: foregroundColor,
        letterSpacing: -0.5,
      ),
    );
  }

  static BottomNavigationBarThemeData _buildBottomNavTheme(Color backgroundColor) {
    return BottomNavigationBarThemeData(
      backgroundColor: backgroundColor,
      elevation: 0,
      selectedItemColor: primaryColor,
      unselectedItemColor: darkTextSecondary,
      type: BottomNavigationBarType.fixed,
    );
  }

  static InputDecorationTheme _buildInputTheme(
    ColorScheme colorScheme,
    Color textPrimary,
    Color textSecondary,
  ) {
    return InputDecorationTheme(
      filled: true,
      fillColor: darkSurface.withValues(alpha: 0.4),
      labelStyle: TextStyle(color: textSecondary, fontSize: 14, fontWeight: FontWeight.w500),
      hintStyle: TextStyle(color: textSecondary.withValues(alpha: 0.6), fontSize: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: BorderSide(color: colorScheme.outlineVariant.withValues(alpha: 0.3)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: BorderSide(color: colorScheme.outlineVariant.withValues(alpha: 0.3)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: primaryColor, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: errorColor, width: 1.5),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: errorColor, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
    );
  }

  static ElevatedButtonThemeData _buildElevatedButtonTheme() {
    return ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        elevation: 0,
        textStyle: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    );
  }

  static FilledButtonThemeData _buildFilledButtonTheme() {
    return FilledButtonThemeData(
      style: FilledButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        textStyle: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    );
  }

  static OutlinedButtonThemeData _buildOutlinedButtonTheme(ColorScheme colorScheme) {
    return OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        side: BorderSide(color: colorScheme.outline.withValues(alpha: 0.5)),
        textStyle: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    );
  }

  static ChipThemeData _buildChipTheme() {
    return ChipThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
    );
  }

  static NavigationBarThemeData _buildNavBarTheme(ColorScheme colorScheme, Color backgroundColor) {
    return NavigationBarThemeData(
      backgroundColor: backgroundColor,
      elevation: 0,
      indicatorColor: primaryColor.withValues(alpha: 0.15),
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      height: 72,
    );
  }
}

class AppGradients {
  AppGradients._();

  static const LinearGradient primary = LinearGradient(
    colors: [Color(0xFF4F46E5), Color(0xFF06B6D4)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient success = LinearGradient(
    colors: [Color(0xFF22C55E), Color(0xFF16A34A)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient warning = LinearGradient(
    colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient error = LinearGradient(
    colors: [Color(0xFFEF4444), Color(0xFFDC2626)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient background = LinearGradient(
    colors: [Color(0xFF0B1220), Color(0xFF111827)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}
