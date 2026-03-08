import { useState } from "react";
import { Download, Trash2, Loader2, ZoomIn } from "lucide-react";
import type { GalleryImage } from "@/lib/gallery-db";

interface GalleryGridProps {
  images: GalleryImage[];
  onDelete: (id: string) => void;
  generatingPrompts?: { prompt: string; status: "pending" | "generating" | "done" | "error" }[];
}

const GalleryGrid = ({ images, onDelete, generatingPrompts = [] }: GalleryGridProps) => {
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);

  const handleDownload = async (image: GalleryImage) => {
    try {
      const resp = await fetch(image.image_url);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `novamind-${image.id.slice(0, 8)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // fallback
      window.open(image.image_url, "_blank");
    }
  };

  const activePrompts = generatingPrompts.filter((p) => p.status !== "done");

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {/* Currently generating placeholders */}
        {activePrompts.map((item, idx) => (
          <div
            key={`gen-${idx}`}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-secondary"
          >
            <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
              {item.status === "generating" ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : item.status === "error" ? (
                <span className="text-xs text-destructive">Failed</span>
              ) : (
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
              )}
              <p className="line-clamp-2 text-center text-[10px] text-muted-foreground">
                {item.prompt}
              </p>
            </div>
          </div>
        ))}

        {/* Existing gallery images */}
        {images.map((image) => (
          <div
            key={image.id}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-secondary"
          >
            <img
              src={image.image_url}
              alt={image.prompt}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
            {/* Overlay */}
            <div className="absolute inset-0 flex flex-col justify-between bg-black/0 p-2 opacity-0 transition-all group-hover:bg-black/50 group-hover:opacity-100">
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => setLightbox(image)}
                  className="rounded-lg bg-black/50 p-1.5 text-white hover:bg-black/70"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDownload(image)}
                  className="rounded-lg bg-black/50 p-1.5 text-white hover:bg-black/70"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDelete(image.id)}
                  className="rounded-lg bg-black/50 p-1.5 text-white hover:bg-destructive/80"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="line-clamp-2 text-[10px] text-white/80">{image.prompt}</p>
            </div>
          </div>
        ))}
      </div>

      {images.length === 0 && activePrompts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-muted-foreground">Koi image nahi hai abhi</p>
          <p className="text-xs text-muted-foreground">Upar prompts likh kar generate karein</p>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={lightbox.image_url}
              alt={lightbox.prompt}
              className="max-h-[85vh] rounded-lg object-contain"
            />
            <p className="mt-2 text-center text-sm text-white/70">{lightbox.prompt}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default GalleryGrid;
