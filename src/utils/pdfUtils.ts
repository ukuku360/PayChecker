/**
 * PDF processing utilities for roster scanning
 * Extracts images from PDF pages for AI processing
 */

// PDF.js is dynamically imported to reduce bundle size
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

// Constants
const DEFAULT_RENDER_SCALE = 2.0;
const JPEG_QUALITY = 0.85;

/**
 * Lazily loads PDF.js library
 */
async function loadPdfJs(): Promise<typeof import('pdfjs-dist')> {
  if (pdfjsLib) return pdfjsLib;

  pdfjsLib = await import('pdfjs-dist');

  // Set worker source - using CDN for simplicity
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  return pdfjsLib;
}

/**
 * Extracts the first page of a PDF as a base64-encoded JPEG image
 * @param file - PDF file
 * @param scale - Rendering scale (default: 2.0 for better quality)
 * @returns Promise<string> - Base64 encoded image (without data: prefix)
 */
export async function extractFirstPageAsImage(file: File, scale = DEFAULT_RENDER_SCALE): Promise<string> {
  const pdfjs = await loadPdfJs();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas
  } as any).promise;

  // Convert to JPEG with decent quality
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

  // Cleanup
  page.cleanup();
  pdf.destroy();

  // Return base64 without prefix
  return dataUrl.split(',')[1];
}

/**
 * Gets the number of pages in a PDF
 * @param file - PDF file
 * @returns Promise<number> - Number of pages
 */
export async function getPdfPageCount(file: File): Promise<number> {
  const pdfjs = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pageCount = pdf.numPages;
  pdf.destroy();
  return pageCount;
}

/**
 * Extracts multiple pages from a PDF as base64 images
 * @param file - PDF file
 * @param startPage - First page to extract (1-indexed)
 * @param endPage - Last page to extract (inclusive)
 * @param scale - Rendering scale
 * @returns Promise<string[]> - Array of base64 encoded images
 */
export async function extractPagesAsImages(
  file: File,
  startPage = 1,
  endPage = 1,
  scale = DEFAULT_RENDER_SCALE
): Promise<string[]> {
  const pdfjs = await loadPdfJs();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const images: string[] = [];
  const actualEndPage = Math.min(endPage, pdf.numPages);

  for (let i = startPage; i <= actualEndPage; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) continue;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas
    } as any).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    images.push(dataUrl.split(',')[1]);

    page.cleanup();
  }

  pdf.destroy();
  return images;
}
