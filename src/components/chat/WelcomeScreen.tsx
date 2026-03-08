import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface WelcomeScreenProps {
  onSuggestion: (text: string) => void;
}

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
    </div>
  );
};

export default WelcomeScreen;
