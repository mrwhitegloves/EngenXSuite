import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, X, ZoomIn, ZoomOut } from 'lucide-react';

const iconButton =
  'rounded-full bg-black/50 p-2 text-white hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-30';

/**
 * The pictures of a chat on the full screen: zoom, the previous and next picture (also with the
 * arrow keys), download. Built on the browser's <dialog> (focus stays inside, Escape closes).
 * @param {{ images: { id: string, url: string, caption?: string, fileName?: string }[],
 *           startId: string, onClose: () => void }} props
 */
export default function ImageViewer({ images, startId, onClose }) {
  const ref = useRef(null);
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      images.findIndex((image) => image.id === startId),
    ),
  );
  const [isZoomed, setIsZoomed] = useState(false);
  const image = images[index];

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const go = (step) => {
    setIsZoomed(false);
    setIndex((current) => Math.min(images.length - 1, Math.max(0, current + step)));
  };

  if (!image) return null;
  return (
    <dialog
      ref={ref}
      aria-label="Picture"
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') go(-1);
        if (event.key === 'ArrowRight') go(1);
      }}
      className="m-0 h-full max-h-full w-full max-w-full bg-black/90 p-0 text-white backdrop:bg-black/80"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 p-3">
          <p className="min-w-0 truncate text-sm">
            {image.fileName ?? 'Picture'} · {index + 1} of {images.length}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className={iconButton}
              aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
              onClick={() => setIsZoomed((value) => !value)}
            >
              {isZoomed ? (
                <ZoomOut size={18} aria-hidden="true" />
              ) : (
                <ZoomIn size={18} aria-hidden="true" />
              )}
            </button>
            <a
              href={image.url}
              download={image.fileName ?? true}
              className={iconButton}
              aria-label="Download"
            >
              <Download size={18} aria-hidden="true" />
            </a>
            <button type="button" className={iconButton} aria-label="Close" onClick={onClose}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto">
          <button
            type="button"
            className={`${iconButton} absolute left-3 z-10`}
            aria-label="Previous picture"
            disabled={index === 0}
            onClick={() => go(-1)}
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <img
            src={image.url}
            alt={image.caption || image.fileName || 'Picture'}
            onClick={() => setIsZoomed((value) => !value)}
            className={
              isZoomed
                ? 'max-w-none cursor-zoom-out'
                : 'max-h-full max-w-full cursor-zoom-in object-contain'
            }
          />
          <button
            type="button"
            className={`${iconButton} absolute right-3 z-10`}
            aria-label="Next picture"
            disabled={index === images.length - 1}
            onClick={() => go(1)}
          >
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        </div>
        {image.caption && <p className="p-3 text-center text-sm">{image.caption}</p>}
      </div>
    </dialog>
  );
}
