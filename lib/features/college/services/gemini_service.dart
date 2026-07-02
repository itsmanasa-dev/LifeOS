import 'dart:convert';
import 'dart:math';
import 'package:image_picker/image_picker.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import '../models/timetable_model.dart';
import '../../../core/services/hive_service.dart';
import '../../../core/constants/app_constants.dart';

class GeminiService {
  static String getApiKey() {
    const envKey = String.fromEnvironment('GEMINI_API_KEY');
    if (envKey.isNotEmpty) return envKey;

    final storedKey = HiveService.instance.get(
      AppConstants.settingsBox,
      'gemini_api_key',
      defaultValue: '',
    ) as String;
    return storedKey;
  }

  static Future<void> saveApiKey(String key) async {
    await HiveService.instance.put(AppConstants.settingsBox, 'gemini_api_key', key);
  }

  static Future<List<TimetableEntry>> extractTimetable(XFile imageFile) async {
    final apiKey = getApiKey();
    if (apiKey.isEmpty) {
      throw Exception('Missing Gemini API Key.');
    }

    final model = GenerativeModel(
      model: 'gemini-2.5-flash',
      apiKey: apiKey,
      generationConfig: GenerationConfig(
        responseMimeType: 'application/json',
      ),
    );

    final imageBytes = await imageFile.readAsBytes();
    final mimeType = imageFile.mimeType ?? 'image/png';

    final prompt = TextPart('''
Analyze the uploaded college timetable image.
Extract all subject names and class schedule slots.
Format the output as a JSON object matching this structure EXACTLY:
{
  "schedule": [
    {
      "day": "Monday", 
      "startTime": "09:00",
      "endTime": "09:50",
      "subject": "DBMS",
      "type": "Theory", // must be "Theory" or "Lab"
      "room": "Room 401"
    }
  ]
}

Rules:
1. "day" must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.
2. "type" must be exactly: Theory or Lab.
3. Times must be HH:mm (24 hour format).
4. Return ONLY valid JSON. Do not include markdown code block formatting.
''');

    final response = await model.generateContent([
      Content.multi([
        prompt,
        DataPart(mimeType, imageBytes),
      ])
    ]);

    final jsonText = response.text;
    if (jsonText == null || jsonText.isEmpty) {
      throw Exception('Gemini Vision model returned empty response.');
    }

    String cleanJson = jsonText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replaceAll(RegExp(r'^```json\s*'), '');
      cleanJson = cleanJson.replaceAll(RegExp(r'\s*```$'), '');
    }

    final Map<String, dynamic> data = jsonDecode(cleanJson);
    final List<dynamic> schedule = data['schedule'] ?? [];

    final List<TimetableEntry> entries = [];
    final daysMap = {
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6,
      'sunday': 7,
    };

    for (final item in schedule) {
      final subject = item['subject'] as String? ?? 'Lecture Slot';
      final dayStr = (item['day'] as String? ?? 'Monday').toLowerCase();
      final day = daysMap[dayStr] ?? 1;
      final start = item['startTime'] as String? ?? '09:00';
      final end = item['endTime'] as String? ?? '09:50';
      final type = item['type'] as String? ?? 'Theory';
      final room = item['room'] as String?;

      final mappedType = type.toLowerCase() == 'lab' ? 'Lab' : 'Lecture';

      entries.add(
        TimetableEntry(
          id: 'ai-${DateTime.now().microsecondsSinceEpoch}-${Random().nextInt(10000)}',
          subjectName: subject,
          subjectColor: _getColorForSubject(subject),
          startTime: start,
          endTime: end,
          room: room,
          dayOfWeek: day,
          type: mappedType,
          lowConfidenceFields: const {},
        ),
      );
    }

    return entries;
  }

  static const List<String> _colors = [
    '#6366F1', '#8B5CF6', '#10B981', '#06B6D4', '#F59E0B', '#EF4444', '#3B82F6'
  ];

  static String _getColorForSubject(String subject) {
    final clean = subject.trim().toLowerCase();
    if (clean.isEmpty) return _colors[0];
    int hash = 0;
    for (int i = 0; i < clean.length; i++) {
      hash = clean.codeUnitAt(i) + ((hash << 5) - hash);
    }
    final index = hash.abs() % _colors.length;
    return _colors[index];
  }
}
