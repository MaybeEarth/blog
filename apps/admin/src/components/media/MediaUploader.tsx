import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { mediaApi } from '../../api/media.api';
import { useQueryClient } from '@tanstack/react-query';
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_SIZE_BYTES } from '@blog/shared';

export interface MediaUploaderProps {
  onSuccess?: (mediaId: string) => void;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({ onSuccess }) => {
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0 || !files[0]) return;
    const file = files[0];

    // Validasyon
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as any)) {
      setError('Geçersiz dosya türü. Yalnızca JPEG, PNG, WebP ve AVIF kabul edilir.');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError(`Dosya boyutu çok büyük. Maksimum ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB yükleyebilirsiniz.`);
      return;
    }

    setError(null);
    setIsUploading(true);
    setProgress(0);
    setStatusMessage('Presigned URL oluşturuluyor...');

    try {
      // 1. Presigned URL al
      const presignData = await mediaApi.requestPresign({
        filename: file.name,
        mimeType: file.type as any,
        sizeBytes: file.size,
      });

      // 2. Doğrudan S3/RustFS'e yükle (XHR progress ile)
      setStatusMessage('Görsel S3 depolamaya yükleniyor...');
      await mediaApi.uploadToS3(
        presignData.uploadUrl,
        file,
        file.type,
        (percent) => setProgress(percent),
      );

      // 3. Yükleme tamamlandı sinyali ver (BullMQ arka plan varyant işleme)
      setStatusMessage('İşleme kuyruğuna alınıyor...');
      await mediaApi.completeUpload(presignData.mediaId);

      setStatusMessage('Yükleme başarıyla tamamlandı!');
      queryClient.invalidateQueries({ queryKey: ['media'] });

      if (onSuccess) {
        onSuccess(presignData.mediaId);
      }
    } catch (err: any) {
      setError(err.message || 'Yükleme sırasında bir hata oluştu');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFileSelect(e.dataTransfer.files);
        }}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
            : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50'
        } ${isUploading ? 'opacity-80 cursor-wait' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_MIME_TYPES.join(',')}
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={isUploading}
        />

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 mb-3">
          {isUploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <UploadCloud className="w-6 h-6" />
          )}
        </div>

        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Görsel yüklemek için tıklayın veya sürükleyip bırakın
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          JPEG, PNG, WebP veya AVIF (Maks. 10MB)
        </p>

        {isUploading && (
          <div className="w-full max-w-xs mt-4">
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              %{progress} - {statusMessage}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {statusMessage && !isUploading && !error && (
        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
};
