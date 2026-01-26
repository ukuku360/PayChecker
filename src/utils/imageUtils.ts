/**
 * Image compression utilities for roster scanning
 * Compresses images to reduce upload size and improve processing speed
 */

const MAX_DIMENSION = 2048;
const TARGET_SIZE_MB = 1;
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.5;
const QUALITY_REDUCTION_STEP = 0.1;

/**
 * Compresses an image file to target size and returns base64 string
 * @param file - Input image file (PNG, JPG, HEIC)
 * @param maxSizeMB - Maximum output size in MB (default: 1MB)
 * @returns Promise<string> - Base64 encoded compressed image (without data: prefix)
 */
export async function compressImage(file: File, maxSizeMB = TARGET_SIZE_MB): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Calculate new dimensions while maintaining aspect ratio
          let { width, height } = img;

          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width > height) {
              height = Math.round((height / width) * MAX_DIMENSION);
              width = MAX_DIMENSION;
            } else {
              width = Math.round((width / height) * MAX_DIMENSION);
              height = MAX_DIMENSION;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw image with white background (in case of transparency)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Compress with iterative quality reduction
          const maxBytes = maxSizeMB * 1024 * 1024;
          let quality = INITIAL_QUALITY;
          let base64 = canvas.toDataURL('image/jpeg', quality);

          // Iteratively reduce quality until under target size
          while (base64.length * 0.75 > maxBytes && quality > MIN_QUALITY) {
            quality -= QUALITY_REDUCTION_STEP;
            base64 = canvas.toDataURL('image/jpeg', quality);
          }

          // Remove data:image/jpeg;base64, prefix
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Validates that a file is an acceptable image format
 * @param file - File to validate
 * @returns boolean - True if valid image format
 */
export function isValidImageFormat(file: File): boolean {
  const validTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/heic',
    'image/heif',
    'image/webp'
  ];

  // Check MIME type first
  if (validTypes.includes(file.type.toLowerCase())) {
    return true;
  }

  // Fallback to extension check for HEIC (sometimes has wrong MIME type)
  const extension = file.name.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'].includes(extension || '');
}

/**
 * Checks if a file is a PDF
 * @param file - File to check
 * @returns boolean - True if PDF
 */
export function isPDF(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Gets image dimensions from a file
 * @param file - Image file
 * @returns Promise<{width: number, height: number}>
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Creates a preview URL for an image file
 * @param file - Image file
 * @returns string - Object URL for preview (remember to revoke when done)
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}
