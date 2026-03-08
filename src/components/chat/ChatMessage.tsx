import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Bot, User, FileText, Copy, Check, RefreshCw, ThumbsUp, ThumbsDown, Download, Video, Play, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { editImage, ImageGenerationResult } from "@/lib/chat-stream";

export interface Attachment {
  id: string;
  file: File;
  preview?: string;
  type: "image" | "file";
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  generatedImages?: string[]; // base64 data URLs from AI image generation
  generatedVideo?: {
    url: string;
    model: string;
    resolution: string;
    duration: number;
    aspectRatio: string;
  };
  videoProgress?: number; // 0-100 progress for video generation
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onImageEdited?: (result: ImageGenerationResult) => void;
}

/** Parse content: strip any JSON action blocks the AI might have output and extract image URLs */
function parseActionContent(content: string): { text: string; extractedImages: string[] } {
  const extractedImages: string[] = [];
  
  // Match JSON blocks: fenced code blocks with JSON, or raw JSON objects with "action" key
  const jsonPattern = /```(?:json)?\s*\{[\s\S]*?\}\s*```|\{[\s\n]*"action"\s*:\s*"[^"]*"[\s\S]*?\}/g;
  
  const cleaned = content.replace(jsonPattern, (match) => {
    try {
      const jsonStr = match.startsWith("```") 
        ? match.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "") 
        : match;
      const parsed = JSON.parse(jsonStr);
      
      // Extract image URL if present
      const url = parsed?.action_input?.url 
        || parsed?.action_input?.image_url 
        || parsed?.url 
        || parsed?.image_url
        || parsed?.output;
      
      if (url && typeof url === "string" && (url.startsWith("http") || url.startsWith("data:"))) {
        extractedImages.push(url);
      }
      
      // Try to extract the prompt for a friendly message
      let prompt = "";
      if (typeof parsed?.action_input === "string") {
        try {
          const inner = JSON.parse(parsed.action_input);
          prompt = inner?.prompt || "";
        } catch {
          prompt = parsed.action_input;
        }
      } else {
        prompt = parsed?.action_input?.prompt || parsed?.action_input?.text || "";
      }
      
      // Always strip the JSON — replace with a friendly message or nothing
      if (prompt) return `🎨 *Generating: ${prompt.slice(0, 100)}${prompt.length > 100 ? "..." : ""}*`;
      return "";
    } catch { /* not valid JSON, leave as-is */ }
    return match;
  });

  return { text: cleaned.trim(), extractedImages };
}

const ChatMessage = ({ message, isStreaming, onRegenerate, onImageEdited }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const attachments = message.attachments || [];
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [editingImageIdx, setEditingImageIdx] = useState<number | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditingImage, setIsEditingImage] = useState(false);

  const { text: parsedContent, extractedImages } = useMemo(
    () => (isUser ? { text: message.content, extractedImages: [] } : parseActionContent(message.content)),
    [message.content, isUser]
  );

  const allGeneratedImages = [
    ...(message.generatedImages || []),
    ...extractedImages,
  ];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`group flex gap-3 px-4 py-4 md:px-8`}
    >
      <div
        className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-chat-ai-border bg-chat-ai text-primary"
        }`}
      >
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="mb-1 font-display text-xs font-medium text-muted-foreground">
          {isUser ? "You" : "NovaMind"}
        </p>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((att) =>
              att.type === "image" && att.preview ? (
                <div
                  key={att.id}
                  className="overflow-hidden rounded-xl border border-border"
                >
                  <img
                    src={att.preview}
                    alt={att.file.name}
                    className="h-40 w-auto max-w-[240px] object-cover"
                  />
                </div>
              ) : (
                <div
                  key={att.id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2"
                >
                  <FileText size={14} className="shrink-0 text-primary" />
                  <span className="max-w-[180px] truncate font-display text-xs text-foreground">
                    {att.file.name}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {(att.file.size / 1024).toFixed(0)}KB
                  </span>
                </div>
              )
            )}
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-3 font-display text-sm leading-relaxed ${
            isUser
              ? "bg-chat-user text-foreground"
              : "bg-transparent text-foreground/90"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
              <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-primary prose-code:rounded prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-xs prose-code:text-primary prose-pre:bg-secondary prose-pre:border prose-pre:border-border">
                <ReactMarkdown>{parsedContent}</ReactMarkdown>
              </div>
              {allGeneratedImages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {allGeneratedImages.map((imgUrl, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="group/img relative overflow-hidden rounded-xl border border-border">
                        <img
                          src={imgUrl}
                          alt={`Generated image ${idx + 1}`}
                          className="max-h-[400px] w-auto max-w-full object-contain"
                        />
                        <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 transition-opacity group-hover/img:opacity-100">
                          <button
                            onClick={() => setEditingImageIdx(editingImageIdx === idx ? null : idx)}
                            title="Edit image"
                            className="rounded-lg bg-background/80 p-2 text-foreground backdrop-blur-sm transition-colors hover:bg-background"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = imgUrl;
                              link.download = `novamind-image-${Date.now()}-${idx + 1}.png`;
                              link.click();
                            }}
                            title="Download image"
                            className="rounded-lg bg-background/80 p-2 text-foreground backdrop-blur-sm transition-colors hover:bg-background"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </div>
                      {editingImageIdx === idx && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && editPrompt.trim() && !isEditingImage) {
                                setIsEditingImage(true);
                                editImage({
                                  imageUrl: imgUrl,
                                  editPrompt: editPrompt.trim(),
                                  onResult: (result) => {
                                    setIsEditingImage(false);
                                    setEditingImageIdx(null);
                                    setEditPrompt("");
                                    onImageEdited?.(result);
                                  },
                                  onError: (err) => {
                                    setIsEditingImage(false);
                                    toast.error(err);
                                  },
                                });
                              }
                            }}
                            placeholder="Describe your edit (e.g. 'make it darker')"
                            className="flex-1 rounded-lg border border-border bg-secondary px-3 py-1.5 font-display text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            disabled={isEditingImage}
                          />
                          <button
                            onClick={() => {
                              if (!editPrompt.trim() || isEditingImage) return;
                              setIsEditingImage(true);
                              editImage({
                                imageUrl: imgUrl,
                                editPrompt: editPrompt.trim(),
                                onResult: (result) => {
                                  setIsEditingImage(false);
                                  setEditingImageIdx(null);
                                  setEditPrompt("");
                                  onImageEdited?.(result);
                                },
                                onError: (err) => {
                                  setIsEditingImage(false);
                                  toast.error(err);
                                },
                              });
                            }}
                            disabled={!editPrompt.trim() || isEditingImage}
                            className="rounded-lg bg-primary px-3 py-1.5 font-display text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                          >
                            {isEditingImage ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Video generation progress */}
              {message.videoProgress !== undefined && message.videoProgress < 100 && !message.generatedVideo && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Video size={14} className="animate-pulse text-primary" />
                    <span className="font-display text-xs">Generating video...</span>
                    <span className="font-mono text-[10px] text-primary">{message.videoProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${message.videoProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
              {/* Generated video */}
              {message.generatedVideo && (
                <div className="group/vid mt-4 space-y-2">
                  <div className="relative overflow-hidden rounded-xl border border-border bg-secondary/50">
                    <video
                      src={message.generatedVideo.url}
                      controls
                      className="w-full max-h-[400px]"
                      style={{
                        aspectRatio: message.generatedVideo.aspectRatio.replace(":", "/"),
                      }}
                    >
                      Your browser does not support video playback.
                    </video>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-secondary px-2 py-0.5 font-display text-[10px] font-medium text-muted-foreground">
                        {message.generatedVideo.model === "sora-2" ? "Sora 2" : "Veo 3.1"}
                      </span>
                      <span className="font-display text-[10px] text-muted-foreground">
                        {message.generatedVideo.resolution} · {message.generatedVideo.duration}s · {message.generatedVideo.aspectRatio}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = message.generatedVideo!.url;
                        link.download = `novamind-video-${Date.now()}.mp4`;
                        link.click();
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 font-display text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <Download size={12} />
                      Download
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          {isStreaming && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="ml-0.5 inline-block h-4 w-1.5 rounded-sm bg-primary"
            />
          )}
        </div>

        {/* Action buttons for assistant messages */}
        {!isUser && !isStreaming && message.content && (
          <div className="mt-1.5 flex items-center gap-0.5 opacity-100 md:opacity-0 transition-opacity md:group-hover:opacity-100">
            <button
              onClick={handleCopy}
              title="Copy"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                title="Regenerate"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <RefreshCw size={14} />
              </button>
            )}
            <button
              onClick={() => setRating(rating === "up" ? null : "up")}
              title="Good response"
              className={`rounded-md p-1.5 transition-colors ${
                rating === "up"
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <ThumbsUp size={14} />
            </button>
            <button
              onClick={() => setRating(rating === "down" ? null : "down")}
              title="Bad response"
              className={`rounded-md p-1.5 transition-colors ${
                rating === "down"
                  ? "text-destructive"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <ThumbsDown size={14} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ChatMessage;
