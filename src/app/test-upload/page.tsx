"use client";

import { useState } from "react";
import FileUpload, {
  UploadedFile,
  ImagePreview,
} from "@/components/ui/components/file-upload";

export default function TestUploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadError, setUploadError] = useState<string>("");

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        Тест загрузки файлов в Selectel S3
      </h1>

      <div className="space-y-6">
        {/* Загрузка файлов */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Загрузить изображения
          </h2>

          <FileUpload
            onUpload={(files) => {
              setUploadedFiles((prev) => [...prev, ...files]);
              setUploadError("");
              console.log("Uploaded files:", files);
            }}
            onError={(error) => {
              setUploadError(error);
              console.error("Upload error:", error);
            }}
            folder="test-uploads"
            maxFiles={5}
            resize={true}
            width={800}
            height={600}
            quality={85}
          />

          {uploadError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{uploadError}</p>
            </div>
          )}
        </div>

        {/* Превью загруженных изображений */}
        {uploadedFiles.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Загруженные изображения ({uploadedFiles.length})
            </h2>

            <ImagePreview
              files={uploadedFiles}
              onRemove={(index) => {
                setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
              }}
            />
          </div>
        )}

        {/* Информация о файлах */}
        {uploadedFiles.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Информация о файлах
            </h2>

            <div className="space-y-3">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="border rounded-lg p-3 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Оригинальное имя:</strong> {file.originalName}
                    </div>
                    <div>
                      <strong>Имя файла:</strong> {file.fileName}
                    </div>
                    <div>
                      <strong>Размер:</strong> {Math.round(file.size / 1024)} KB
                    </div>
                    <div>
                      <strong>Оригинальный размер:</strong>{" "}
                      {Math.round(file.originalSize / 1024)} KB
                    </div>
                    <div>
                      <strong>Разрешение:</strong> {file.metadata.width}×
                      {file.metadata.height}
                    </div>
                    <div>
                      <strong>Формат:</strong> {file.metadata.format}
                    </div>
                    <div className="col-span-2">
                      <strong>URL:</strong>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 ml-2 break-all"
                      >
                        {file.url}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
