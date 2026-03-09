import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const IMAGE_MODEL = "google/gemini-3-pro-image-preview";
const CHAT_MODEL = "google/gemini-3-flash-preview";

// Keywords that indicate an image generation request (multilingual)
const IMAGE_KEYWORDS = [
  "generate an image", "generate image", "generate a image",
  "create an image", "create image", "create a image",
  "make an image", "make image", "make a image",
  "generate a picture", "generate picture", "create a picture", "create picture",
  "make a picture", "make picture",
  "generate a photo", "create a photo", "make a photo",
  "generate a thumbnail", "create a thumbnail", "make a thumbnail",
  "create thumbnail", "generate thumbnail", "make thumbnail",
  "generate a wallpaper", "create a wallpaper", "make a wallpaper",
  "create wallpaper", "generate wallpaper", "make wallpaper",
  "generate a logo", "create a logo", "make a logo",
  "generate a illustration", "create a illustration", "create an illustration",
  "draw me", "draw a", "draw an", "draw the",
  "paint me", "paint a", "paint an", "paint the",
  "sketch me", "sketch a", "sketch an", "sketch the",
  "show me an image", "show me a picture", "show me a photo",
  "design a", "design an", "design me",
  // Short/casual triggers
  "pic of", "pic for", "a pic", "my pic", "make pic", "create pic", "generate pic",
  "photo of", "photo for", "a photo", "my photo", "make photo",
  "image of", "image for", "a image", "an image",
  "picture of", "picture for", "a picture",
  "wallpaper of", "wallpaper for", "thumbnail of", "thumbnail for",
  "logo of", "logo for",
  "banner of", "banner for", "make banner", "create banner",
  "poster of", "poster for", "make poster", "create poster",
  "icon of", "icon for", "make icon", "create icon",
  // Urdu
  "تصویر بنائیں", "تصویر بناؤ", "تصویر بنا دو", "تصویر بنا",
  "فوٹو بنائیں", "فوٹو بناؤ", "فوٹو بنا دو",
  "تھمب نیل بنائیں", "تھمب نیل بناؤ", "تھمب نیل بنا",
  "پینٹ کرو", "ڈرا کرو", "پک بناؤ", "پک بنا", "پک بنائیں",
  // Hindi
  "तस्वीर बनाओ", "तस्वीर बनाएं", "चित्र बनाओ", "चित्र बनाएं",
  "फोटो बनाओ", "फोटो बनाएं", "इमेज बनाओ", "इमेज बनाएं",
  "थंबनेल बनाओ", "थंबनेल बनाएं",
  "ड्रा करो", "पेंट करो", "पिक बनाओ", "पिक बनाएं",
];

// Patterns: short phrases like "X pic", "X photo", "create X pic"
const SHORT_IMAGE_PATTERNS = [
  /\b(pic|photo|image|picture|logo|banner|poster|wallpaper|thumbnail)\b/i,
];

// Patterns that indicate a visual scene description (should route to image generation)
const SCENE_PATTERNS = [
  /^a\s+(dynamic|cinematic|dramatic|beautiful|stunning|realistic|detailed|photorealistic)\s+(shot|scene|view|image|picture|photo|portrait|landscape)/i,
  /^(a|an|the)\s+\w+\s+(shot|scene|view)\s+of/i,
  /\b(cinematic|photorealistic|hyper-?realistic|8k|4k|ultra.?hd)\b.*\b(shot|scene|view|image|render)\b/i,
  /\b(camera|tracking shot|wide angle|close.?up|aerial|drone)\b/i,
];

function getTextContent(messages: any[]): string {
  const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
  if (!lastUserMsg) return "";
  if (typeof lastUserMsg.content === "string") return lastUserMsg.content;
  if (Array.isArray(lastUserMsg.content)) {
    return lastUserMsg.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join(" ");
  }
  return "";
}

function isImageRequest(messages: any[]): boolean {
  const content = getTextContent(messages);
  const lower = content.toLowerCase();
  // Check explicit keywords
  if (IMAGE_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()))) return true;
  // Check short casual patterns like "Imran Khan pic", "cat photo"
  if (SHORT_IMAGE_PATTERNS.some((pat) => pat.test(content))) return true;
  // Check scene description patterns (descriptive prompts that are clearly visual)
  if (SCENE_PATTERNS.some((pat) => pat.test(content))) return true;
  return false;
}

function handleError(status: number, fallbackMsg: string) {
  if (status === 429) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (status === 402) {
    return new Response(
      JSON.stringify({ error: "AI credits exhausted. Please add credits in your workspace settings." }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  return new Response(
    JSON.stringify({ error: fallbackMsg }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, action, imageUrl, editPrompt } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    };

    // === Image Editing ===
    if (action === "edit_image") {
      if (!imageUrl || !editPrompt) {
        return new Response(
          JSON.stringify({ error: "imageUrl and editPrompt are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          model: IMAGE_MODEL,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: editPrompt },
                { type: "image_url", image_url: { url: imageUrl } },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("Image edit error:", response.status, t);
        return handleError(response.status, "Image editing failed");
      }

      const data = await response.json();
      const textContent = data.choices?.[0]?.message?.content || "Here's your edited image:";
      const images = data.choices?.[0]?.message?.images || [];

      return new Response(
        JSON.stringify({
          type: "image_generation",
          content: textContent,
          images: images.map((img: any) => img.image_url?.url || img),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === Transform messages for multimodal ===
    const transformedMessages = messages.map((msg: any) => {
      if (msg.role === "user" && msg.images && msg.images.length > 0) {
        const content: any[] = [];
        if (msg.content) content.push({ type: "text", text: msg.content });
        for (const img of msg.images) {
          content.push({ type: "image_url", image_url: { url: img } });
        }
        return { role: "user", content };
      }
      return { role: msg.role, content: msg.content };
    });

    // === Image Generation ===
    if (isImageRequest(transformedMessages)) {
      const userText = getTextContent(transformedMessages);

      const response = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          model: IMAGE_MODEL,
          messages: [{ role: "user", content: userText }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("Image generation error:", response.status, t);
        return handleError(response.status, "Image generation failed");
      }

      const data = await response.json();
      const textContent = data.choices?.[0]?.message?.content || "Here's your generated image:";
      const images = data.choices?.[0]?.message?.images || [];

      return new Response(
        JSON.stringify({
          type: "image_generation",
          content: textContent,
          images: images.map((img: any) => img.image_url?.url || img),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === Standard text streaming ===
    const response = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are NovaMind, a helpful and intelligent AI assistant. You provide clear, concise, and well-formatted responses using markdown. When analyzing images, describe what you see in detail and provide helpful insights. Be friendly and professional.\n\nCRITICAL RULES:\n1. NEVER output JSON objects, code blocks with JSON, or tool-call-like structures in your responses. No {\"action\": ...}, no dalle references, no function calls.\n2. You CANNOT generate, create, or draw images. If a user wants an image, tell them to start their message with 'Generate an image of...' or 'Create a picture of...' to activate the image generation feature.\n3. If a user sends a descriptive scene (e.g. 'A cinematic shot of...'), respond naturally by discussing the scene - do NOT attempt to call any tools or output JSON.\n4. Keep all responses as plain text with markdown formatting only.",
          },
          ...transformedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return handleError(response.status, "AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
