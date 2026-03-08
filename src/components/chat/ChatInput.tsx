import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Mic, Image, Globe, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

const suggestions = [
  { icon: Sparkles, text: "Explain quantum computing", color: "text-primary" },
  { icon: Globe, text: "Plan a trip to Tokyo", color: "text-primary" },
  { icon: Image, text: "Describe an artwork idea", color: "text-primary" },
];

const ChatInput = ({ onSend, isLoading }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-4 md:px-0">
      {/* Suggestion chips - only show when no messages context */}
      <div className="mb-3 flex flex-wrap gap-2">
        {suggestions.map((s, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onSend(s.text)}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 font-display text-xs text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground"
          >
            <s.icon size={13} className={s.color} />
            {s.text}
          </motion.button>
        ))}
      </div>

      {/* Input area */}
      <div className="relative rounded-2xl border border-border bg-card transition-all focus-within:border-primary/50 focus-within:glow-border">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask NovaMind anything..."
          rows={1}
          className="w-full resize-none bg-transparent px-4 pb-12 pt-4 font-display text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex gap-1">
            <button className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              <Paperclip size={16} />
            </button>
            <button className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              <Mic size={16} />
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
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
