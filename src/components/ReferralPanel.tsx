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
    <div className="w-full">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left transition-colors hover:border-primary/30"
      >
        <Gift className="h-4 w-4 text-primary" />
        <span className="flex-1 font-display text-xs font-medium text-foreground">
          Referral
        </span>
        <div className="flex items-center gap-1.5">
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
                  <div className="font-display text-[9px] text-muted-foreground">Image</div>
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
