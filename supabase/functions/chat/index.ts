import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const CHAT_MODEL = "google/gemini-3-flash-preview";
const IMAGE_MODEL = "google/gemini-3-pro-image-preview";

const IMAGE_KEYWORDS = [
  "generate an image", "create an image", "make an image",
  "generate a picture", "create a picture", "make a picture",
  "draw me", "draw a", "paint me", "design a",
  "generate image", "create image", "make image",
  "generate picture", "create picture", "make picture",
  "generate a photo", "create a photo", "make a photo",
  "generate photo", "create photo", "make photo",
  "create thumbnail", "make thumbnail", "generate thumbnail",
  "create a thumbnail", "make a thumbnail", "generate a thumbnail",
  "create logo", "make logo", "design logo",
  "create a logo", "make a logo", "design a logo",
  "pic of", "photo of", "picture of", "image of",
  "pic bana", "photo bana", "image bana",
  "banao", "bana do", "bana dein",
  "تصویر بنائیں", "تصویر بناؤ", "تصویر بنا", "تصویر بنا دو",
  "فوٹو بنائیں", "فوٹو بناؤ", "فوٹو بنا",
  "پک بنائیں", "پک بناؤ", "پک بنا",
  "لوگو بنائیں", "لوگو بناؤ", "لوگو بنا",
  "تھمبنیل بنائیں", "تھمبنیل بناؤ", "تھمبنیل بنا",
  "फोटो बनाओ", "इमेज बनाओ", "तस्वीर बनाओ",
  "creat", "create pic", "make pic",
];

function isImageRequest(messages: any[]): boolean {
  const last = [...messages].reverse().find((m: any) => m.role === "user");
  if (!last) return false;
  const text = typeof last.content === "string" ? last.content : "";
  const lower = text.toLowerCase();
  return IMAGE_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT Authentication - block unauthenticated requests
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing API key" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { messages, action, imageUrl, editPrompt } = body;

    // Handle image editing
    if (action === "edit_image") {
      const response = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: IMAGE_MODEL,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: editPrompt || "Edit this image" },
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
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "Image editing failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const editedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const textContent = data.choices?.[0]?.message?.content || "Here's your edited image.";

      return new Response(
        JSON.stringify({
          type: "image_generation",
          content: textContent,
          images: editedImage ? [editedImage] : [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle image generation requests
    if (isImageRequest(messages)) {
      const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
      const prompt = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "Generate an image";

      const response = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: IMAGE_MODEL,
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("Image generation error:", response.status, t);
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "Image generation failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const textContent = data.choices?.[0]?.message?.content || "Here's your generated image!";

      // Try to upload to storage using already-authenticated userId
      let imageUrl = generatedImage;
      try {
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        if (userId && generatedImage) {
          const base64Data = generatedImage.replace(/^data:image\/\w+;base64,/, "");
          const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
          const fileName = `${user.id}/${crypto.randomUUID()}.png`;

          const { error: uploadError } = await supabase.storage
            .from("gallery")
            .upload(fileName, imageBytes, { contentType: "image/png" });

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;

            // Save to gallery_images table
            await supabase
              .from("gallery_images")
              .insert({ user_id: user.id, prompt, image_url: imageUrl });
          }
        }
      } catch (e) {
        console.error("Storage upload skipped:", e);
        // Still return the base64 image even if storage fails
      }

      return new Response(
        JSON.stringify({
          type: "image_generation",
          content: textContent,
          images: imageUrl ? [imageUrl] : [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Regular chat - streaming
    const response = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: "system", content: "You are NovaMind, a helpful AI assistant. Be friendly and professional." },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI error: " + response.status }),
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
