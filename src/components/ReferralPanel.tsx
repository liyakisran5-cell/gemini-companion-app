import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Copy, Check, Users, Image as ImageIcon, Video, ChevronDown, ChevronUp, Share2, Sparkles, Crown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getReferralInfo, ReferralInfo, getDailyFreeRemaining } from "@/lib/referral-db";
import { isAdmin, hasActiveTrial, getUserTrial, UserTrial } from "@/lib/admin-db";

const ReferralPanel = () => {
  const { user } = useAuth();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [trial, setTrial] = useState<UserTrial | null>(null);
  const [hasTrial, setHasTrial] = useState(false);

  useEffect(() => {
    if (!user) return;
    isAdmin(user.id).then(setIsAdminUser);
    hasActiveTrial(user.id).then(setHasTrial);
    getUserTrial(user.id).then(setTrial);
    getReferralInfo(user.id).then(setInfo).catch(console.error);
  }, [user]);

  if (!info || isAdminUser) return null;

  // If user has active trial, show Pro badge
  if (hasTrial && trial) {
    const remainingDays = Math.max(0, Math.ceil((new Date(trial.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    
    return (
      <div className="w-full">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-left transition-colors hover:border-primary/50"
        >
          <Crown className="h-4 w-4 text-primary" />
          <span className="flex-1 font-display text-xs font-bold text-primary">
            Pro Active
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-display text-[9px] font-bold text-primary">
            {remainingDays}d left
          </span>
          {expanded ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <span className="font-display text-sm font-bold text-primary">Pro Plan</span>
                </div>
                <p className="font-display text-[10px] text-foreground/80">
                  Unlimited image & video generation! {remainingDays} din baqi hain ✨
                </p>
                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                    style={{ width: `${(remainingDays / trial.days) * 100}%` }}
                  />
                </div>

                {/* Referral link still available */}
                <div className="space-y-1.5 pt-1">
                  <label className="font-display text-[9px] font-medium text-muted-foreground">Referral Link</label>
                  <div className="flex gap-1.5">
                    <input
                      readOnly
                      value={`${window.location.origin}/auth?ref=${info.code}`}
                      className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-[9px] text-foreground"
                    />
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${info.code}`);
                        setCopied(true);
                        toast.success("Referral link copied!");
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="rounded-lg border border-border bg-secondary px-2 py-1.5 transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const referralLink = `${window.location.origin}/auth?ref=${info.code}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join NovaMind",
          text: "Generate amazing AI images & videos! Use my referral link:",
          url: referralLink,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const progress50 = Math.min(info.referralCount, 50);
  const hasCompletedOffer = info.referralCount >= 50;

  const tierInfo = hasCompletedOffer
    ? { label: "🎉 Free Plan Unlocked!", color: "text-primary" }
    : info.referralCount >= 2
    ? { label: "Tier 2 — 12 Credits", color: "text-primary" }
    : info.referralCount >= 1
    ? { label: "Tier 1 — 5 Credits", color: "text-accent" }
    : { label: "No credits yet", color: "text-muted-foreground" };

  return (
    <div className="w-full">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left transition-colors hover:border-primary/30"
      >
        <Gift className="h-4 w-4 text-primary" />
        <span className="flex-1 font-display text-xs font-medium text-foreground">
          Credits & Referral
        </span>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 font-display text-[9px] font-semibold text-primary">
            <Sparkles className="h-2.5 w-2.5" /> {getDailyFreeRemaining(info.credits)}/10 Free
          </span>
          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 font-display text-[9px] font-semibold text-primary">
            <ImageIcon className="h-2.5 w-2.5" /> {info.credits.image_credits}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-accent/10 px-1.5 py-0.5 font-display text-[9px] font-semibold text-accent">
            <Video className="h-2.5 w-2.5" /> {info.credits.video_credits}
          </span>
          {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-xl border border-border bg-card p-3 space-y-3">
              {/* Daily Free Trial */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="font-display text-[10px] font-bold text-primary">Daily Free Trial</span>
                </div>
                <div className="font-display text-[9px] text-foreground/80">
                  Rozana 10 images FREE! Har roz reset hota hai 🔄
                </div>
                <div className="mt-1.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-display text-[9px] text-muted-foreground">
                      {info.credits.daily_free_used}/10 used
                    </span>
                    <span className="font-display text-[9px] font-semibold text-primary">
                      {getDailyFreeRemaining(info.credits)} remaining
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                      style={{ width: `${(info.credits.daily_free_used / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-secondary p-2 text-center">
                  <Users className="mx-auto mb-0.5 h-3 w-3 text-primary" />
                  <div className="font-display text-sm font-bold text-foreground">{info.referralCount}</div>
                  <div className="font-display text-[9px] text-muted-foreground">Referrals</div>
                </div>
                <div className="rounded-lg bg-secondary p-2 text-center">
                  <ImageIcon className="mx-auto mb-0.5 h-3 w-3 text-primary" />
                  <div className="font-display text-sm font-bold text-foreground">{info.credits.image_credits}</div>
                  <div className="font-display text-[9px] text-muted-foreground">Paid Credits</div>
                </div>
                <div className="rounded-lg bg-secondary p-2 text-center">
                  <Video className="mx-auto mb-0.5 h-3 w-3 text-accent" />
                  <div className="font-display text-sm font-bold text-foreground">{info.credits.video_credits}</div>
                  <div className="font-display text-[9px] text-muted-foreground">Video</div>
                </div>
              </div>

              {/* Special Offer */}
              <div className={`rounded-lg border p-2 ${hasCompletedOffer ? 'border-primary bg-primary/5' : 'border-accent/30 bg-accent/5'}`}>
                <div className={`font-display text-[10px] font-bold ${hasCompletedOffer ? 'text-primary' : 'text-accent'}`}>
                  🎁 Special Offer
                </div>
                <div className="mt-1 font-display text-[9px] text-foreground/80 line-clamp-2">
                  {hasCompletedOffer
                    ? "Mubarak ho! 1 saal ka FREE plan unlocked!"
                    : "50 invites complete karo aur FREE plan pao!"}
                </div>
                <div className="mt-1.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-display text-[9px] text-muted-foreground">{progress50}/50</span>
                    <span className="font-display text-[9px] font-semibold text-accent">{Math.round((progress50 / 50) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-primary transition-all duration-500"
                      style={{ width: `${(progress50 / 50) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tier info */}
              <div className="rounded-lg border border-border bg-background p-2">
                <div className={`font-display text-[10px] font-semibold ${tierInfo.color}`}>{tierInfo.label}</div>
                <div className="mt-0.5 font-display text-[9px] text-muted-foreground line-clamp-2">
                  {info.referralCount === 0 && "1 invite = 5 credits"}
                  {info.referralCount === 1 && "1 more for 12 credits!"}
                  {info.referralCount >= 2 && !hasCompletedOffer && "Max tier! Keep going!"}
                  {hasCompletedOffer && "All unlocked!"}
                </div>
              </div>

              {/* Referral link */}
              <div className="space-y-1.5">
                <label className="font-display text-[9px] font-medium text-muted-foreground">Referral Link</label>
                <div className="flex gap-1.5">
                  <input
                    readOnly
                    value={referralLink}
                    className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-[9px] text-foreground"
                  />
                  <button
                    onClick={handleCopy}
                    className="rounded-lg border border-border bg-secondary px-2 py-1.5 transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={handleShare}
                    className="rounded-lg border border-border bg-secondary px-2 py-1.5 transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <Share2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReferralPanel;
