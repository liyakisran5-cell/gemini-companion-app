import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Keywords that indicate an image generation request (multilingual)
const IMAGE_KEYWORDS = [
  // English - broad patterns
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
  // Urdu
  "تصویر بنائیں", "تصویر بناؤ", "تصویر بنا دو", "تصویر بنا",
  "فوٹو بنائیں", "فوٹو بناؤ", "فوٹو بنا دو",
  "تھمب نیل بنائیں", "تھمب نیل بناؤ", "تھمب نیل بنا",
  "پینٹ کرو", "ڈرا کرو",
  // Hindi
  "तस्वीर बनाओ", "तस्वीर बनाएं", "चित्र बनाओ", "चित्र बनाएं",
  "फोटो बनाओ", "फोटो बनाएं", "इमेज बनाओ", "इमेज बनाएं",
  "थंबनेल बनाओ", "थंबनेल बनाएं",
  "ड्रा करो", "पेंट करो",
];

function isImageRequest(messages: any[]): boolean {
  // Check the last user message
  const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
  if (!lastUserMsg) return false;
  const content = typeof lastUserMsg.content === "string"
    ? lastUserMsg.content.toLowerCase()
    : Array.isArray(lastUserMsg.content)
      ? lastUserMsg.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join(" ").toLowerCase()
      : "";
  return IMAGE_KEYWORDS.some((kw) => content.includes(kw.toLowerCase()));
}

function getLastUserText(messages: any[]): string {
  const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
  if (!lastUserMsg) return "";
  if (typeof lastUserMsg.content === "string") return lastUserMsg.content;
  if (Array.isArray(lastUserMsg.content)) {
    return lastUserMsg.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join(" ");
  }
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Transform messages: convert image attachments to multimodal content
    const transformedMessages = messages.map((msg: any) => {
      if (msg.role === "user" && msg.images && msg.images.length > 0) {
        const content: any[] = [];
        if (msg.content) {
          content.push({ type: "text", text: msg.content });
        }
        for (const img of msg.images) {
          content.push({
            type: "image_url",
            image_url: { url: img },
          });
        }
        return { role: "user", content };
      }
      return { role: msg.role, content: msg.content };
    });

    // Check if this is an image generation request
    if (isImageRequest(transformedMessages)) {
      const userText = getLastUserText(transformedMessages);

      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [
              {
                role: "user",
                content: userText,
              },
            ],
            modalities: ["image", "text"],
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add credits in your workspace settings." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const t = await response.text();
        console.error("Image generation error:", response.status, t);
        return new Response(
          JSON.stringify({ error: "Image generation failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const textContent = data.choices?.[0]?.message?.content || "Here's your generated image:";
      const images = data.choices?.[0]?.message?.images || [];

      // Return as a JSON response (not streaming) with a special type
      return new Response(
        JSON.stringify({
          type: "image_generation",
          content: textContent,
          images: images.map((img: any) => img.image_url?.url || img),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Standard text streaming response
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "You are NovaMind, a helpful and intelligent AI assistant. You provide clear, concise, and well-formatted responses using markdown. When analyzing images, describe what you see in detail and provide helpful insights. Be friendly and professional. IMPORTANT: You do NOT have the ability to generate, create, or draw images yourself in text mode. If a user asks you to generate an image, tell them to use keywords like 'generate an image of...' or 'create a thumbnail of...' so the image generation feature activates automatically. Never output fake JSON actions or pretend to call image generation tools.",
            },
            ...transformedMessages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in your workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
