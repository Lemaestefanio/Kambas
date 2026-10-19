import React, { useState } from 'react';
import { Lock, Heart, Eye } from 'lucide-react';
import { Creator, MediaPhoto } from '../types';

interface PhotoGalleryGridProps {
  creator: Creator;
  onUnlockClick: () => void;
}

export const PhotoGalleryGrid: React.FC<PhotoGalleryGridProps> = ({
  creator,
  onUnlockClick,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<MediaPhoto | null>(null);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Galeria de Fotografias Exclusivas
          </h3>
          <p className="text-xs text-slate-500">
            {creator.stats.photos} fotografias em alta definição
          </p>
        </div>

        <button
          onClick={onUnlockClick}
          className="text-xs font-bold text-[#00aff0] hover:underline"
        >
          Desbloquear Tudo
        </button>
      </div>

      {/* Grid of 3 columns */}
      <div className="grid grid-cols-3 gap-2">
        {creator.galleryPhotos.map((photo) => (
          <div
            key={photo.id}
            onClick={() => (photo.unlocked ? setSelectedPhoto(photo) : onUnlockClick())}
            className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 cursor-pointer group"
          >
            <img
              src={photo.url}
              alt={photo.caption}
              loading="lazy"
              decoding="async"
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                photo.unlocked ? '' : 'filter blur-md brightness-75'
              }`}
            />

            {!photo.unlocked ? (
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-2 text-center">
                <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-md text-[#00aff0] mb-1">
                  <Lock className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full">
                  VIP
                </span>
              </div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 text-white">
                <div className="flex items-center gap-1 text-[11px] font-medium">
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                  <span>{photo.likes}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-[10002] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full bg-[#12141c] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          >
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.caption}
              className="w-full max-h-[75vh] object-contain bg-black"
            />
            <div className="p-4 flex items-center justify-between text-white">
              <span className="text-xs font-medium text-slate-300">
                {selectedPhoto.caption}
              </span>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
