"use client";

import React, { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UploadedFile {
  originalName: string;
  fileName: string;
  url: string;
  key: string;
  size: number;
  originalSize: number;
  metadata: {
    width?: number;
    height?: number;
    format?: string;
  };
}

interface FileUploadProps {
  onUpload: (files: UploadedFile[]) => void;
  onError?: (error: string) => void;
  folder?: string;
  maxFiles?: number;
  maxFileSize?: number; // в байтах
  resize?: boolean;
  width?: number;
  height?: number;
  quality?: number;
  accept?: string;
  multiple?: boolean;
  className?: string;
  disabled?: boolean;
}

export default function FileUpload({
  onUpload,
  onError,
  folder = "uploads",
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  resize = false,
  width,
  height,
  quality = 90,
  accept = "image/*",
  multiple = true,
  className,
  disabled = false,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList) => {
      if (disabled || isUploading) return;

      const fileArray = Array.from(files);

      // Проверяем количество файлов
      if (fileArray.length > maxFiles) {
        onError?.(`Максимальное количество файлов: ${maxFiles}`);
        return;
      }

      // Проверяем размер файлов
      for (const file of fileArray) {
        if (file.size > maxFileSize) {
          onError?.(
            `Файл ${
              file.name
            } слишком большой. Максимальный размер: ${Math.round(
              maxFileSize / 1024 / 1024
            )}MB`
          );
          return;
        }
      }

      setIsUploading(true);
      setUploadProgress(`Загрузка ${fileArray.length} файл(ов)...`);

      try {
        const formData = new FormData();

        fileArray.forEach((file) => {
          formData.append("files", file);
        });

        formData.append("folder", folder);
        formData.append("resize", resize.toString());
        if (width) formData.append("width", width.toString());
        if (height) formData.append("height", height.toString());
        formData.append("quality", quality.toString());

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Ошибка загрузки");
        }

        const result = await response.json();

        if (result.success) {
          onUpload(result.files);
          setUploadProgress(
            `Успешно загружено ${result.files.length} файл(ов)`
          );

          // Очищаем сообщение через 3 секунды
          setTimeout(() => setUploadProgress(""), 3000);
        } else {
          throw new Error(result.error || "Ошибка загрузки");
        }
      } catch (error) {
        console.error("Upload error:", error);
        onError?.(
          error instanceof Error ? error.message : "Ошибка загрузки файлов"
        );
      } finally {
        setIsUploading(false);

        // Очищаем input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [
      disabled,
      isUploading,
      maxFiles,
      maxFileSize,
      onError,
      folder,
      resize,
      width,
      height,
      quality,
      onUpload,
    ]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && !isUploading) {
        setIsDragOver(true);
      }
    },
    [disabled, isUploading]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled || isUploading) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [disabled, isUploading, handleFiles]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragOver && !disabled && !isUploading
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400",
          disabled || isUploading
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-gray-50",
          "min-h-[200px] flex flex-col items-center justify-center"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm text-gray-600">{uploadProgress}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              {accept.includes("image") ? (
                <ImageIcon className="w-6 h-6 text-gray-500" />
              ) : (
                <Upload className="w-6 h-6 text-gray-500" />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">
                Перетащите файлы сюда или нажмите для выбора
              </p>
              <p className="text-sm text-gray-500">
                {accept.includes("image")
                  ? "Поддерживаются изображения"
                  : "Поддерживаются файлы"}{" "}
                до {Math.round(maxFileSize / 1024 / 1024)}MB
              </p>
              {multiple && (
                <p className="text-sm text-gray-500">
                  Максимум {maxFiles} файл(ов) за раз
                </p>
              )}
            </div>
          </div>
        )}

        {uploadProgress && !isUploading && (
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded">
              {uploadProgress}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Компонент для отображения загруженных изображений
interface ImagePreviewProps {
  files: UploadedFile[];
  onRemove?: (index: number) => void;
  className?: string;
}

export function ImagePreview({
  files,
  onRemove,
  className,
}: ImagePreviewProps) {
  if (files.length === 0) return null;

  return (
    <div
      className={cn(
        "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
        className
      )}
    >
      {files.map((file, index) => (
        <div key={file.key} className="relative group">
          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
            <img
              src={file.url}
              alt={file.originalName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {onRemove && (
            <button
              onClick={() => onRemove(index)}
              className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              title="Удалить изображение"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="mt-2">
            <p
              className="text-xs text-gray-600 truncate"
              title={file.originalName}
            >
              {file.originalName}
            </p>
            <p className="text-xs text-gray-400">
              {file.metadata.width}×{file.metadata.height} •{" "}
              {Math.round(file.size / 1024)}KB
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
