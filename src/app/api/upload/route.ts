import { NextRequest, NextResponse } from "next/server";
import { s3Storage } from "@/lib/s3-storage";
import { ImageProcessor, generateFileName } from "@/lib/image-utils";

export const runtime = "nodejs";

// Функция для проверки видео файлов
function isValidVideo(mimeType: string): boolean {
  const validVideoTypes = [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",
  ];
  return validVideoTypes.includes(mimeType);
}

// Функция для проверки изображений
function isValidImage(mimeType: string): boolean {
  return ImageProcessor.isValidImage(mimeType);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const folder = (formData.get("folder") as string) || "uploads";
    const resize = formData.get("resize") === "true";
    const width = parseInt(formData.get("width") as string) || undefined;
    const height = parseInt(formData.get("height") as string) || undefined;
    const quality = parseInt(formData.get("quality") as string) || 100;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadedFiles = [];

    for (const file of files) {
      // Проверяем, что это изображение или видео
      const isImage = isValidImage(file.type);
      const isVideo = isValidVideo(file.type);

      if (!isImage && !isVideo) {
        return NextResponse.json(
          {
            error: `Invalid file type: ${file.type}. Only images and videos are allowed.`,
          },
          { status: 400 }
        );
      }

      // Проверяем размер файла (максимум 100MB для видео, 10MB для изображений)
      const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json(
          {
            error: `File too large: ${file.name}. Maximum size is ${Math.round(
              maxSize / 1024 / 1024
            )}MB.`,
          },
          { status: 400 }
        );
      }

      // Читаем файл
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const buffer = Buffer.from(uint8Array);

      let processedBuffer = buffer;
      let fileExtension = "";
      let mimeType = file.type;
      let metadata = {};

      if (isImage) {
        // Обрабатываем изображение
        const imageMetadata = await ImageProcessor.getImageMetadata(buffer);
        metadata = {
          width: imageMetadata.width,
          height: imageMetadata.height,
          format: imageMetadata.format,
        };

        if (resize && (width || height)) {
          processedBuffer = await ImageProcessor.convertToWebP(buffer, {
            width,
            height,
            quality,
          });
        } else {
          // Просто конвертируем в WebP
          processedBuffer = await ImageProcessor.convertToWebP(buffer, {
            quality,
          });
        }
        fileExtension = ".webp";
        mimeType = "image/webp";
      } else {
        // Для видео оставляем как есть без сжатия
        fileExtension = file.name.substring(file.name.lastIndexOf("."));
        metadata = {
          duration: null, // Можно добавить извлечение длительности видео
          format: file.type,
          originalSize: file.size,
        };
      }

      // Генерируем имя файла
      const fileName = generateFileName(file.name);
      const key = `${folder}/${fileName}${fileExtension}`;

      // Очищаем метаданные от недопустимых символов для HTTP заголовков
      const cleanMetadata = {
        originalname: file.name.replace(/[^\w\-._]/g, "_"),
        originalsize: file.size.toString(),
        originaltype: file.type.replace(/[^\w\-./]/g, "_"),
        processedat: new Date().toISOString(),
      };

      // Загружаем в S3
      const url = await s3Storage.uploadFile(
        key,
        processedBuffer,
        mimeType,
        cleanMetadata
      );

      uploadedFiles.push({
        originalName: file.name,
        fileName: `${fileName}${fileExtension}`,
        url,
        key,
        size: processedBuffer.length,
        originalSize: file.size,
        metadata,
      });
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Удаление файла
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    const key = searchParams.get("key");

    if (!url && !key) {
      return NextResponse.json(
        { error: "URL or key is required" },
        { status: 400 }
      );
    }

    let fileKey = key;
    if (url && !key) {
      fileKey = s3Storage.extractKeyFromUrl(url);
    }

    if (!fileKey) {
      return NextResponse.json(
        { error: "Invalid URL or key" },
        { status: 400 }
      );
    }

    // Проверяем существование файла
    const exists = await s3Storage.fileExists(fileKey);
    if (!exists) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Удаляем файл
    await s3Storage.deleteFile(fileKey);

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
      key: fileKey,
    });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      {
        error: "Delete failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
