import { motion } from "framer-motion";
import { Sparkles, Code, BookOpen, Lightbulb } from "lucide-react";

interface WelcomeScreenProps {
  onSuggestion: (text: string) => void;
}

const capabilities = [
  { icon: Code, label: "Code", desc: "Write & debug code" },
  { icon: BookOpen, label: "Learn", desc: "Explain any topic" },
  { icon: Lightbulb, label: "Create", desc: "Brainstorm ideas" },
  { icon: Sparkles, label: "Analyze", desc: "Break down data" },
];

const WelcomeScreen = ({ onSuggestion }: WelcomeScreenProps) => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-card glow-border">
          <Sparkles className="text-primary" size={28} />
        </div>

        <h1 className="text-gradient-gold font-display text-3xl font-bold tracking-tight md:text-4xl">
          Hello, I'm NovaMind
        </h1>
        <p className="mt-2 font-display text-sm text-muted-foreground md:text-base">
          Your intelligent AI companion. How can I help today?
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-10 grid w-full max-w-lg grid-cols-2 gap-3 md:grid-cols-4"
      >
        {capabilities.map((cap, i) => (
          <motion.button
            key={cap.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            onClick={() => onSuggestion(`Help me with ${cap.desc.toLowerCase()}`)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:glow-border"
          >
            <cap.icon size={20} className="text-primary" />
            <span className="font-display text-xs font-medium text-foreground">{cap.label}</span>
            <span className="font-display text-[10px] text-muted-foreground">{cap.desc}</span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
};

export default WelcomeScreen;
