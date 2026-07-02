import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/services/hive_service.dart';

class SyllabusItem {
  final String name;
  final double progress; // 0.0 to 1.0
  final String colorHex;

  const SyllabusItem({
    required this.name,
    required this.progress,
    required this.colorHex,
  });

  SyllabusItem copyWith({String? name, double? progress, String? colorHex}) {
    return SyllabusItem(
      name: name ?? this.name,
      progress: progress ?? this.progress,
      colorHex: colorHex ?? this.colorHex,
    );
  }

  factory SyllabusItem.fromJson(Map<String, dynamic> json) {
    return SyllabusItem(
      name: json['name'] as String,
      progress: (json['progress'] as num).toDouble(),
      colorHex: json['colorHex'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'progress': progress,
      'colorHex': colorHex,
    };
  }
}

class FocusProvider extends ChangeNotifier {
  FocusProvider() {
    _loadFromHive();
  }

  int _streak = 42;
  int _targetDurationMinutes = 45;
  int _secondsRemaining = 45 * 60;
  bool _isRunning = false;
  Timer? _timer;

  List<SyllabusItem> _syllabus = [];

  int get streak => _streak;
  int get targetDurationMinutes => _targetDurationMinutes;
  int get secondsRemaining => _secondsRemaining;
  bool get isRunning => _isRunning;
  List<SyllabusItem> get syllabus => List.unmodifiable(_syllabus);

  double get progressFraction {
    final totalSeconds = _targetDurationMinutes * 60;
    if (totalSeconds == 0) return 0.0;
    return (_secondsRemaining / totalSeconds).clamp(0.0, 1.0);
  }

  String get timerString {
    final minutes = (_secondsRemaining ~/ 60).toString().padLeft(2, '0');
    final seconds = (_secondsRemaining % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  void _loadFromHive() {
    _streak = HiveService.instance.get(
      AppConstants.govExamBox,
      'streak',
      defaultValue: 42,
    ) as int;

    _targetDurationMinutes = HiveService.instance.get(
      AppConstants.govExamBox,
      'target_minutes',
      defaultValue: 45,
    ) as int;

    _secondsRemaining = _targetDurationMinutes * 60;

    final rawSyllabus = HiveService.instance.get(
      AppConstants.govExamBox,
      'syllabus_list',
    );

    if (rawSyllabus == null) {
      _syllabus = [
        const SyllabusItem(name: 'History & Culture', progress: 0.78, colorHex: '#6366F1'),
        const SyllabusItem(name: 'Quantitative Aptitude', progress: 0.45, colorHex: '#10B981'),
        const SyllabusItem(name: 'Polity & Governance', progress: 0.92, colorHex: '#F59E0B'),
      ];
      _saveSyllabusToHive();
    } else {
      _syllabus = (rawSyllabus as List)
          .map((e) => SyllabusItem.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }
    notifyListeners();
  }

  void setDuration(int minutes) {
    if (_isRunning) return;
    _targetDurationMinutes = minutes;
    _secondsRemaining = minutes * 60;
    notifyListeners();
    HiveService.instance.put(AppConstants.govExamBox, 'target_minutes', minutes);
  }

  void startTimer() {
    if (_isRunning) return;
    _isRunning = true;
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining > 0) {
        _secondsRemaining--;
        notifyListeners();
      } else {
        _timer?.cancel();
        _isRunning = false;
        _secondsRemaining = _targetDurationMinutes * 60;
        _streak++;
        HiveService.instance.put(AppConstants.govExamBox, 'streak', _streak);
        notifyListeners();
      }
    });
    notifyListeners();
  }

  void pauseTimer() {
    if (!_isRunning) return;
    _timer?.cancel();
    _isRunning = false;
    notifyListeners();
  }

  void resetTimer() {
    _timer?.cancel();
    _isRunning = false;
    _secondsRemaining = _targetDurationMinutes * 60;
    notifyListeners();
  }

  Future<void> updateSyllabusProgress(String name, double progress) async {
    final index = _syllabus.indexWhere((element) => element.name == name);
    if (index >= 0) {
      _syllabus[index] = _syllabus[index].copyWith(progress: progress.clamp(0.0, 1.0));
      notifyListeners();
      await _saveSyllabusToHive();
    }
  }

  Future<void> _saveSyllabusToHive() async {
    final data = _syllabus.map((e) => e.toJson()).toList();
    await HiveService.instance.put(AppConstants.govExamBox, 'syllabus_list', data);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
