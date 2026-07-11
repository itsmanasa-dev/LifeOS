// Web Worker for OpenCV image preprocessing
declare const importScripts: (...urls: string[]) => void;
let cvReadyPromise: Promise<any> | null = null;

function loadOpenCVInWorker(): Promise<any> {
  if (cvReadyPromise) return cvReadyPromise;

  cvReadyPromise = new Promise<any>((resolve) => {
    // If cv is already defined and loaded
    if ((self as any).cv && (self as any).cv.Mat) {
      resolve((self as any).cv);
      return;
    }

    // Set Module hook for Emscripten runtime initialization
    (self as any).Module = {
      onRuntimeInitialized() {
        resolve((self as any).cv);
      }
    };

    // Load script synchronously on the background worker thread
    // This file exists in the public directory and is served from the root
    importScripts('/opencv.js');
  });

  return cvReadyPromise;
}

self.onmessage = async (e: MessageEvent) => {
  const { file } = e.data;
  if (!file) {
    self.postMessage({ type: 'error', error: 'No file received in worker' });
    return;
  }

  // Declaring OpenCV matrices in outer scope for cleanup in finally block
  let src: any = null;
  let gray: any = null;
  let blurred: any = null;
  let contrast: any = null;
  let thresh: any = null;
  let deskewedThresh: any = null;
  let deskewedContrast: any = null;
  let warpedTable: any = null;
  let processedTable: any = null;
  let nonZero: any = null;
  let contours: any = null;
  let hierarchy: any = null;
  let cellMask: any = null;
  let tableMask: any = null;
  let cellContours: any = null;
  let cellHierarchy: any = null;
  let horizontal: any = null;
  let vertical: any = null;
  let warpedThresh: any = null;

  try {
    self.postMessage({ type: 'progress', data: { stage: 'Preprocessing', progress: 10 } });

    const cv = await loadOpenCVInWorker();

    self.postMessage({ type: 'progress', data: { stage: 'Preprocessing', progress: 20 } });

    // Decode image asynchronously to an ImageBitmap
    const imgBitmap = await createImageBitmap(file);

    self.postMessage({ type: 'progress', data: { stage: 'Preprocessing', progress: 30 } });

    // Create OffscreenCanvas to extract ImageData
    const canvas = new OffscreenCanvas(imgBitmap.width, imgBitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2d context for OffscreenCanvas');
    }
    ctx.drawImage(imgBitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, imgBitmap.width, imgBitmap.height);

    // Convert to OpenCV Mat
    src = cv.matFromImageData(imageData);

    // 1. Grayscale
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    self.postMessage({ type: 'progress', data: { stage: 'Preprocessing', progress: 40 } });

    // 2. Reduce image noise (Gaussian Blur)
    blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT);
    self.postMessage({ type: 'progress', data: { stage: 'Preprocessing', progress: 60 } });

    // 3. Increase contrast (CLAHE)
    contrast = new cv.Mat();
    const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
    clahe.apply(blurred, contrast);
    clahe.delete();
    self.postMessage({ type: 'progress', data: { stage: 'Preprocessing', progress: 80 } });

    // 4. Adaptive Threshold
    thresh = new cv.Mat();
    cv.adaptiveThreshold(contrast, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);
    self.postMessage({ type: 'progress', data: { stage: 'Preprocessing', progress: 95 } });

    // 5. Deskew (straighten image)
    nonZero = new cv.Mat();
    cv.findNonZero(thresh, nonZero);
    deskewedThresh = thresh.clone();
    deskewedContrast = contrast.clone();

    let angle = 0;
    if (nonZero.rows > 0) {
      const rotatedRect = cv.minAreaRect(nonZero);
      angle = rotatedRect.angle;
      if (angle < -45) {
        angle = angle + 90;
      } else if (angle > 45) {
        angle = angle - 90;
      }

      if (Math.abs(angle) > 0.5 && Math.abs(angle) < 45) {
        const center = new cv.Point(thresh.cols / 2, thresh.rows / 2);
        const M = cv.getRotationMatrix2D(center, angle, 1.0);
        const dsize = new cv.Size(thresh.cols, thresh.rows);

        cv.warpAffine(thresh, deskewedThresh, M, dsize, cv.INTER_CUBIC, cv.BORDER_REPLICATE, new cv.Scalar());
        cv.warpAffine(contrast, deskewedContrast, M, dsize, cv.INTER_CUBIC, cv.BORDER_REPLICATE, new cv.Scalar());
        M.delete();
      }
    }
    nonZero.delete();
    nonZero = null;

    self.postMessage({ type: 'progress', data: { stage: 'Detecting Table', progress: 20 } });

    // 6. Detect timetable boundaries
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    cv.findContours(deskewedThresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let maxArea = 0;
    let maxContourIdx = -1;
    for (let i = 0; i < contours.size(); ++i) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      if (area > maxArea) {
        maxArea = area;
        maxContourIdx = i;
      }
    }

    warpedTable = deskewedContrast.clone();

    if (maxContourIdx !== -1) {
      const contour = contours.get(maxContourIdx);
      const peri = cv.arcLength(contour, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(contour, approx, 0.02 * peri, true);

      if (approx.rows === 4 && maxArea > (deskewedThresh.cols * deskewedThresh.rows * 0.15)) {
        self.postMessage({ type: 'progress', data: { stage: 'Detecting Table', progress: 60 } });

        // 7. Perspective correction
        const pts = [];
        for (let i = 0; i < 4; i++) {
          pts.push({ x: approx.data32S[i * 2], y: approx.data32S[i * 2 + 1] });
        }

        pts.sort((a, b) => a.y - b.y);
        const topPts = pts.slice(0, 2).sort((a, b) => a.x - b.x);
        const bottomPts = pts.slice(2, 4).sort((a, b) => a.x - b.x);

        const topLeft = topPts[0];
        const topRight = topPts[1];
        const bottomLeft = bottomPts[0];
        const bottomRight = bottomPts[1];

        const widthA = Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y);
        const widthB = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
        const maxWidth = Math.max(widthA, widthB);

        const heightA = Math.hypot(topRight.x - bottomRight.x, topRight.y - bottomRight.y);
        const heightB = Math.hypot(topLeft.x - bottomLeft.x, topLeft.y - bottomLeft.y);
        const maxHeight = Math.max(heightA, heightB);

        const srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
          topLeft.x, topLeft.y,
          topRight.x, topRight.y,
          bottomRight.x, bottomRight.y,
          bottomLeft.x, bottomLeft.y
        ]);

        const dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
          0, 0,
          maxWidth - 1, 0,
          maxWidth - 1, maxHeight - 1,
          0, maxHeight - 1
        ]);

        const M = cv.getPerspectiveTransform(srcCoords, dstCoords);
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
    contours = null;
    hierarchy.delete();
    hierarchy = null;

    self.postMessage({ type: 'progress', data: { stage: 'Detecting Table', progress: 80 } });

    // Scale down warped table if too large to speed up Tesseract and prevent UI lag
    const maxDim = 1200;
    let scale = 1.0;
    if (warpedTable.cols > maxDim || warpedTable.rows > maxDim) {
      scale = maxDim / Math.max(warpedTable.cols, warpedTable.rows);
    }

    processedTable = warpedTable.clone();
    if (scale < 1.0) {
      const dsize = new cv.Size(Math.round(warpedTable.cols * scale), Math.round(warpedTable.rows * scale));
      cv.resize(warpedTable, processedTable, dsize, 0, 0, cv.INTER_AREA);
    }

    // Threshold the processed table
    warpedThresh = new cv.Mat();
    cv.adaptiveThreshold(processedTable, warpedThresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);

    // 8. Detect lines (morphological processing on scaled image)
    horizontal = warpedThresh.clone();
    const horizontalSize = Math.max(15, Math.floor(warpedThresh.cols / 30));
    const horizontalStructure = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(horizontalSize, 1));
    cv.erode(horizontal, horizontal, horizontalStructure);
    cv.dilate(horizontal, horizontal, horizontalStructure);
    horizontalStructure.delete();

    vertical = warpedThresh.clone();
    const verticalSize = Math.max(15, Math.floor(warpedThresh.rows / 30));
    const verticalStructure = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, verticalSize));
    cv.erode(vertical, vertical, verticalStructure);
    cv.dilate(vertical, vertical, verticalStructure);
    verticalStructure.delete();

    tableMask = new cv.Mat();
    cv.add(horizontal, vertical, tableMask);

    const dilateKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2));
    cv.dilate(tableMask, tableMask, dilateKernel);
    dilateKernel.delete();

    // 9. Cell extraction contours
    cellMask = new cv.Mat();
    cv.bitwise_not(tableMask, cellMask);

    cellContours = new cv.MatVector();
    cellHierarchy = new cv.Mat();
    cv.findContours(cellMask, cellContours, cellHierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let cells: { x: number, y: number, width: number, height: number }[] = [];
    for (let i = 0; i < cellContours.size(); ++i) {
      const rect = cv.boundingRect(cellContours.get(i));
      if (rect.width > 25 && rect.height > 15) {
        cells.push(rect);
      }
    }

    cellContours.delete();
    cellContours = null;
    cellHierarchy.delete();
    cellHierarchy = null;
    cellMask.delete();
    cellMask = null;
    tableMask.delete();
    tableMask = null;
    horizontal.delete();
    horizontal = null;
    vertical.delete();
    vertical = null;
    warpedThresh.delete();
    warpedThresh = null;

    // Synthetic grid fallback
    if (cells.length < 5) {
      const rowsCount = 8;
      const colsCount = 6;
      const cellW = processedTable.cols / colsCount;
      const cellH = processedTable.rows / rowsCount;
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

    // Sort cells top-to-bottom, left-to-right
    cells.sort((a, b) => {
      if (Math.abs(a.y - b.y) < 15) {
        return a.x - b.x;
      }
      return a.y - b.y;
    });

    // Draw processedTable onto an OffscreenCanvas
    const outCanvas = new OffscreenCanvas(processedTable.cols, processedTable.rows);
    cv.imshow(outCanvas, processedTable);
    const processedBitmap = outCanvas.transferToImageBitmap();

    // Send the preprocessed ImageBitmap and cell layouts back to main thread
    (self as any).postMessage(
      {
        type: 'success',
        data: {
          cells,
          processedBitmap
        }
      },
      [processedBitmap]
    );

  } catch (err: any) {
    console.error('Worker Preprocessing Error:', err);
    self.postMessage({ type: 'error', error: err.message || err.toString() });
  } finally {
    // Delete OpenCV matrices to avoid WebAssembly memory leaks
    if (src) src.delete();
    if (gray) gray.delete();
    if (blurred) blurred.delete();
    if (contrast) contrast.delete();
    if (thresh) thresh.delete();
    if (deskewedThresh) deskewedThresh.delete();
    if (deskewedContrast) deskewedContrast.delete();
    if (warpedTable) warpedTable.delete();
    if (processedTable) processedTable.delete();
    if (nonZero) nonZero.delete();
    if (contours) contours.delete();
    if (hierarchy) hierarchy.delete();
    if (cellMask) cellMask.delete();
    if (tableMask) tableMask.delete();
    if (cellContours) cellContours.delete();
    if (cellHierarchy) cellHierarchy.delete();
    if (horizontal) horizontal.delete();
    if (vertical) vertical.delete();
    if (warpedThresh) warpedThresh.delete();
  }
};
