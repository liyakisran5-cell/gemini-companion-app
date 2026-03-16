import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IMAGE_KEYWORDS = [
  "generate an image", "create an image", "make an image",
  "generate a picture", "create a picture", "make a picture",
  "draw me", "draw a", "paint me", "design a",
  "تصویر بنائیں", "تصویر بناؤ", "تصویر بنا",
  "फोटो बनाओ", "इमेज बनाओ",
];

function isImageRequest(messages: any[]): boolean {
  const last = [...messages].reverse().find((m: any) => m.role === "user");
  if (!last) return false;
  const text = typeof last.content === "string" ? last.content : "";
  return IMAGE_KEYWORDS.some((kw) => text.toLowerCase().includes(kw.toLowerCase()));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const body = await req.json();
    const { messages } = body;

    if (isImageRequest(messages)) {
      return new Response(
        JSON.stringify({
          type: "image_generation",
          content: "Image generation requires Lovable credits. Please upgrade your plan.",
          images: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiMessages = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: typeof m.content === "string" ? m.content : "" }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: "You are NovaMind, a helpful AI assistant. Be friendly and professional." }],
          },
          contents: geminiMessages,
        }),
      }
    );

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI error: " + response.status }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") continue;
            try {
              const parsed = JSON.parse(json);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                controller.enqueue(new TextEncoder().encode(
                  `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`
                ));
              }
            } catch {}
          }
        }
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
