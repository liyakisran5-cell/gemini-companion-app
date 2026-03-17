import type { Attachment } from "@/components/chat/ChatMessage";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  images?: string[];
}

export interface ImageGenerationResult {
  type: "image_generation";
  content: string;
  images: string[];
}

// Image generation can take 30-90 seconds, so we use a generous timeout
const IMAGE_TIMEOUT_MS = 120_000; // 2 minutes
const CHAT_TIMEOUT_MS = 60_000; // 1 minute

async function getAuthToken(): Promise<string> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
}

export async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
  onImageGenerated,
}: {
  messages: ChatMessage[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  onImageGenerated?: (result: ImageGenerationResult) => void;
}) {
  try {
    const token = await getAuthToken();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);

    let resp: Response;
    try {
      resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === "AbortError") {
        onError("Request timed out. Image generation can take a while — please try again.");
        return;
      }
      throw fetchErr;
    }
    clearTimeout(timeoutId);

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({ error: "Request failed" }));
      onError(body.error || `Error ${resp.status}`);
      return;
    }

    if (!resp.body) {
      onError("No response body");
      return;
    }

    const contentType = resp.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data: ImageGenerationResult = await resp.json();
      if (data.type === "image_generation" && onImageGenerated) {
        onImageGenerated(data);
      } else {
        onDelta(data.content || "");
      }
      onDone();
      return;
    }

    // Standard SSE streaming
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (e: any) {
    if (e.name === "AbortError") {
      onError("Request timed out. Please try again.");
    } else {
      onError(e instanceof Error ? e.message : "Connection failed");
    }
  }
}

/** Edit an existing image via AI */
export async function editImage({
  imageUrl,
  editPrompt,
  onResult,
  onError,
}: {
  imageUrl: string;
  editPrompt: string;
  onResult: (result: ImageGenerationResult) => void;
  onError: (error: string) => void;
}) {
  try {
    const token = await getAuthToken();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);

    let resp: Response;
    try {
      resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "edit_image", imageUrl, editPrompt }),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === "AbortError") {
        onError("Image editing timed out. Please try again.");
        return;
      }
      throw fetchErr;
    }
    clearTimeout(timeoutId);

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({ error: "Request failed" }));
      onError(body.error || `Error ${resp.status}`);
      return;
    }

    const data: ImageGenerationResult = await resp.json();
    onResult(data);
  } catch (e: any) {
    if (e.name === "AbortError") {
      onError("Image editing timed out. Please try again.");
    } else {
      onError(e instanceof Error ? e.message : "Connection failed");
    }
  }
}

/** Convert Attachment[] to base64 data URL strings for image attachments */
export function attachmentsToImages(attachments: Attachment[]): string[] {
  return attachments
    .filter((a) => a.type === "image" && a.preview)
    .map((a) => a.preview!);
}
