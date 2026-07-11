import { createWorker } from 'tesseract.js';
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

// Global OpenCV.js load cache
let cvInstance: any = null;
let cvLoadingPromise: Promise<any> | null = null;

async function loadOpenCV(): Promise<any> {
  if (cvInstance) return cvInstance;
  if (cvLoadingPromise) return cvLoadingPromise;

  cvLoadingPromise = new Promise((resolve, reject) => {
    if ((window as any).cv) {
      cvInstance = (window as any).cv;
      resolve(cvInstance);
      return;
    }

    const script = document.createElement('script');
    script.src = '/opencv.js';
    script.async = true;
    script.onload = () => {
      const checkCV = () => {
        if ((window as any).cv && ((window as any).cv.Mat || (window as any).cv.onRuntimeInitialized)) {
          if ((window as any).cv.Mat) {
            cvInstance = (window as any).cv;
            resolve(cvInstance);
          } else {
            setTimeout(checkCV, 50);
          }
        } else {
          setTimeout(checkCV, 50);
        }
      };

      if ((window as any).cv && (window as any).cv.onRuntimeInitialized) {
        const prev = (window as any).cv.onRuntimeInitialized;
        (window as any).cv.onRuntimeInitialized = () => {
          prev?.();
          cvInstance = (window as any).cv;
          resolve(cvInstance);
        };
      } else {
        checkCV();
      }
    };
    script.onerror = (err) => {
      console.error('OpenCV load error:', err);
      reject(new Error('Failed to load OpenCV.js. Verify it exists in public/opencv.js'));
    };
    document.body.appendChild(script);
  });

  return cvLoadingPromise;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

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
    try {
      if (onProgress) onProgress({ stage: 'Uploading', progress: 50 });
      if (onProgress) onProgress({ stage: 'Preprocessing', progress: 10 });

      // Load OpenCV.js dynamically if not already available
      const cv = await loadOpenCV();
      const imgElement = await loadImage(file);

      // Create src Mat
      let src = cv.imread(imgElement);

      // 1. Grayscale
      let gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
      if (onProgress) onProgress({ stage: 'Preprocessing', progress: 30 });

      // 2. Reduce image noise (Gaussian Blur)
      let blurred = new cv.Mat();
      cv.GaussianBlur(gray, blurred, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT);
      if (onProgress) onProgress({ stage: 'Preprocessing', progress: 50 });

      // 3. Increase contrast (CLAHE)
      let contrast = new cv.Mat();
      let clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
      clahe.apply(blurred, contrast);
      clahe.delete();
      if (onProgress) onProgress({ stage: 'Preprocessing', progress: 70 });

      // 4. Adaptive Threshold
      let thresh = new cv.Mat();
      cv.adaptiveThreshold(contrast, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);
      if (onProgress) onProgress({ stage: 'Preprocessing', progress: 90 });

      // 5. Deskew (straighten image)
      let nonZero = new cv.Mat();
      cv.findNonZero(thresh, nonZero);
      let deskewedThresh = thresh.clone();
      let deskewedContrast = contrast.clone();
      
      let angle = 0;
      if (nonZero.rows > 0) {
        let rotatedRect = cv.minAreaRect(nonZero);
        angle = rotatedRect.angle;
        if (angle < -45) {
          angle = angle + 90;
        } else if (angle > 45) {
          angle = angle - 90;
        }
        
        if (Math.abs(angle) > 0.5 && Math.abs(angle) < 45) {
          let center = new cv.Point(thresh.cols / 2, thresh.rows / 2);
          let M = cv.getRotationMatrix2D(center, angle, 1.0);
          let dsize = new cv.Size(thresh.cols, thresh.rows);
          
          cv.warpAffine(thresh, deskewedThresh, M, dsize, cv.INTER_CUBIC, cv.BORDER_REPLICATE, new cv.Scalar());
          cv.warpAffine(contrast, deskewedContrast, M, dsize, cv.INTER_CUBIC, cv.BORDER_REPLICATE, new cv.Scalar());
          M.delete();
        }
      }
      nonZero.delete();

      if (onProgress) onProgress({ stage: 'Detecting Table', progress: 20 });

      // 6. Detect timetable boundaries
      let contours = new cv.MatVector();
      let hierarchy = new cv.Mat();
      cv.findContours(deskewedThresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      let maxArea = 0;
      let maxContourIdx = -1;
      for (let i = 0; i < contours.size(); ++i) {
        let contour = contours.get(i);
        let area = cv.contourArea(contour);
        if (area > maxArea) {
          maxArea = area;
          maxContourIdx = i;
        }
      }

      let warpedTable = deskewedContrast.clone();

      if (maxContourIdx !== -1) {
        let contour = contours.get(maxContourIdx);
        let peri = cv.arcLength(contour, true);
        let approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, 0.02 * peri, true);
        
        if (approx.rows === 4 && maxArea > (deskewedThresh.cols * deskewedThresh.rows * 0.15)) {
          if (onProgress) onProgress({ stage: 'Detecting Table', progress: 60 });
          
          // 7. Perspective correction
          let pts = [];
          for (let i = 0; i < 4; i++) {
            pts.push({ x: approx.data32S[i * 2], y: approx.data32S[i * 2 + 1] });
          }
          
          pts.sort((a, b) => a.y - b.y);
          let topPts = pts.slice(0, 2).sort((a, b) => a.x - b.x);
          let bottomPts = pts.slice(2, 4).sort((a, b) => a.x - b.x);
          
          let topLeft = topPts[0];
          let topRight = topPts[1];
          let bottomLeft = bottomPts[0];
          let bottomRight = bottomPts[1];

          let widthA = Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y);
          let widthB = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
          let maxWidth = Math.max(widthA, widthB);

          let heightA = Math.hypot(topRight.x - bottomRight.x, topRight.y - bottomRight.y);
          let heightB = Math.hypot(topLeft.x - bottomLeft.x, topLeft.y - bottomLeft.y);
          let maxHeight = Math.max(heightA, heightB);

          let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
            topLeft.x, topLeft.y,
            topRight.x, topRight.y,
            bottomRight.x, bottomRight.y,
            bottomLeft.x, bottomLeft.y
          ]);

          let dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
            0, 0,
            maxWidth - 1, 0,
            maxWidth - 1, maxHeight - 1,
            0, maxHeight - 1
          ]);

          let M = cv.getPerspectiveTransform(srcCoords, dstCoords);
          warpedTable.delete();
          warpedTable = new cv.Mat();
          cv.warpPerspective(deskewedContrast, warpedTable, M, new cv.Size(maxWidth, maxHeight));

          srcCoords.delete();
          dstCoords.delete();
          M.delete();
        }
        approx.delete();
      }
      
      contours.delete();
      hierarchy.delete();

      if (onProgress) onProgress({ stage: 'Detecting Table', progress: 80 });

      // Threshold the warped table
      let warpedThresh = new cv.Mat();
      cv.adaptiveThreshold(warpedTable, warpedThresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);

      // 8. Detect lines (morphological processing)
      let horizontal = warpedThresh.clone();
      let horizontalSize = Math.max(15, Math.floor(warpedThresh.cols / 30));
      let horizontalStructure = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(horizontalSize, 1));
      cv.erode(horizontal, horizontal, horizontalStructure);
      cv.dilate(horizontal, horizontal, horizontalStructure);
      horizontalStructure.delete();

      let vertical = warpedThresh.clone();
      let verticalSize = Math.max(15, Math.floor(warpedThresh.rows / 30));
      let verticalStructure = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, verticalSize));
      cv.erode(vertical, vertical, verticalStructure);
      cv.dilate(vertical, vertical, verticalStructure);
      verticalStructure.delete();

      let tableMask = new cv.Mat();
      cv.add(horizontal, vertical, tableMask);

      let dilateKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2));
      cv.dilate(tableMask, tableMask, dilateKernel);
      dilateKernel.delete();

      // 9. Cell extraction contours
      let cellMask = new cv.Mat();
      cv.bitwise_not(tableMask, cellMask);

      let cellContours = new cv.MatVector();
      let cellHierarchy = new cv.Mat();
      cv.findContours(cellMask, cellContours, cellHierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      let cells: { x: number, y: number, width: number, height: number }[] = [];
      for (let i = 0; i < cellContours.size(); ++i) {
        let rect = cv.boundingRect(cellContours.get(i));
        if (rect.width > 25 && rect.height > 15) {
          cells.push(rect);
        }
      }

      cellContours.delete();
      cellHierarchy.delete();
      cellMask.delete();
      tableMask.delete();
      horizontal.delete();
      vertical.delete();
      warpedThresh.delete();

      // Synthetic grid fallback
      if (cells.length < 5) {
        const rowsCount = 8;
        const colsCount = 6;
        const cellW = warpedTable.cols / colsCount;
        const cellH = warpedTable.rows / rowsCount;
        cells = [];
        for (let r = 0; r < rowsCount; r++) {
          for (let c = 0; c < colsCount; c++) {
            cells.push({
              x: Math.floor(c * cellW),
              y: Math.floor(r * cellH),
              width: Math.floor(cellW),
              height: Math.floor(cellH)
            });
          }
        }
      }

      // Sort cells top-to-bottom, left-to-right (roughly) to help progress ordering
      cells.sort((a, b) => {
        if (Math.abs(a.y - b.y) < 15) {
          return a.x - b.x;
        }
        return a.y - b.y;
      });

      // 10. Pass cells to Tesseract.js running in worker
      if (onProgress) onProgress({ stage: 'Reading Text', progress: 0, detail: `0/${cells.length} cells recognized` });

      const worker = await getTesseractWorker();
      const parsedCells: OCRCell[] = [];

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];

        let rect = new cv.Rect(cell.x, cell.y, cell.width, cell.height);
        let cropped = warpedTable.roi(rect);

        // Add white margin border padding
        let padded = new cv.Mat();
        let border = 8;
        cv.copyMakeBorder(cropped, padded, border, border, border, border, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));

        let tempCanvas = document.createElement('canvas');
        cv.imshow(tempCanvas, padded);

        cropped.delete();
        padded.delete();

        try {
          const result = await worker.recognize(tempCanvas);
          parsedCells.push({
            x: cell.x,
            y: cell.y,
            width: cell.width,
            height: cell.height,
            text: result.data.text.trim(),
            confidence: result.data.confidence
          });
        } catch (err) {
          console.error('Cell OCR error:', err);
          parsedCells.push({
            x: cell.x,
            y: cell.y,
            width: cell.width,
            height: cell.height,
            text: '',
            confidence: 0
          });
        }

        if (onProgress) {
          const pct = Math.floor(((i + 1) / cells.length) * 100);
          onProgress({
            stage: 'Reading Text',
            progress: pct,
            detail: `Read cell ${i + 1}/${cells.length} (${pct}%)`
          });
        }
      }

      // Cleanup opencv mats
      src.delete();
      gray.delete();
      blurred.delete();
      contrast.delete();
      thresh.delete();
      deskewedThresh.delete();
      deskewedContrast.delete();
      warpedTable.delete();

      if (onProgress) onProgress({ stage: 'Parsing Timetable', progress: 50 });

      // 11. Run Timetable Parser
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
      return { slots, semester };
    } catch (err: any) {
      console.error('Offline OCR Pipeline Error:', err);
      throw new Error(`Failed to extract timetable: ${err.message || err}`);
    }
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
