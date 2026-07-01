import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  AppTheme._();

  // Brand Colors
  static const Color primaryColor = Color(0xFF6366F1);
  static const Color secondaryColor = Color(0xFF8B5CF6);
  static const Color accentColor = Color(0xFF06B6D4);
  static const Color successColor = Color(0xFF10B981);
  static const Color warningColor = Color(0xFFF59E0B);
  static const Color errorColor = Color(0xFFEF4444);
  static const Color infoColor = Color(0xFF3B82F6);

  // Light Theme Colors
  static const Color lightBackground = Color(0xFFF8FAFC);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightCardColor = Color(0xFFFFFFFF);

  // Dark Theme Colors
  static const Color darkBackground = Color(0xFF0F172A);
  static const Color darkSurface = Color(0xFF1E293B);
  static const Color darkCardColor = Color(0xFF1E293B);

  static ThemeData get lightTheme {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: primaryColor,
      brightness: Brightness.light,
      primary: primaryColor,
      secondary: secondaryColor,
      surface: lightSurface,
      error: errorColor,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: lightBackground,
      textTheme: _buildTextTheme(Colors.black87),
      cardTheme: _buildCardTheme(lightCardColor),
      appBarTheme: _buildAppBarTheme(lightBackground, Colors.black87),
      bottomNavigationBarTheme: _buildBottomNavTheme(lightSurface),
      inputDecorationTheme: _buildInputTheme(colorScheme),
      elevatedButtonTheme: _buildElevatedButtonTheme(),
      filledButtonTheme: _buildFilledButtonTheme(),
      outlinedButtonTheme: _buildOutlinedButtonTheme(colorScheme),
      chipTheme: _buildChipTheme(),
      dividerTheme: const DividerThemeData(
        color: Color(0xFFE2E8F0),
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
      secondary: secondaryColor,
      surface: darkSurface,
      error: errorColor,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: darkBackground,
      textTheme: _buildTextTheme(Colors.white),
      cardTheme: _buildCardTheme(darkCardColor),
      appBarTheme: _buildAppBarTheme(darkBackground, Colors.white),
      bottomNavigationBarTheme: _buildBottomNavTheme(darkSurface),
      inputDecorationTheme: _buildInputTheme(colorScheme),
      elevatedButtonTheme: _buildElevatedButtonTheme(),
      filledButtonTheme: _buildFilledButtonTheme(),
      outlinedButtonTheme: _buildOutlinedButtonTheme(colorScheme),
      chipTheme: _buildChipTheme(),
      dividerTheme: const DividerThemeData(
        color: Color(0xFF334155),
        thickness: 1,
      ),
      navigationBarTheme: _buildNavBarTheme(colorScheme, darkSurface),
    );
  }

  static TextTheme _buildTextTheme(Color baseColor) {
    return GoogleFonts.interTextTheme(
      TextTheme(
        displayLarge: TextStyle(
          fontSize: 57,
          fontWeight: FontWeight.w700,
          color: baseColor,
        ),
        displayMedium: TextStyle(
          fontSize: 45,
          fontWeight: FontWeight.w700,
          color: baseColor,
        ),
        displaySmall: TextStyle(
          fontSize: 36,
          fontWeight: FontWeight.w600,
          color: baseColor,
        ),
        headlineLarge: TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.w600,
          color: baseColor,
        ),
        headlineMedium: TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.w600,
          color: baseColor,
        ),
        headlineSmall: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w600,
          color: baseColor,
        ),
        titleLarge: TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w600,
          color: baseColor,
        ),
        titleMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w500,
          color: baseColor,
        ),
        titleSmall: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: baseColor,
        ),
        bodyLarge: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w400,
          color: baseColor,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w400,
          color: baseColor,
        ),
        bodySmall: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w400,
          color: baseColor.withValues(alpha: 0.7),
        ),
        labelLarge: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: baseColor,
        ),
        labelMedium: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: baseColor,
        ),
        labelSmall: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: baseColor.withValues(alpha: 0.7),
        ),
      ),
    );
  }

  static CardThemeData _buildCardTheme(Color cardColor) {
    return CardThemeData(
      color: cardColor,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      margin: EdgeInsets.zero,
    );
  }

  static AppBarTheme _buildAppBarTheme(
    Color backgroundColor,
    Color foregroundColor,
  ) {
    return AppBarTheme(
      backgroundColor: backgroundColor,
      foregroundColor: foregroundColor,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: GoogleFonts.inter(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: foregroundColor,
      ),
    );
  }

  static BottomNavigationBarThemeData _buildBottomNavTheme(
    Color backgroundColor,
  ) {
    return BottomNavigationBarThemeData(
      backgroundColor: backgroundColor,
      elevation: 0,
      selectedItemColor: primaryColor,
      unselectedItemColor: Colors.grey,
      type: BottomNavigationBarType.fixed,
    );
  }

  static InputDecorationTheme _buildInputTheme(ColorScheme colorScheme) {
    return InputDecorationTheme(
      filled: true,
      fillColor: colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: colorScheme.outlineVariant),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: colorScheme.primary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: colorScheme.error),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
  }

  static ElevatedButtonThemeData _buildElevatedButtonTheme() {
    return ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 0,
        textStyle: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    );
  }

  static FilledButtonThemeData _buildFilledButtonTheme() {
    return FilledButtonThemeData(
      style: FilledButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    );
  }

  static OutlinedButtonThemeData _buildOutlinedButtonTheme(
    ColorScheme colorScheme,
  ) {
    return OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        side: BorderSide(color: colorScheme.primary),
        textStyle: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    );
  }

  static ChipThemeData _buildChipTheme() {
    return ChipThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
    );
  }

  static NavigationBarThemeData _buildNavBarTheme(
    ColorScheme colorScheme,
    Color backgroundColor,
  ) {
    return NavigationBarThemeData(
      backgroundColor: backgroundColor,
      elevation: 0,
      indicatorColor: colorScheme.primary.withValues(alpha: 0.15),
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      height: 70,
    );
  }
}

class AppGradients {
  AppGradients._();

  static const LinearGradient primary = LinearGradient(
    colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient success = LinearGradient(
    colors: [Color(0xFF10B981), Color(0xFF059669)],
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

  static const LinearGradient info = LinearGradient(
    colors: [Color(0xFF3B82F6), Color(0xFF2563EB)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient cyan = LinearGradient(
    colors: [Color(0xFF06B6D4), Color(0xFF0891B2)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
