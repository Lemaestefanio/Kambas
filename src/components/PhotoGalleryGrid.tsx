import { useSiteContent } from '../cms/SiteContent';
import React, { useState } from 'react';
import { Lock, Heart } from 'lucide-react';
import { Creator, MediaPhoto } from '../types';
import { MediaPreview } from './MediaPreview';
import { isMediaPublic } from '../utils/mediaPreview';

interface PhotoGalleryGridProps {
  creator: Creator;
  onUnlockClick: () => void;
}

export const PhotoGalleryGrid: React.FC<PhotoGalleryGridProps> = ({
  creator,
  onUnlockClick,
}) => {
  const { copy } = useSiteContent();
  const [selectedPhoto, setSelectedPhoto] = useState<MediaPhoto | null>(null);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {copy('home.photos.title')}
          </h3>
          <p className="text-xs text-slate-500">
            {copy('home.photos.count', { count: creator.stats.photos })}
          </p>
        </div>

        <button
          onClick={onUnlockClick}
          className="text-xs font-bold text-[#00aff0] hover:underline"
        >
          {copy('home.photos.unlock')}
        </button>
      </div>

      {/* Grid of 3 columns */}
      <div className="grid grid-cols-3 gap-2">
        {creator.galleryPhotos.map((photo) => <div key={photo.id} className="overflow-hidden rounded-xl border border-slate-100 bg-white">
          {isMediaPublic(photo) ? <button type="button" onClick={() => setSelectedPhoto(photo)} aria-label={photo.caption} className="relative block w-full cursor-pointer group">
            <MediaPreview kind="image" src={photo.url} alt={photo.caption} settings={photo} className="aspect-square w-full transition-transform duration-300 group-hover:scale-105" />
            <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" /><span>{photo.likes}</span>
            </span>
          </button> : <>
            <MediaPreview kind="image" src={photo.url} alt={photo.caption} settings={photo} className="aspect-square w-full" />
            <button type="button" onClick={onUnlockClick} aria-label={`${copy('home.photos.unlock')}: ${photo.caption}`} className="flex min-h-11 w-full items-center justify-center gap-1 bg-sky-50 px-1.5 py-2 text-[10px] font-bold text-[#008fc5] hover:bg-sky-100">
              <Lock className="h-3.5 w-3.5 shrink-0" /><span>{copy('home.photos.vip')}</span>
            </button>
          </>}
        </div>)}
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
              decoding="async"
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
                {copy('home.photos.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

