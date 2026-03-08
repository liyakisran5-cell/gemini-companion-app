import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { lookupReferralCode, recordReferral } from "@/lib/referral-db";

const isCustomDomain = () =>
  !window.location.hostname.includes("lovable.app") &&
  !window.location.hostname.includes("lovableproject.com");

const Auth = () => {
  const { signIn, signUp, resetPassword } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      if (isCustomDomain()) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin,
            skipBrowserRedirect: true,
          },
        });
        if (error) throw error;
        if (data?.url) {
          const oauthUrl = new URL(data.url);
          const supabaseHost = new URL(import.meta.env.VITE_SUPABASE_URL).hostname;
          const allowedHosts = ["accounts.google.com", supabaseHost];
          if (!allowedHosts.some((host) => oauthUrl.hostname === host)) {
            throw new Error("Invalid OAuth redirect URL");
          }
          window.location.href = data.url;
        }
      } else {
        const { error } = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: window.location.origin,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      toast.error(error.message || "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      if (isCustomDomain()) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "apple",
          options: {
            redirectTo: window.location.origin,
            skipBrowserRedirect: true,
          },
        });
        if (error) throw error;
        if (data?.url) {
          const oauthUrl = new URL(data.url);
          const supabaseHost = new URL(import.meta.env.VITE_SUPABASE_URL).hostname;
          const allowedHosts = ["appleid.apple.com", supabaseHost];
          if (!allowedHosts.some((host) => oauthUrl.hostname === host)) {
            throw new Error("Invalid OAuth redirect URL");
          }
          window.location.href = data.url;
        }
      } else {
        const { error } = await lovable.auth.signInWithOAuth("apple", {
          redirect_uri: window.location.origin,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      toast.error(error.message || "Apple sign-in failed");
      setAppleLoading(false);
    }
  };

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

        {!isForgot && (
          <>
            <div className="relative my-5 flex items-center">
              <div className="flex-1 border-t border-border" />
              <span className="px-3 font-display text-xs text-muted-foreground">or</span>
              <div className="flex-1 border-t border-border" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card py-3 font-display text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:glow-border disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Continue with Google
            </button>

            <button
              type="button"
              onClick={handleAppleSignIn}
              disabled={appleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card py-3 font-display text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:glow-border disabled:opacity-50"
            >
              {appleLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
              )}
              Continue with Apple
            </button>
          </>
        )}

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
