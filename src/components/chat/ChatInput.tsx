import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, Mic, Image as ImageIcon, X, FileText, Globe, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Attachment } from "./ChatMessage";

interface ChatInputProps {
  onSend: (message: string, attachments: Attachment[]) => void;
  isLoading: boolean;
  showSuggestions?: boolean;
  placeholder?: string;
}

const suggestions = [
  { icon: Sparkles, text: "Explain quantum computing", color: "text-primary" },
  { icon: Globe, text: "Plan a trip to Tokyo", color: "text-primary" },
  { icon: ImageIcon, text: "Describe an artwork idea", color: "text-primary" },
];

const ChatInput = ({ onSend, isLoading, showSuggestions = true, placeholder = "Ask NovaMind anything..." }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const processFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    fileArray.forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const attachment: Attachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        type: isImage ? "image" : "file",
      };

      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          attachment.preview = e.target?.result as string;
          setAttachments((prev) => [...prev, attachment]);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachments((prev) => [...prev, attachment]);
      }
    });
  }, []);

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || isLoading) return;
    onSend(trimmed || (attachments.length > 0 ? `Sent ${attachments.length} file(s)` : ""), attachments);
    setInput("");
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-4 md:px-0">

      {/* Attachment previews */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 flex flex-wrap gap-2 overflow-hidden"
          >
            {attachments.map((att) => (
              <motion.div
                key={att.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="group relative"
              >
                {att.type === "image" && att.preview ? (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <img
                      src={att.preview}
                      alt={att.file.name}
                      className="h-20 w-20 object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-20 w-28 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-secondary">
                    <FileText size={18} className="text-primary" />
                    <span className="max-w-[90px] truncate px-1 font-display text-[10px] text-muted-foreground">
                      {att.file.name}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X size={10} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && processFiles(e.target.files)}
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files && processFiles(e.target.files)}
      />

      {/* Input area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="relative rounded-2xl border border-border bg-card transition-all focus-within:border-primary/50 focus-within:glow-border"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="w-full resize-none bg-transparent px-4 pb-12 pt-4 font-display text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Paperclip size={16} />
            </button>
            <button
              onClick={() => imageInputRef.current?.click()}
              title="Upload image"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ImageIcon size={16} />
            </button>
            <button className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              <Mic size={16} />
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={(!input.trim() && attachments.length === 0) || isLoading}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 font-display text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-30"
          >
            <Send size={13} />
            Send
          </button>
        </div>
      </div>

      <p className="mt-2 text-center font-display text-[10px] text-muted-foreground/60">
        NovaMind may make mistakes. Verify important information.
      </p>
    </div>
  );
};

export default ChatInput;
