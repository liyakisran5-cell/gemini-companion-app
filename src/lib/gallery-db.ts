import { supabase } from "@/integrations/supabase/client";

export interface GalleryImage {
  id: string;
  prompt: string;
  image_url: string;
  created_at: string;
}

export async function loadGalleryImages(): Promise<GalleryImage[]> {
  const { data, error } = await supabase
    .from("gallery_images" as any)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as any) || [];
}

export async function deleteGalleryImage(id: string): Promise<void> {
  const { error } = await supabase.from("gallery_images" as any).delete().eq("id", id);
  if (error) throw error;
}

export async function generateAndSaveImage(
  prompt: string,
  onResult: (image: GalleryImage) => void,
  onError: (error: string) => void
) {
  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) {
      onError("Not authenticated");
      return;
    }

    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/batch-generate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      }
    );

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({ error: "Request failed" }));
      onError(body.error || `Error ${resp.status}`);
      return;
    }

    const data = await resp.json();
    if (data.success && data.image) {
      onResult(data.image);
    } else {
      onError(data.error || "Generation failed");
    }
  } catch (e) {
    onError(e instanceof Error ? e.message : "Connection failed");
  }
}
