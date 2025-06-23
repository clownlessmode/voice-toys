import { NextRequest, NextResponse } from "next/server";
import { s3Storage } from "@/lib/s3-storage";
import { ImageProcessor, generateFileName } from "@/lib/image-utils";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const folder = (formData.get("folder") as string) || "uploads";
    const resize = formData.get("resize") === "true";
    const width = parseInt(formData.get("width") as string) || undefined;
    const height = parseInt(formData.get("height") as string) || undefined;
    const quality = parseInt(formData.get("quality") as string) || 90;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadedFiles = [];

    for (const file of files) {
      // Проверяем, что это изображение
      if (!ImageProcessor.isValidImage(file.type)) {
        return NextResponse.json(
          {
            error: `Invalid file type: ${file.type}. Only images are allowed.`,
          },
          { status: 400 }
        );
      }

      // Проверяем размер файла (максимум 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File too large: ${file.name}. Maximum size is 10MB.` },
          { status: 400 }
        );
      }

      // Читаем файл
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const buffer = Buffer.from(uint8Array);

      // Получаем метаданные изображения
      const metadata = await ImageProcessor.getImageMetadata(buffer);

      // Обрабатываем изображение
      let processedBuffer = buffer;
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

      // Генерируем имя файла
      const fileName = generateFileName(file.name);
      const key = `${folder}/${fileName}.webp`;

      // Очищаем метаданные от недопустимых символов для HTTP заголовков
      const cleanMetadata = {
        originalname: file.name.replace(/[^\w\-._]/g, "_"), // Заменяем недопустимые символы
        originalsize: file.size.toString(),
        originaltype: file.type.replace(/[^\w\-./]/g, "_"),
        processedat: new Date().toISOString(),
      };

      // Загружаем в S3
      const url = await s3Storage.uploadFile(
        key,
        processedBuffer,
        "image/webp",
        cleanMetadata
      );

      uploadedFiles.push({
        originalName: file.name,
        fileName: `${fileName}.webp`,
        url,
        key,
        size: processedBuffer.length,
        originalSize: file.size,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
        },
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
