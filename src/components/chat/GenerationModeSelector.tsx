import { motion } from "framer-motion";
import { Image as ImageIcon, Video, MessageCircle } from "lucide-react";

export type GenerationMode = "image" | "video" | "chat";

interface GenerationModeSelectorProps {
  mode: GenerationMode;
  onChange: (mode: GenerationMode) => void;
}

const modes = [
  { value: "image" as const, label: "Image Generation", icon: ImageIcon },
  { value: "video" as const, label: "Video Generation", icon: Video },
  { value: "chat" as const, label: "Chat", icon: MessageCircle },
];

const GenerationModeSelector = ({ mode, onChange }: GenerationModeSelectorProps) => {
  return (
    <div className="inline-flex rounded-xl border border-border bg-card p-1">
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className="relative flex items-center gap-1.5 rounded-lg px-4 py-2 font-display text-xs font-medium transition-colors"
        >
          {mode === m.value && (
            <motion.div
              layoutId="mode-bg"
              className="absolute inset-0 rounded-lg bg-primary"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className={`relative z-10 flex items-center gap-1.5 ${mode === m.value ? "text-primary-foreground" : "text-muted-foreground"}`}>
            <m.icon size={14} />
            {m.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default GenerationModeSelector;
