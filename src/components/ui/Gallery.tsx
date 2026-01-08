import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/solid';
import { cn } from '../../utils/cn';

interface Image {
  src: string;
}

interface GalleryProps {
  images?: (Image | string)[];
  onDelete?: (img: Image | string, index: number) => void;
}

const Gallery: React.FC<GalleryProps> = ({ images = [], onDelete }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => setSelectedIndex(index);
  const closeLightbox = () => setSelectedIndex(null);

  const handlePrev = (e: React.MouseEvent | KeyboardEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e: React.MouseEvent | KeyboardEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev !== null && prev < images.length - 1 ? prev + 1 : 0));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') handlePrev(e);
      if (e.key === 'ArrowRight') handleNext(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, images.length]);

  if (!images.length) return null;

  return (
    <>
      {/* Thumbnail Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((img, idx) => (
          <div 
            key={idx} 
            className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 cursor-pointer"
            onClick={() => openLightbox(idx)}
          >
            <img 
              src={typeof img === 'string' ? img : img.src} 
              alt={`Gallery item ${idx}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <ArrowsPointingOutIcon className="h-6 w-6 text-white drop-shadow-md" />
            </div>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(img, idx);
                }}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedIndex !== null && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm">
          {/* Close Button */}
          <button 
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50"
          >
            <XMarkIcon className="h-8 w-8" />
          </button>

          {/* Navigation Buttons */}
          {images.length > 1 && (
            <>
              <button 
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50"
              >
                <ChevronLeftIcon className="h-10 w-10" />
              </button>
              <button 
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50"
              >
                <ChevronRightIcon className="h-10 w-10" />
              </button>
            </>
          )}

          {/* Main Image */}
          <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-12">
            <img 
              src={typeof images[selectedIndex] === 'string' ? images[selectedIndex] as string : (images[selectedIndex] as Image).src} 
              alt="Fullscreen view"
              className="max-w-full max-h-full object-contain shadow-2xl"
            />
            
            {/* Counter */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 font-medium px-4 py-1 bg-black/50 rounded-full backdrop-blur-md">
              {selectedIndex + 1} / {images.length}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default Gallery;
