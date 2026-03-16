import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Shield, UserCheck, UserX, Loader2, Search, Clock, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin, listUsers, grantFreeAccess, revokeFreeAccess, grantTrial, revokeTrial, AdminUser } from "@/lib/admin-db";

const TRIAL_OPTIONS = [3, 7, 14, 30, 60, 90];

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [trialDropdown, setTrialDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    isAdmin(user.id).then((ok) => {
      setAuthorized(ok);
      if (ok) {
        listUsers()
          .then(setUsers)
          .catch((e) => {
            console.error(e);
            toast.error("Failed to load users");
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, [user]);

  const handleToggleFreeAccess = async (u: AdminUser) => {
    setActionLoading(u.id);
    try {
      if (u.has_free_access) {
        await revokeFreeAccess(u.id);
        toast.success(`Free access revoked for ${u.email}`);
      } else {
        await grantFreeAccess(u.id);
        toast.success(`Free access granted to ${u.email}`);
      }
      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id ? { ...x, has_free_access: !x.has_free_access } : x
        )
      );
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleGrantTrial = async (u: AdminUser, days: number) => {
    setActionLoading(u.id);
    setTrialDropdown(null);
    try {
      await grantTrial(u.id, days);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);
      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id ? { ...x, trial_end: endDate.toISOString(), trial_days: days } : x
        )
      );
      toast.success(`${days}-day trial granted to ${u.email}`);
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeTrial = async (u: AdminUser) => {
    setActionLoading(u.id);
    try {
      await revokeTrial(u.id);
      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id ? { ...x, trial_end: undefined, trial_days: undefined } : x
        )
      );
      toast.success(`Trial revoked for ${u.email}`);
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.id.includes(search)
  );

  const hasActiveTrial = (u: AdminUser) => u.trial_end && new Date(u.trial_end) > new Date();

  const getRemainingDays = (endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-background gap-4">
        <Shield className="h-12 w-12 text-destructive" />
        <h1 className="font-display text-xl font-bold text-foreground">Access Denied</h1>
        <p className="font-display text-sm text-muted-foreground">You are not authorized to view this page.</p>
        <button
          onClick={() => navigate("/")}
          className="rounded-xl bg-primary px-4 py-2 font-display text-sm font-semibold text-primary-foreground"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:px-8">
        <button
          onClick={() => navigate("/")}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="font-display text-lg font-semibold text-foreground">Admin Panel</h1>
        </div>
        <span className="ml-auto rounded-full bg-destructive/10 px-2.5 py-0.5 font-display text-[10px] font-semibold text-destructive">
          ADMIN
        </span>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 font-display text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            />
          </div>

          {/* Users list */}
          <div className="space-y-2">
            {filtered.map((u) => (
              <div
                key={u.id}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-display text-sm font-medium text-foreground">
                      {u.email}
                    </div>
                    <div className="font-display text-[10px] text-muted-foreground">
                      Joined {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {u.has_free_access && (
                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 font-display text-[10px] font-semibold text-green-500">
                      FREE
                    </span>
                  )}

                  {hasActiveTrial(u) && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 font-display text-[10px] font-semibold text-primary">
                      PRO — {getRemainingDays(u.trial_end!)}d left
                    </span>
                  )}

                  <button
                    onClick={() => handleToggleFreeAccess(u)}
                    disabled={actionLoading === u.id}
                    className={`rounded-lg p-2 transition-colors ${
                      u.has_free_access
                        ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                        : "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                    } disabled:opacity-50`}
                    title={u.has_free_access ? "Revoke free access" : "Grant free access"}
                  >
                    {actionLoading === u.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : u.has_free_access ? (
                      <UserX className="h-4 w-4" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Trial controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  {hasActiveTrial(u) ? (
                    <button
                      onClick={() => handleRevokeTrial(u)}
                      disabled={actionLoading === u.id}
                      className="flex items-center gap-1 rounded-lg bg-destructive/10 px-2 py-1 font-display text-[10px] font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50"
                    >
                      <Clock className="h-3 w-3" /> Revoke Trial
                    </button>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={() => setTrialDropdown(trialDropdown === u.id ? null : u.id)}
                        disabled={actionLoading === u.id}
                        className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 font-display text-[10px] font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
                      >
                        <Zap className="h-3 w-3" /> Grant Trial
                      </button>
                      {trialDropdown === u.id && (
                        <div className="absolute left-0 top-full z-10 mt-1 rounded-lg border border-border bg-card p-1 shadow-lg">
                          {TRIAL_OPTIONS.map((d) => (
                            <button
                              key={d}
                              onClick={() => handleGrantTrial(u, d)}
                              className="block w-full rounded px-3 py-1 text-left font-display text-[10px] text-foreground hover:bg-secondary"
                            >
                              {d} days
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="py-8 text-center font-display text-sm text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
