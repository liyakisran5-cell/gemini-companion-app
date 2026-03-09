import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Copy, Check, Users, ImageIcon, Video, ChevronDown, ChevronUp, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getReferralInfo, ReferralInfo } from "@/lib/referral-db";
import { isAdmin } from "@/lib/admin-db";

const ReferralPanel = () => {
  const { user } = useAuth();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    if (!user) return;
    isAdmin(user.id).then(setIsAdminUser);
    getReferralInfo(user.id).then(setInfo).catch(console.error);
  }, [user]);

  if (!info || isAdminUser) return null;

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
    <div className="mx-auto w-full max-w-3xl px-4 md:px-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-left transition-colors hover:border-primary/30"
      >
        <Gift className="h-4 w-4 text-primary" />
        <span className="flex-1 font-display text-xs font-medium text-foreground">
          Referral Program
        </span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-display text-[10px] font-semibold text-primary">
            <ImageIcon className="h-3 w-3" /> {info.credits.image_credits}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 font-display text-[10px] font-semibold text-accent">
            <Video className="h-3 w-3" /> {info.credits.video_credits}
          </span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
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
            <div className="mt-2 rounded-xl border border-border bg-card p-4 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-secondary p-3 text-center">
                  <Users className="mx-auto mb-1 h-4 w-4 text-primary" />
                  <div className="font-display text-lg font-bold text-foreground">{info.referralCount}</div>
                  <div className="font-display text-[10px] text-muted-foreground">Referrals</div>
                </div>
                <div className="rounded-lg bg-secondary p-3 text-center">
                  <ImageIcon className="mx-auto mb-1 h-4 w-4 text-primary" />
                  <div className="font-display text-lg font-bold text-foreground">{info.credits.image_credits}</div>
                  <div className="font-display text-[10px] text-muted-foreground">Image Credits</div>
                </div>
                <div className="rounded-lg bg-secondary p-3 text-center">
                  <Video className="mx-auto mb-1 h-4 w-4 text-accent" />
                  <div className="font-display text-lg font-bold text-foreground">{info.credits.video_credits}</div>
                  <div className="font-display text-[10px] text-muted-foreground">Video Credits</div>
                </div>
              </div>

              {/* Special Offer */}
              <div className={`rounded-lg border p-3 ${hasCompletedOffer ? 'border-primary bg-primary/5' : 'border-accent/30 bg-accent/5'}`}>
                <div className={`font-display text-xs font-bold ${hasCompletedOffer ? 'text-primary' : 'text-accent'}`}>
                  🎁 Special Offer
                </div>
                <div className="mt-1 font-display text-[11px] text-foreground/80">
                  {hasCompletedOffer
                    ? "Mubarak ho! 🎉 Aapne 50 invites complete kar liye — aapko 1 saal ka FREE plan mil gaya hai!"
                    : "50 logon ko invite karo aur 20 special logon ko 1 saal ka FREE plan milega! Ye offer aapko bhi milega jab aap 50 invites complete karoge."}
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display text-[10px] text-muted-foreground">{progress50}/50 Invites</span>
                    <span className="font-display text-[10px] font-semibold text-accent">{Math.round((progress50 / 50) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-primary transition-all duration-500"
                      style={{ width: `${(progress50 / 50) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tier info */}
              <div className="rounded-lg border border-border bg-background p-3">
                <div className={`font-display text-xs font-semibold ${tierInfo.color}`}>{tierInfo.label}</div>
                <div className="mt-1 font-display text-[11px] text-muted-foreground">
                  {info.referralCount === 0 && "1 invite = 5 credits · 2 invites = 12 credits"}
                  {info.referralCount === 1 && "1 more invite for 12 total credits!"}
                  {info.referralCount >= 2 && !hasCompletedOffer && "Maximum credit tier reached! Keep inviting for the special offer! 🎯"}
                  {hasCompletedOffer && "All rewards unlocked! 🏆"}
                </div>
              </div>

              {/* Referral link */}
              <div className="space-y-2">
                <label className="font-display text-[11px] font-medium text-muted-foreground">Your Referral Link</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={referralLink}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
                  />
                  <button
                    onClick={handleCopy}
                    className="rounded-lg border border-border bg-secondary px-3 py-2 transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={handleShare}
                    className="rounded-lg border border-border bg-secondary px-3 py-2 transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <Share2 className="h-4 w-4" />
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
