import React, { useState } from "react";
import { Trash2, Plus, Eye, X } from "lucide-react";

interface ImageItem {
  url: string;
  isUploaded?: boolean;
  originalName?: string;
}

interface ImageGalleryProps {
  images: ImageItem[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, url: string) => void;
  title?: string;
  allowManualUrls?: boolean;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  onAdd,
  onRemove,

  title = "Изображения",
  allowManualUrls = true,
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = "/placeholder-image.png";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
        {allowManualUrls && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить URL
          </button>
        )}
      </div>

      {images.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-sm">Изображения не добавлены</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative group border border-gray-200 rounded-lg overflow-hidden bg-white"
            >
              {/* Превью изображения */}
              <div className="aspect-square bg-gray-100 relative">
                {image.url ? (
                  <>
                    <img
                      src={image.url}
                      alt={`Изображение ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={handleImageError}
                      loading="lazy"
                    />
                    {/* Оверлей с действиями */}
                    <div className="absolute inset-0 bg-black/50 bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setPreviewImage(image.url)}
                          className="p-2 bg-white rounded-full text-gray-700 hover:text-gray-900 shadow-md"
                          title="Просмотр"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(index)}
                          className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 shadow-md"
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <div className="text-sm">Нет изображения</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно для просмотра изображения */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={previewImage}
              alt="Превью"
              className="max-w-full max-h-full object-contain rounded-lg"
              onError={handleImageError}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
