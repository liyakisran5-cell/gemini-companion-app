import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface WelcomeScreenProps {
  onSuggestion: (text: string) => void;
  userName?: string;
  isReturningUser?: boolean;
}

function extractDisplayName(user: { user_metadata?: Record<string, any>; email?: string } | null): string {
  if (!user) return "there";

  // Try display name from OAuth metadata
  const meta = user.user_metadata;
  if (meta) {
    const fullName = meta.full_name || meta.name || meta.preferred_username;
    if (fullName && typeof fullName === "string" && fullName.trim()) {
      return fullName.split(" ")[0]; // First name only
    }
  }

  // Fall back to email
  if (user.email) {
    const local = user.email.split("@")[0];
    // Remove numbers, dots, underscores then capitalize
    const cleaned = local.replace(/[0-9._]/g, "");
    if (cleaned.length > 0) {
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    }
  }

  return "there";
}

export { extractDisplayName };

const WelcomeScreen = ({ onSuggestion, userName = "there", isReturningUser = false }: WelcomeScreenProps) => {
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
          {isReturningUser
            ? `Welcome back, ${userName}! 👋`
            : `Hey ${userName}! 👋`}
        </h1>
        <p className="mt-2 font-display text-sm text-muted-foreground md:text-base">
          {isReturningUser
            ? "Ready to create something today?"
            : "Welcome to NovaMind. Let's create something amazing!"}
        </p>
      </motion.div>
    </div>
  );
};

export default WelcomeScreen;
