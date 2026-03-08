import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Bot, User, FileText, Copy, Check, RefreshCw, ThumbsUp, ThumbsDown, Download, Video, Play } from "lucide-react";
import { toast } from "sonner";

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
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: () => void;
}

/** Parse content for JSON action blocks (e.g. DALL-E) and extract images/text */
function parseActionContent(content: string): { text: string; extractedImages: string[] } {
  const extractedImages: string[] = [];
  // Match JSON blocks that look like action objects
  const jsonPattern = /```(?:json)?\s*(\{[\s\S]*?\})\s*```|\{[\s\n]*"action"\s*:\s*"[^"]*"[\s\S]*?\}/g;
  
  const cleaned = content.replace(jsonPattern, (match) => {
    try {
      const jsonStr = match.startsWith("```") 
        ? match.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "") 
        : match;
      const parsed = JSON.parse(jsonStr);
      
      // Extract image URL from various action formats
      const url = parsed?.action_input?.url 
        || parsed?.action_input?.image_url 
        || parsed?.url 
        || parsed?.image_url
        || parsed?.output;
      
      if (url && typeof url === "string" && (url.startsWith("http") || url.startsWith("data:"))) {
        extractedImages.push(url);
        const prompt = parsed?.action_input?.prompt || parsed?.action_input?.text || "";
        return prompt ? `*Generated image: ${prompt}*` : "";
      }
      // If it's an action JSON but no URL yet, show a friendly message
      if (parsed?.action) {
        const prompt = parsed?.action_input?.prompt || parsed?.action_input?.text || "";
        return prompt ? `*Generating image: ${prompt}...*` : "";
      }
    } catch { /* not valid JSON, leave as-is */ }
    return match;
  });

  return { text: cleaned.trim(), extractedImages };
}

const ChatMessage = ({ message, isStreaming, onRegenerate }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const attachments = message.attachments || [];
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);

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
                    <div
                      key={idx}
                      className="group/img relative overflow-hidden rounded-xl border border-border"
                    >
                      <img
                        src={imgUrl}
                        alt={`Generated image ${idx + 1}`}
                        className="max-h-[400px] w-auto max-w-full object-contain"
                      />
                      <button
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = imgUrl;
                          link.download = `novamind-image-${Date.now()}-${idx + 1}.png`;
                          link.click();
                        }}
                        title="Download image"
                        className="absolute bottom-2 right-2 rounded-lg bg-background/80 p-2 text-foreground opacity-0 backdrop-blur-sm transition-opacity hover:bg-background group-hover/img:opacity-100"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  ))}
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
