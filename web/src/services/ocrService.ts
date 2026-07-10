import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import type { TimetableEntry } from '../types';
import { getColorForSubject } from './geminiService';

// Configure PDF.js Worker using unpkg matching the package version with .mjs extension
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface ParsedTimetable {
  semester: string;
  slots: TimetableEntry[];
}

const DAYS_MAP: Record<string, number> = {
  monday: 1, mon: 1,
  tuesday: 2, tue: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
  sunday: 7, sun: 7
};

/**
 * Standardize matched time parts into HH:mm format
 */
function standardizeTime(hourStr: string, minStr: string, ampm?: string): string {
  let hour = parseInt(hourStr, 10);
  const min = parseInt(minStr, 10);
  
  if (ampm) {
    const lower = ampm.toLowerCase();
    if (lower === 'pm' && hour < 12) {
      hour += 12;
    } else if (lower === 'am' && hour === 12) {
      hour = 0;
    }
  }
  
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// Cached Tesseract worker for speed
let tesseractWorker: any = null;

async function getTesseractWorker() {
  if (!tesseractWorker) {
    tesseractWorker = await createWorker('eng', 1, {
      langPath: 'https://tessdata.projectnaptha.com/4.0.0_fast',
      cachePath: 'tesseract',
    });
  }
  return tesseractWorker;
}

export const ocrService = {
  /**
   * Extract text from PDF file using PDF.js
   */
  async extractTextFromPDF(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      return fullText;
    } catch (err: any) {
      console.error('PDF extraction error:', err);
      throw new Error(`Failed to extract text from PDF: ${err.message}`);
    }
  },

  /**
   * Extract text from image file using Tesseract.js (cached worker + fast tessdata)
   */
  async extractTextFromImage(file: File): Promise<string> {
    try {
      const worker = await getTesseractWorker();
      const result = await worker.recognize(file);
      return result.data.text;
    } catch (err: any) {
      console.error('Image OCR error:', err);
      throw new Error(`Failed to extract text from image: ${err.message}`);
    }
  },

  /**
   * Parse extracted timetable text into structured timetable slots and semester
   */
  parseTimetableText(text: string): ParsedTimetable {
    const lines = text.split('\n');
    let semester = 'Semester 1';
    const slots: TimetableEntry[] = [];
    
    // 1. Detect semester
    const semRegex = /(?:semester|sem|term|yr|year)\s*[-:]?\s*([i|v|x\d]+)/i;
    for (const line of lines) {
      const match = line.match(semRegex);
      if (match) {
        semester = `Semester ${match[1].toUpperCase()}`;
        break;
      }
    }

    // 2. Identify slots from lines
    let currentDay = 1; // Default to Monday
    
    // Time regex matching ranges: e.g. "09:00 - 09:50", "10am to 12pm", "1:00 PM - 2:00 PM"
    const timeRegex = /\b(\d{1,2})[:.](\d{2})\s*(am|pm)?\s*(?:-|to|until)\s*(\d{1,2})[:.](\d{2})\s*(am|pm)?\b/i;

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Check if line updates the current active day
      for (const [dayName, dayNum] of Object.entries(DAYS_MAP)) {
        if (new RegExp(`^${dayName}\\b`, 'i').test(trimmed) || new RegExp(`\\b${dayName}\\b`, 'i').test(trimmed)) {
          if (trimmed.length < 15) {
            currentDay = dayNum;
          }
        }
      }

      // Check if we can find a time range match
      const timeMatch = trimmed.match(timeRegex);
      if (timeMatch) {
        let slotDay = currentDay;
        for (const [dayName, dayNum] of Object.entries(DAYS_MAP)) {
          if (new RegExp(`\\b${dayName}\\b`, 'i').test(trimmed)) {
            slotDay = dayNum;
            break;
          }
        }

        const startH = timeMatch[1];
        const startM = timeMatch[2];
        const startAmpm = timeMatch[3];
        const endH = timeMatch[4];
        const endM = timeMatch[5];
        const endAmpm = timeMatch[6];

        const startTime = standardizeTime(startH, startM, startAmpm);
        const endTime = standardizeTime(endH, endM, endAmpm || startAmpm);

        const type: 'Lecture' | 'Lab' = /lab|practical|p-|\b(p)\b/i.test(trimmed) ? 'Lab' : 'Lecture';

        let room: string | undefined;
        const roomMatch = trimmed.match(/\b(?:room|r|lab|hall|lh|class|lt)\s*[-:]?\s*(\w+)\b/i);
        if (roomMatch) {
          room = roomMatch[1];
        } else {
          const codeMatch = trimmed.match(/\b([a-z]?\d{3}[a-z]?)\b/i);
          if (codeMatch) {
            room = codeMatch[1];
          }
        }

        let cleaned = trimmed
          .replace(timeRegex, '')
          .replace(/theory|lecture|lab|practical|class|session/gi, '')
          .replace(new RegExp(`\\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\\b`, 'gi'), '')
          .replace(/\b(?:room|r|hall|lh|class|lt)\s*[-:]?\s*\w+\b/gi, '')
          .replace(/[()[\],.:-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (room) {
          cleaned = cleaned.replace(new RegExp(`\\b${room}\\b`, 'gi'), '').trim();
        }

        const subjectName = cleaned || (type === 'Lab' ? 'Lab Session' : 'Lecture Slot');

        slots.push({
          id: `ocr-${Date.now()}-${lineIdx}-${Math.floor(Math.random() * 1000)}`,
          subjectName: subjectName,
          subjectColor: getColorForSubject(subjectName),
          startTime,
          endTime,
          room: room || undefined,
          dayOfWeek: slotDay,
          type,
          lowConfidenceFields: []
        });
      }
    });

    return {
      semester,
      slots
    };
  }
};
