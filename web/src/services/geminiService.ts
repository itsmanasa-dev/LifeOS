import { GoogleGenerativeAI } from '@google/generative-ai';
import type { TimetableEntry } from '../types';

const COLORS = [
  '#6366F1', '#8B5CF6', '#10B981', '#06B6D4', '#F59E0B', '#EF4444', '#3B82F6'
];

const getColorForSubject = (subject: string): string => {
  const clean = subject.trim().toLowerCase();
  if (clean.length === 0) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index];
};

// Helper to convert File to generative part (base64)
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const geminiService = {
  getApiKey(): string {
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey) return envKey;
    return localStorage.getItem('gemini_api_key') || '';
  },

  saveApiKey(key: string): void {
    localStorage.setItem('gemini_api_key', key);
  },

  async extractTimetable(imageFile: File): Promise<TimetableEntry[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Missing Gemini API Key. Please configure it in settings.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const imagePart = await fileToGenerativePart(imageFile);

    const prompt = `
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
`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const jsonText = response.text();
    
    if (!jsonText) {
      throw new Error('Gemini Vision model returned empty response.');
    }

    let cleanJson = jsonText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    }

    const parsedData = JSON.parse(cleanJson);
    const schedule = parsedData.schedule || [];

    const daysMap: Record<string, number> = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 7,
    };

    const entries: TimetableEntry[] = schedule.map((item: any, idx: number) => {
      const subject = item.subject || 'Lecture Slot';
      const dayStr = (item.day || 'Monday').toLowerCase();
      const dayOfWeek = daysMap[dayStr] || 1;
      const startTime = item.startTime || '09:00';
      const endTime = item.endTime || '09:50';
      const type = item.type === 'Lab' ? 'Lab' : 'Lecture';
      const room = item.room || undefined;

      return {
        id: `ai-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        subjectName: subject,
        subjectColor: getColorForSubject(subject),
        startTime,
        endTime,
        room,
        dayOfWeek,
        type,
        lowConfidenceFields: [],
      };
    });

    return entries;
  },
};
export { getColorForSubject };
