import { createWorker } from 'tesseract.js';
// ocr.worker.ts will be imported inline via new Worker(new URL(...))
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import type { TimetableEntry } from '../types';

// Configure PDF.js Worker using local asset URL for offline use
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface ParsedTimetable {
  semester: string;
  slots: TimetableEntry[];
}

export interface OCRCell {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  confidence: number;
}

export interface ProcessProgress {
  stage: 'Uploading' | 'Preprocessing' | 'Detecting Table' | 'Reading Text' | 'Parsing Timetable' | 'Preparing Review';
  progress: number; // 0 to 100
  detail?: string;
}

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

const DAYS_MAP: Record<string, number> = {
  monday: 1, mon: 1,
  tuesday: 2, tue: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
  sunday: 7, sun: 7
};

const DAYS_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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

// OpenCV loading and image preprocessing offloaded to ocr.worker.ts

function build2DGrid(cells: OCRCell[]): (OCRCell | null)[][] {
  if (cells.length === 0) return [];

  // Compute average cell dimensions
  const avgWidth = cells.reduce((sum, c) => sum + c.width, 0) / cells.length;
  const avgHeight = cells.reduce((sum, c) => sum + c.height, 0) / cells.length;

  // 1. Group X coordinates to find column centers
  const xCenters: number[] = [];
  const sortedX = [...cells].sort((a, b) => (a.x + a.width / 2) - (b.x + b.width / 2));
  for (const cell of sortedX) {
    const cx = cell.x + cell.width / 2;
    let found = false;
    for (let i = 0; i < xCenters.length; i++) {
      if (Math.abs(cx - xCenters[i]) < avgWidth * 0.4) {
        xCenters[i] = (xCenters[i] + cx) / 2;
        found = true;
        break;
      }
    }
    if (!found) {
      xCenters.push(cx);
    }
  }
  xCenters.sort((a, b) => a - b);

  // 2. Group Y coordinates to find row centers
  const yCenters: number[] = [];
  const sortedY = [...cells].sort((a, b) => (a.y + a.height / 2) - (b.y + b.height / 2));
  for (const cell of sortedY) {
    const cy = cell.y + cell.height / 2;
    let found = false;
    for (let i = 0; i < yCenters.length; i++) {
      if (Math.abs(cy - yCenters[i]) < avgHeight * 0.4) {
        yCenters[i] = (yCenters[i] + cy) / 2;
        found = true;
        break;
      }
    }
    if (!found) {
      yCenters.push(cy);
    }
  }
  yCenters.sort((a, b) => a - b);

  // 3. Initialize grid
  const grid: (OCRCell | null)[][] = Array(yCenters.length)
    .fill(null)
    .map(() => Array(xCenters.length).fill(null));

  // 4. Place cells
  for (const cell of cells) {
    const cx = cell.x + cell.width / 2;
    const cy = cell.y + cell.height / 2;

    let colIdx = 0;
    let minDistX = Infinity;
    for (let i = 0; i < xCenters.length; i++) {
      const dist = Math.abs(cx - xCenters[i]);
      if (dist < minDistX) {
        minDistX = dist;
        colIdx = i;
      }
    }

    let rowIdx = 0;
    let minDistY = Infinity;
    for (let i = 0; i < yCenters.length; i++) {
      const dist = Math.abs(cy - yCenters[i]);
      if (dist < minDistY) {
        minDistY = dist;
        rowIdx = i;
      }
    }

    grid[rowIdx][colIdx] = cell;
  }

  return grid;
}

function parseTimeSlot(text: string, fallbackId: string): { startTime: string; endTime: string } {
  const timeRangeRegex = /\b(\d{1,2})[:.](\d{2})\s*(am|pm)?\s*(?:-|to|until)\s*(\d{1,2})[:.](\d{2})\s*(am|pm)?\b/i;
  const timeSimpleRangeRegex = /\b(\d{1,2})\s*(am|pm)?\s*(?:-|to)\s*(\d{1,2})\s*(am|pm)?\b/i;

  const match = text.match(timeRangeRegex);
  if (match) {
    const startH = match[1];
    const startM = match[2];
    const startAmpm = match[3];
    const endH = match[4];
    const endM = match[5];
    const endAmpm = match[6];
    
    return {
      startTime: standardizeTime(startH, startM, startAmpm),
      endTime: standardizeTime(endH, endM, endAmpm || startAmpm)
    };
  }

  const matchSimple = text.match(timeSimpleRangeRegex);
  if (matchSimple) {
    const startH = matchSimple[1];
    const startAmpm = matchSimple[2];
    const endH = matchSimple[3];
    const endAmpm = matchSimple[4];

    return {
      startTime: standardizeTime(startH, '00', startAmpm),
      endTime: standardizeTime(endH, '00', endAmpm || startAmpm)
    };
  }

  // Use fallback based on index
  const matchIdx = fallbackId.match(/\d+/);
  const idx = matchIdx ? parseInt(matchIdx[0], 10) : 1;
  const fallbacks = [
    { startTime: '09:00', endTime: '09:50' },
    { startTime: '10:00', endTime: '10:50' },
    { startTime: '11:00', endTime: '11:50' },
    { startTime: '12:00', endTime: '12:50' },
    { startTime: '13:00', endTime: '13:50' },
    { startTime: '14:00', endTime: '14:50' },
    { startTime: '15:00', endTime: '15:50' },
    { startTime: '16:00', endTime: '16:50' },
  ];
  return fallbacks[(idx - 1) % fallbacks.length];
}

function parseCellText(text: string): { subjectName: string; type: 'Lecture' | 'Lab'; room?: string; teacher?: string } {
  if (!text) return { subjectName: '', type: 'Lecture' };

  let type: 'Lecture' | 'Lab' = 'Lecture';
  if (/lab|practical|p-|\b(p|prac|l)\b/i.test(text)) {
    type = 'Lab';
  }

  // Room matching (e.g. Room 402, R-102, Lab 3, L-3, LT-2)
  let room: string | undefined;
  const roomMatch = text.match(/\b(?:room|r|lab|hall|lh|class|lt)\s*[-:]?\s*([a-zA-Z\d-]+)\b/i);
  if (roomMatch) {
    room = roomMatch[0];
  } else {
    const codeMatch = text.match(/\b([A-Z]{1,3}\d{3}[A-Z]?|\d{3})\b/i);
    if (codeMatch) {
      room = codeMatch[1];
    }
  }

  // Teacher matching
  let teacher: string | undefined;
  const teacherMatch = text.match(/\b(?:dr|prof|mr|ms|mrs)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/i);
  if (teacherMatch) {
    teacher = teacherMatch[0];
  } else {
    // End initials of 2-3 characters (e.g. "DBMS JS", ignore common keywords)
    const initialsMatch = text.match(/\b([A-Z]{2,3})\b/);
    if (initialsMatch) {
      const val = initialsMatch[1];
      if (!/MON|TUE|WED|THU|FRI|SAT|SUN|LAB|L|T|P|R|LH|LT/i.test(val)) {
        teacher = val;
      }
    }
  }

  // Clean the subject name
  let subjectName = text;
  
  // Remove days, times, room, teacher and common descriptors
  subjectName = subjectName.replace(/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi, '');
  subjectName = subjectName.replace(/\b\d{1,2}[:.]\d{2}\s*(am|pm)?\s*(?:-|to|until)\s*\d{1,2}[:.]\d{2}\s*(am|pm)?\b/gi, '');
  subjectName = subjectName.replace(/\b\d{1,2}\s*(am|pm)?\s*(?:-|to)\s*\d{1,2}\s*(am|pm)?\b/gi, '');
  
  if (room) {
    subjectName = subjectName.replace(room, '');
    subjectName = subjectName.replace(/\b(?:room|r|hall|lh|class|lt)\b/gi, '');
  }
  if (teacher) {
    subjectName = subjectName.replace(teacher, '');
    subjectName = subjectName.replace(/\b(?:dr|prof|mr|ms|mrs)\b/gi, '');
  }

  subjectName = subjectName.replace(/\b(?:theory|lecture|lab|practical|class|session)\b/gi, '');
  subjectName = subjectName.replace(/[()[\],.:-]/g, ' ');
  subjectName = subjectName.trim().replace(/\s+/g, ' ');

  if (!subjectName) {
    subjectName = type === 'Lab' ? 'Lab Session' : 'Lecture Slot';
  }

  return { subjectName, type, room, teacher };
}

function isBreakOrEmpty(text: string): boolean {
  const cleaned = text.trim().toLowerCase();
  if (cleaned.length < 2) return true;
  if (/^(lunch|break|recess|interval|tea|free|empty|no class)$/i.test(cleaned)) return true;
  return false;
}

function parseOCRGrid(cells: OCRCell[]): TimetableEntry[] {
  const grid = build2DGrid(cells);
  if (grid.length === 0) return [];

  const numRows = grid.length;
  const numCols = grid[0].length;

  // 1. Detect dimensions
  let rowDaysMatches = 0;
  for (let c = 0; c < numCols; c++) {
    const text = grid[0][c]?.text.toLowerCase() || '';
    if (/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/.test(text)) {
      rowDaysMatches++;
    }
  }

  let colDaysMatches = 0;
  for (let r = 0; r < numRows; r++) {
    const text = grid[r][0]?.text.toLowerCase() || '';
    if (/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/.test(text)) {
      colDaysMatches++;
    }
  }

  const entries: TimetableEntry[] = [];
  const daysAreRows = colDaysMatches >= rowDaysMatches;

  if (daysAreRows) {
    const timeSlots: { startTime: string; endTime: string }[] = [];
    for (let c = 1; c < numCols; c++) {
      timeSlots[c] = parseTimeSlot(grid[0][c]?.text || '', `col-${c}`);
    }

    for (let r = 1; r < numRows; r++) {
      const dayText = grid[r][0]?.text.toLowerCase() || '';
      const dayMatch = dayText.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/);
      if (!dayMatch) continue;

      const dayOfWeek = DAYS_MAP[dayMatch[1]] || 1;

      for (let c = 1; c < numCols; c++) {
        const cell = grid[r][c];
        if (!cell || !cell.text || isBreakOrEmpty(cell.text)) continue;

        const time = timeSlots[c] || { startTime: '09:00', endTime: '09:50' };
        const parsed = parseCellText(cell.text);

        const lowConfidenceFields: string[] = [];
        if (cell.confidence < 80) {
          lowConfidenceFields.push('subjectName');
        }

        entries.push({
          id: `ocr-${Date.now()}-${r}-${c}-${Math.floor(Math.random() * 1000)}`,
          subjectName: parsed.subjectName,
          subjectColor: getColorForSubject(parsed.subjectName),
          startTime: time.startTime,
          endTime: time.endTime,
          room: parsed.room,
          teacher: parsed.teacher,
          dayOfWeek,
          day: DAYS_NAMES[dayOfWeek],
          type: parsed.type,
          confidence: cell.confidence,
          lowConfidenceFields
        });
      }
    }
  } else {
    const colDays: number[] = [];
    for (let c = 1; c < numCols; c++) {
      const dayMatch = (grid[0][c]?.text || '').toLowerCase().match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/);
      colDays[c] = dayMatch ? (DAYS_MAP[dayMatch[1]] || 1) : 1;
    }

    for (let r = 1; r < numRows; r++) {
      const time = parseTimeSlot(grid[r][0]?.text || '', `row-${r}`);

      for (let c = 1; c < numCols; c++) {
        const cell = grid[r][c];
        if (!cell || !cell.text || isBreakOrEmpty(cell.text)) continue;

        const dayOfWeek = colDays[c] || 1;
        const parsed = parseCellText(cell.text);

        const lowConfidenceFields: string[] = [];
        if (cell.confidence < 80) {
          lowConfidenceFields.push('subjectName');
        }

        entries.push({
          id: `ocr-${Date.now()}-${r}-${c}-${Math.floor(Math.random() * 1000)}`,
          subjectName: parsed.subjectName,
          subjectColor: getColorForSubject(parsed.subjectName),
          startTime: time.startTime,
          endTime: time.endTime,
          room: parsed.room,
          teacher: parsed.teacher,
          dayOfWeek,
          day: DAYS_NAMES[dayOfWeek],
          type: parsed.type,
          confidence: cell.confidence,
          lowConfidenceFields
        });
      }
    }
  }

  // Fallback to row/col cell scans if empty
  if (entries.length === 0) {
    let activeDay = 1;
    let activeTime = { startTime: '09:00', endTime: '09:50' };

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];
        if (!cell || !cell.text) continue;

        const dayMatch = cell.text.toLowerCase().match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/);
        if (dayMatch) {
          activeDay = DAYS_MAP[dayMatch[1]] || 1;
          continue;
        }

        const isTime = cell.text.match(/\b\d{1,2}[:.]\d{2}\s*(am|pm)?\s*(?:-|to|until)\s*\d{1,2}[:.]\d{2}\s*(am|pm)?\b/i);
        if (isTime) {
          activeTime = parseTimeSlot(cell.text, `cell-${r}-${c}`);
          continue;
        }

        if (isBreakOrEmpty(cell.text)) continue;

        const parsed = parseCellText(cell.text);
        const lowConfidenceFields: string[] = [];
        if (cell.confidence < 80) {
          lowConfidenceFields.push('subjectName');
        }

        entries.push({
          id: `ocr-${Date.now()}-${r}-${c}-${Math.floor(Math.random() * 1000)}`,
          subjectName: parsed.subjectName,
          subjectColor: getColorForSubject(parsed.subjectName),
          startTime: activeTime.startTime,
          endTime: activeTime.endTime,
          room: parsed.room,
          teacher: parsed.teacher,
          dayOfWeek: activeDay,
          day: DAYS_NAMES[activeDay],
          type: parsed.type,
          confidence: cell.confidence,
          lowConfidenceFields
        });
      }
    }
  }

  return entries;
}

export const ocrService = {
  /**
   * Convert PDF page 1 to an Image Blob using PDF.js
   */
  async convertPDFToImage(file: File): Promise<Blob> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      if (pdf.numPages === 0) {
        throw new Error('PDF has no pages');
      }
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to get 2d context for PDF rendering');
      }
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert PDF canvas to image blob'));
          }
        }, 'image/png');
      });
    } catch (err: any) {
      console.error('PDF image conversion error:', err);
      throw new Error(`Failed to process PDF file: ${err.message || err}`);
    }
  },

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
   * Offline-ready, client-side OpenCV.js + Tesseract.js timetable layout parser
   */
  async extractTimetableFromImage(
    file: File,
    onProgress?: (progress: ProcessProgress) => void
  ): Promise<ParsedTimetable> {
    return new Promise((resolve, reject) => {
      if (onProgress) onProgress({ stage: 'Uploading', progress: 50 });
      if (onProgress) onProgress({ stage: 'Preprocessing', progress: 10 });

      const worker = new Worker('/ocr.worker.js', { type: 'classic' });

      worker.onmessage = async (e: MessageEvent) => {
        const { type, data, error } = e.data;

        if (type === 'progress') {
          if (onProgress) onProgress(data);
        } else if (type === 'error') {
          worker.terminate();
          reject(new Error(error));
        } else if (type === 'success') {
          worker.terminate();
          try {
            const { cells, processedBitmap } = data;

            if (onProgress) onProgress({ stage: 'Reading Text', progress: 30, detail: 'Recognizing full table text...' });

            // Create temporary canvas to draw the preprocessed image for Tesseract
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = processedBitmap.width;
            tempCanvas.height = processedBitmap.height;
            const ctx = tempCanvas.getContext('2d');
            if (!ctx) {
              throw new Error('Failed to get 2d context for Tesseract canvas');
            }
            ctx.drawImage(processedBitmap, 0, 0);

            // Clean up the processedBitmap
            processedBitmap.close();

            const tesseractWorker = await getTesseractWorker();
            const result = await tesseractWorker.recognize(tempCanvas);
            const words = result.data.words || [];

            if (onProgress) onProgress({ stage: 'Reading Text', progress: 80, detail: 'Mapping text to grid cells...' });

            // Initialize text/confidence for each cell
            const parsedCells: OCRCell[] = cells.map((cell: any) => ({
              x: cell.x,
              y: cell.y,
              width: cell.width,
              height: cell.height,
              text: '',
              confidence: 100,
              wordConfs: [] as number[],
              wordTexts: [] as { text: string, x: number }[]
            })) as any;

            // Map each word to the cell that contains its center
            for (const word of words) {
              const text = word.text.trim();
              if (!text) continue;

              const cx = (word.bbox.x0 + word.bbox.x1) / 2;
              const cy = (word.bbox.y0 + word.bbox.y1) / 2;

              // Find the cell containing the center of this word
              for (const cell of parsedCells as any) {
                if (cx >= cell.x && cx <= cell.x + cell.width &&
                    cy >= cell.y && cy <= cell.y + cell.height) {
                  cell.wordTexts.push({ text, x: word.bbox.x0 });
                  cell.wordConfs.push(word.confidence);
                  break;
                }
              }
            }

            // Finalize text and confidence for each cell
            for (const cell of parsedCells as any) {
              cell.wordTexts.sort((a: any, b: any) => a.x - b.x);
              cell.text = cell.wordTexts.map((w: any) => w.text).join(' ');

              if (cell.wordConfs.length > 0) {
                cell.confidence = Math.round(cell.wordConfs.reduce((sum: number, c: number) => sum + c, 0) / cell.wordConfs.length);
              } else {
                cell.confidence = 100; // Empty cells default to 100%
              }

              delete cell.wordTexts;
              delete cell.wordConfs;
            }

            if (onProgress) onProgress({ stage: 'Parsing Timetable', progress: 50 });

            // Run Timetable Parser
            const slots = parseOCRGrid(parsedCells);

            // Detect semester from cells
            let semester = 'Semester 1';
            const semRegex = /(?:semester|sem|term|yr|year)\s*[-:]?\s*([i|v|x\d]+)/i;
            for (const cell of parsedCells) {
              const match = cell.text.match(semRegex);
              if (match) {
                semester = `Semester ${match[1].toUpperCase()}`;
                break;
              }
            }

            if (onProgress) onProgress({ stage: 'Preparing Review', progress: 100 });
            resolve({ slots, semester });
          } catch (err: any) {
            reject(new Error(`Failed to parse preprocessed image: ${err.message || err}`));
          }
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        reject(new Error(`Worker error: ${err.message}`));
      };

      // Post the file to the worker
      worker.postMessage({ file });
    });
  },

  /**
   * Parses single block of extracted text (e.g. from PDF)
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
    let currentDay = 1;
    const timeRegex = /\b(\d{1,2})[:.](\d{2})\s*(am|pm)?\s*(?:-|to|until)\s*(\d{1,2})[:.](\d{2})\s*(am|pm)?\b/i;

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Check if line updates day
      for (const [dayName, dayNum] of Object.entries(DAYS_MAP)) {
        if (new RegExp(`^${dayName}\\b`, 'i').test(trimmed) || new RegExp(`\\b${dayName}\\b`, 'i').test(trimmed)) {
          if (trimmed.length < 15) {
            currentDay = dayNum;
          }
        }
      }

      // Check if line contains a time slot
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

        const parsed = parseCellText(trimmed);

        slots.push({
          id: `ocr-${Date.now()}-${lineIdx}-${Math.floor(Math.random() * 1000)}`,
          subjectName: parsed.subjectName,
          subjectColor: getColorForSubject(parsed.subjectName),
          startTime,
          endTime,
          room: parsed.room,
          teacher: parsed.teacher,
          dayOfWeek: slotDay,
          day: DAYS_NAMES[slotDay],
          type: parsed.type,
          confidence: 100, // digital PDF has 100% confidence
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
export { getColorForSubject };
