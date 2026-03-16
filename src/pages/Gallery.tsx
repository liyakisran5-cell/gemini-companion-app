import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ArrowLeft, Images } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { hasActiveTrial, hasFreeAccess, isAdmin } from "@/lib/admin-db";
import BatchPromptInput from "@/components/gallery/BatchPromptInput";
import GalleryGrid from "@/components/gallery/GalleryGrid";
import {
  GalleryImage,
  loadGalleryImages,
  deleteGalleryImage,
  generateAndSaveImage,
} from "@/lib/gallery-db";
import { getUserCredits, useImageCredit, hasDailyFreeRemaining } from "@/lib/referral-db";

interface PromptStatus {
  prompt: string;
  status: "pending" | "generating" | "done" | "error";
}

const Gallery = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptStatuses, setPromptStatuses] = useState<PromptStatus[]>([]);
  const [bypassCredits, setBypassCredits] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([isAdmin(user.id), hasFreeAccess(user.id), hasActiveTrial(user.id)])
      .then(([admin, free, trial]) => setBypassCredits(admin || free || trial));
  }, [user]);

  useEffect(() => {
    loadGalleryImages()
      .then(setImages)
      .catch((e) => {
        console.error("Failed to load gallery", e);
        toast.error("Gallery load failed");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = useCallback(
    async (prompts: string[]) => {
      if (!user) return;

      // Check credits (skip for admin/free/trial)
      if (!bypassCredits) {
        const credits = await getUserCredits(user.id);
        if (credits.image_credits < prompts.length && !hasDailyFreeRemaining(credits)) {
          toast.error(
            <div className="flex flex-col gap-1">
              <span>Not enough credits! You need {prompts.length}.</span>
              <a href="https://whatsapp.com/channel/0029Vb7QLUnADTO8fMFTLT3i" target="_blank" rel="noopener noreferrer" className="text-green-500 underline text-xs">📲 Join WhatsApp Channel</a>
            </div>,
            { duration: 6000 }
          );
          return;
        }
      }

      setIsGenerating(true);

      const statuses: PromptStatus[] = prompts.map((p) => ({ prompt: p, status: "pending" }));
      setPromptStatuses(statuses);

      for (let i = 0; i < prompts.length; i++) {
        // Update current to "generating"
        setPromptStatuses((prev) =>
          prev.map((s, idx) => (idx === i ? { ...s, status: "generating" } : s))
        );

        await new Promise<void>((resolve) => {
          generateAndSaveImage(
            prompts[i],
            (image) => {
              setImages((prev) => [image, ...prev]);
              if (!bypassCredits) useImageCredit(user.id); // Deduct credit
              setPromptStatuses((prev) =>
                prev.map((s, idx) => (idx === i ? { ...s, status: "done" } : s))
              );
              toast.success(`Image ${i + 1}/${prompts.length} generated!`);
              resolve();
            },
            (error) => {
              setPromptStatuses((prev) =>
                prev.map((s, idx) => (idx === i ? { ...s, status: "error" } : s))
              );
              toast.error(`Prompt ${i + 1} failed: ${error}`);
              resolve();
            }
          );
        });

        // Small delay between requests to avoid rate limiting
        if (i < prompts.length - 1) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      setIsGenerating(false);
    },
    [user, bypassCredits]
  );

  const handleDelete = async (id: string) => {
    try {
      await deleteGalleryImage(id);
      setImages((prev) => prev.filter((img) => img.id !== id));
      toast.success("Image deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:px-8">
        <button
          onClick={() => navigate("/")}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Images className="h-5 w-5 text-primary" />
          <h1 className="font-display text-lg font-semibold text-foreground">Batch Gallery</h1>
        </div>
        <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 font-display text-[10px] font-semibold text-primary">
          {images.length} images
        </span>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Left panel — prompt input */}
        <aside className="w-full shrink-0 border-b border-border p-4 md:w-80 md:border-b-0 md:border-r md:overflow-y-auto">
          <BatchPromptInput onGenerate={handleGenerate} isGenerating={isGenerating} />
        </aside>

        {/* Right panel — gallery grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <GalleryGrid
            images={images}
            onDelete={handleDelete}
            generatingPrompts={promptStatuses}
          />
        </div>
      </div>
    </div>
  );
};

export default Gallery;
