import { useCallback, useRef, useState } from 'react';
import { Upload, Camera, FileText, X, AlertCircle, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { isValidImageFormat, isPDF } from '../../utils/imageUtils';
import type { RosterIdentifier } from '../../types';

interface UploadStepProps {
  onFileSelect: (file: File) => void;
  previewUrl: string | null;
  file: File | null;
  onClear: () => void;
  onProcess: () => void;
  isLoading: boolean;
  // Legacy props - kept for backward compatibility but not used in AI-first flow
  identifier: RosterIdentifier | null;
  onIdentifierChange: (identifier: RosterIdentifier | null) => void;
  scanAll: boolean;
  onScanAllChange: (scanAll: boolean) => void;
  onSaveIdentifier?: () => void;
  hasSavedIdentifier?: boolean;
  scanUsage?: { used: number; limit: number } | null;
}

const ACCEPTED_TYPES = '.jpg,.jpeg,.png,.heic,.heif,.webp,.pdf';
const MAX_FILE_SIZE_MB = 10;

export function UploadStep({
  onFileSelect,
  previewUrl,
  file,
  onClear,
  onProcess,
  isLoading,
  scanUsage
}: UploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSelectFile = useCallback((selectedFile: File) => {
    setError(null);

    // Check file size
    const sizeMB = selectedFile.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      setError(`File too large (${sizeMB.toFixed(1)}MB). Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    // Check file type
    if (!isValidImageFormat(selectedFile) && !isPDF(selectedFile)) {
      setError('Invalid file format. Please use JPG, PNG, HEIC, or PDF.');
      return;
    }

    onFileSelect(selectedFile);
  }, [onFileSelect]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSelectFile(selectedFile);
    }
    // Reset input value so same file can be selected again
    e.target.value = '';
  }, [validateAndSelectFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSelectFile(droppedFile);
    }
  }, [validateAndSelectFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Instructions */}
      <div className="text-center text-sm text-slate-500">
        <p>Upload a photo or screenshot of your work roster.</p>
        <p className="text-xs mt-1 text-slate-400">Supports JPG, PNG, HEIC, and PDF</p>
        {scanUsage && (
          <p className={clsx(
            "text-xs mt-2 font-medium",
            scanUsage.limit - scanUsage.used <= 3 ? "text-amber-600" : "text-slate-400"
          )}>
            {scanUsage.limit - scanUsage.used} scans remaining this month
          </p>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload area or Preview */}
      {!file ? (
        <div
          className={clsx(
            "border-2 border-dashed rounded-2xl p-8 text-center transition-all",
            dragActive
              ? "border-indigo-400 bg-indigo-50/50"
              : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full neu-pressed">
              <Upload className="w-8 h-8 text-slate-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-600">Drop your roster here</p>
              <p className="text-xs text-slate-400 mt-1">or click below to select</p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="neu-btn flex items-center gap-2 text-sm"
              >
                <FileText className="w-4 h-4" />
                Choose File
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="neu-btn flex items-center gap-2 text-sm"
              >
                <Camera className="w-4 h-4" />
                Take Photo
              </button>
            </div>
          </div>

          {/* Hidden inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
            {isPDF(file) ? (
              <div className="flex items-center justify-center p-8 bg-slate-50">
                <div className="flex items-center gap-3">
                  <FileText className="w-12 h-12 text-red-500" />
                  <div>
                    <p className="font-semibold text-slate-700">{file.name}</p>
                    <p className="text-xs text-slate-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB - PDF Document
                    </p>
                  </div>
                </div>
              </div>
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt="Roster preview"
                className="w-full max-h-[300px] object-contain"
              />
            ) : null}

            {/* Clear button */}
            <button
              type="button"
              onClick={onClear}
              className="absolute top-2 right-2 p-2 rounded-lg bg-white/90 hover:bg-white shadow-md transition-colors"
              title="Remove file"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* File info */}
          <div className="text-center text-sm text-slate-500">
            <span className="font-medium">{file.name}</span>
            <span className="text-slate-400 ml-2">
              ({(file.size / (1024 * 1024)).toFixed(2)} MB)
            </span>
          </div>

          {/* AI-first info banner */}
          <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl">
            <Sparkles className="w-5 h-5 text-indigo-500 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-indigo-700">Smart Detection</p>
              <p className="text-xs text-indigo-500">
                AI will analyze your roster and ask who you are
              </p>
            </div>
          </div>

          {/* Process button */}
          <button
            type="button"
            onClick={onProcess}
            disabled={isLoading}
            className={clsx(
              "w-full neu-btn !bg-indigo-500 !text-white hover:!bg-indigo-600 py-3 text-base font-semibold",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading ? 'Processing...' : 'Scan Roster'}
          </button>
        </div>
      )}
    </div>
  );
}
