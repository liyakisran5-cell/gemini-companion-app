import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const { signIn, signUp, resetPassword } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isForgot) {
      const { error } = await resetPassword(email);
      if (error) toast.error(error.message);
      else toast.success("Password reset email sent! Check your inbox.");
      setLoading(false);
      return;
    }

    const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);
    if (error) {
      toast.error(error.message);
    } else if (isSignUp) {
      toast.success("Account created! Check your email to confirm.");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-card glow-border">
            <Sparkles className="text-primary" size={24} />
          </div>
          <h1 className="text-gradient-gold font-display text-2xl font-bold">NovaMind</h1>
          <p className="mt-1 font-display text-sm text-muted-foreground">
            {isForgot ? "Reset your password" : isSignUp ? "Create your account" : "Welcome back"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 font-display text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:glow-border"
            />
          </div>

          {!isForgot && (
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
                className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 font-display text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:glow-border"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-display text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                {isForgot ? "Send Reset Link" : isSignUp ? "Create Account" : "Sign In"}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center font-display text-xs text-muted-foreground">
          {!isForgot && (
            <button
              onClick={() => setIsForgot(true)}
              className="block w-full transition-colors hover:text-foreground"
            >
              Forgot password?
            </button>
          )}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setIsForgot(false);
            }}
            className="block w-full transition-colors hover:text-foreground"
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
          {isForgot && (
            <button
              onClick={() => setIsForgot(false)}
              className="block w-full transition-colors hover:text-foreground"
            >
              Back to sign in
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
