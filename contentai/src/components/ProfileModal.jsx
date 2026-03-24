import { useState, useEffect, useRef } from "react";
import {
  X, User, Mail, Lock, Trash2, Camera, Check, AlertCircle,
  Eye, EyeOff, ChevronRight, Zap, TrendingUp, FileText,
  Shield, LogOut, Loader2
} from "lucide-react";
import { updateProfile, changePassword, deleteAccount, getUsage } from "../lib/auth";
import { getHistory } from "../lib/history";

// ── Shared helpers ────────────────────────────────────────────
function SectionTitle({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={14} className="text-ember-400" />
      <span className="text-xs font-bold text-white/40 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function SaveButton({ loading, saved, onClick, label = "Save Changes" }) {
  return (
    <button onClick={onClick} disabled={loading || saved}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
      style={saved
        ? { background: "rgba(63,255,162,0.15)", color: "#3fffa2" }
        : { background: "linear-gradient(135deg, #ff6b35, #f54e1e)" }}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
      {loading ? "Saving…" : saved ? "Saved!" : label}
    </button>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <AlertCircle size={12} className="text-red-400 flex-shrink-0" />
      <p className="text-xs text-red-400">{msg}</p>
    </div>
  );
}

function InputField({ label, type = "text", value, onChange, placeholder, error, suffix }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">{label}</label>
      <div className="relative">
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
          className={`w-full px-3.5 py-2.5 rounded-xl text-sm text-white/85 placeholder-white/20 border transition-all ${error
            ? "border-red-500/40 bg-red-500/5"
            : "border-white/8 bg-white/4 focus:border-ember-500/50 focus:bg-white/6"
          }`}
          style={{ outline: "none" }} />
        {suffix}
      </div>
      <FieldError msg={error} />
    </div>
  );
}

// ── Avatar picker ─────────────────────────────────────────────
function AvatarSection({ name, avatar, onAvatarChange }) {
  const fileRef = useRef();
  const initials = name ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "U";

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Image must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => onAvatarChange(ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-5 p-4 rounded-xl mb-5"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="relative flex-shrink-0">
        {avatar ? (
          <img src={avatar} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
            style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)" }}>
            {initials}
          </div>
        )}
        <button onClick={() => fileRef.current.click()}
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)", border: "2px solid #13131f" }}>
          <Camera size={11} color="white" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      <div>
        <p className="text-sm font-semibold text-white/80 mb-0.5">{name || "Your Name"}</p>
        <button onClick={() => fileRef.current.click()}
          className="text-xs text-ember-400 hover:text-ember-300 transition-colors">
          Change photo
        </button>
        {avatar && (
          <button onClick={() => onAvatarChange(null)}
            className="text-xs text-white/25 hover:text-white/50 transition-colors ml-3">
            Remove
          </button>
        )}
        <p className="text-xs text-white/20 mt-1">JPG, PNG · Max 2MB</p>
      </div>
    </div>
  );
}

// ── Usage stats ───────────────────────────────────────────────
function UsageSection({ session }) {
  const [usage, setUsage] = useState(null);
  const [history, setHistory] = useState([]);
  useEffect(() => {
    getHistory({ limit: 10 }).then(setHistory).catch(() => {});
  }, []);
  const recentTools = [...new Map(history.slice(0, 10).map(h => [h.toolId, h])).values()].slice(0, 3);

  useEffect(() => {
    getUsage().then(setUsage).catch(() => setUsage({ generationsUsed: 0, generationsLimit: 100, plan: "free" }));
  }, []);

  const used = usage?.generationsUsed || 0;
  const limit = usage?.generationsLimit || 100;
  const pct = Math.min((used / limit) * 100, 100);

  return (
    <div className="space-y-4">
      {/* Plan badge */}
      <div className="flex items-center justify-between p-4 rounded-xl"
        style={{ background: "rgba(255,107,53,0.07)", border: "1px solid rgba(255,107,53,0.15)" }}>
        <div>
          <p className="text-xs text-ember-400 font-bold uppercase tracking-widest mb-0.5">Free Plan</p>
          <p className="text-xs text-white/40">Upgrade for unlimited generations</p>
        </div>
        <button className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)" }}>
          Upgrade
        </button>
      </div>

      {/* Usage bar */}
      <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap size={13} className="text-ember-400" />
            <span className="text-xs font-semibold text-white/60">Generations</span>
          </div>
          <span className="text-xs font-bold text-white/70">{used} / {limit}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/8 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: pct > 80 ? "linear-gradient(90deg, #f97316, #ef4444)" : "linear-gradient(90deg, #ff6b35, #f54e1e)" }} />
        </div>
        <p className="text-xs text-white/25 mt-1.5">{limit - used} generations remaining this month</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <FileText size={12} className="text-blue-400" />
            <span className="text-xs text-white/40">Total Saved</span>
          </div>
          <p className="text-xl font-bold text-white font-display">{history.length}</p>
        </div>
        <div className="p-3.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-jade-400" />
            <span className="text-xs text-white/40">Member Since</span>
          </div>
          <p className="text-sm font-bold text-white">
            {session?.createdAt ? new Date(session.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Today"}
          </p>
        </div>
      </div>

      {/* Recent tools */}
      {recentTools.length > 0 && (
        <div>
          <p className="text-xs text-white/30 mb-2">Recently used tools</p>
          <div className="flex flex-col gap-1.5">
            {recentTools.map(item => (
              <div key={item.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <span className="text-base">{item.toolId === "blog-post" ? "📝" : item.toolId === "social-media" ? "📱" : item.toolId === "email-copy" ? "✉️" : "🎯"}</span>
                <span className="text-xs text-white/50">{item.toolName}</span>
                <span className="text-xs text-white/20 ml-auto">{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Danger zone ───────────────────────────────────────────────
function DangerZone({ onDeleteAccount }) {
  const [confirming, setConfirming] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isMatch = input.trim() === "DELETE";

  const handleDelete = async () => {
    if (!isMatch || loading) return;
    setLoading(true);
    setError("");
    try {
      await onDeleteAccount();
      // onDeleteAccount handles logout — nothing more needed here
    } catch (err) {
      console.error("[danger-zone]", err);
      setError(err.message || "Deletion failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(239,68,68,0.2)" }}>
      <div className="px-4 py-3" style={{ background: "rgba(239,68,68,0.06)" }}>
        <div className="flex items-center gap-2">
          <Trash2 size={13} className="text-red-400" />
          <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Danger Zone</span>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm font-semibold text-white/80 mb-1">Delete Account</p>
        <p className="text-xs text-white/35 leading-relaxed mb-4">
          Permanently deletes your account and all data. This cannot be undone.
        </p>

        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-400 border border-red-500/25 hover:bg-red-500/10 transition-all">
            <Trash2 size={14} /> Delete my account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-red-300/70 leading-relaxed">
              This will permanently delete your account. Type{" "}
              <span className="font-mono font-bold text-red-400 bg-red-500/10 px-1 rounded">DELETE</span>{" "}
              to confirm:
            </p>

            <input
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value); setError(""); }}
              placeholder="Type DELETE here"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono placeholder-white/20 border transition-all"
              style={{
                outline: "none",
                color: isMatch ? "#f87171" : "#e8e8f0",
                borderColor: isMatch ? "rgba(239,68,68,0.5)" : "rgba(239,68,68,0.2)",
                background: isMatch ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.03)",
              }}
            />

            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={!isMatch || loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                style={{ background: isMatch && !loading ? "linear-gradient(135deg, #dc2626, #b91c1c)" : "#3a1a1a" }}>
                {loading
                  ? <><Loader2 size={13} className="animate-spin" /> Deleting…</>
                  : <><Trash2 size={13} /> Confirm Delete</>
                }
              </button>
              <button
                onClick={() => { setConfirming(false); setInput(""); setError(""); }}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-all disabled:opacity-40">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PROFILE MODAL
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "profile", icon: User, label: "Profile" },
  { id: "usage", icon: TrendingUp, label: "Usage" },
  { id: "security", icon: Shield, label: "Security" },
  { id: "danger", icon: Trash2, label: "Account" },
];

export default function ProfileModal({ session, onClose, onUpdate, onLogout }) {
  const [tab, setTab] = useState("profile");

  // Profile fields
  const [name, setName] = useState(session?.name || "");
  const [email, setEmail] = useState(session?.email || "");
  const [avatar, setAvatar] = useState(session?.avatar || null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Password fields
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwErrors, setPwErrors] = useState({});

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handleSaveProfile = async () => {
    setProfileError("");
    setProfileSaving(true);
    try {
      const updated = await updateProfile({ name, email, avatar });
      onUpdate(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      setProfileError(err.message || "Failed to save profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const errs = {};
    if (!currentPw) errs.currentPw = "Current password is required.";
    if (!newPw || newPw.length < 8) errs.newPw = "New password must be at least 8 characters.";
    if (newPw !== confirmPw) errs.confirmPw = "Passwords don't match.";
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    setPwErrors({});
    setPwSaving(true);
    try {
      await changePassword({ currentPassword: currentPw, newPassword: newPw });
      setPwSaved(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => setPwSaved(false), 2500);
    } catch (err) {
      setPwErrors({ currentPw: err.message || "Incorrect current password." });
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
    } catch (err) {
      console.error("[delete-account]", err);
      // Even if server errors, force logout locally
    }
    onLogout();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 backdrop-blur-sm" style={{ background: "rgba(5,5,8,0.85)" }} onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-lg rounded-2xl overflow-hidden animate-slide-up flex flex-col"
          style={{ background: "#13131f", border: "1px solid rgba(255,255,255,0.07)", maxHeight: "90vh" }}>

          {/* Top accent */}
          <div className="h-0.5 w-full flex-shrink-0"
            style={{ background: "linear-gradient(90deg, #ff6b35, #f54e1e, #a78bfa)" }} />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-3">
              {avatar ? (
                <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)" }}>
                  {name ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "U"}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-white">{name || "Your Profile"}</p>
                <p className="text-xs text-white/35">{email}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
              <X size={15} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/5 flex-shrink-0 px-2">
            {TABS.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${tab === id
                  ? "border-ember-400 text-ember-400"
                  : "border-transparent text-white/35 hover:text-white/60"}`}>
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Body — scrollable */}
          <div className="flex-1 overflow-auto p-6">

            {/* ── Profile Tab ── */}
            {tab === "profile" && (
              <div className="space-y-5">
                <SectionTitle icon={User} label="Personal Info" />
                <AvatarSection name={name} avatar={avatar} onAvatarChange={setAvatar} />

                <InputField label="Full Name" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your full name" />
                <InputField label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" />

                {profileError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                    <p className="text-xs text-red-300">{profileError}</p>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <SaveButton loading={profileSaving} saved={profileSaved} onClick={handleSaveProfile} />
                </div>
              </div>
            )}

            {/* ── Usage Tab ── */}
            {tab === "usage" && (
              <div>
                <SectionTitle icon={TrendingUp} label="Usage & Plan" />
                <UsageSection session={session} />
              </div>
            )}

            {/* ── Security Tab ── */}
            {tab === "security" && (
              <div className="space-y-5">
                <SectionTitle icon={Shield} label="Change Password" />

                {session?.googleId && (
                  <div className="flex items-start gap-3 p-3.5 rounded-xl"
                    style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.15)" }}>
                    <AlertCircle size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-300/70 leading-relaxed">
                      You signed in with Google. Password change is not available for Google accounts.
                    </p>
                  </div>
                )}

                <div className="relative">
                  <InputField label="Current Password" type={showCurrentPw ? "text" : "password"}
                    value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                    placeholder="••••••••" error={pwErrors.currentPw} />
                  <button onClick={() => setShowCurrentPw(s => !s)}
                    className="absolute right-3 top-8 text-white/25 hover:text-white/60 transition-colors">
                    {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                <div className="relative">
                  <InputField label="New Password" type={showNewPw ? "text" : "password"}
                    value={newPw} onChange={e => setNewPw(e.target.value)}
                    placeholder="Min. 8 characters" error={pwErrors.newPw} />
                  <button onClick={() => setShowNewPw(s => !s)}
                    className="absolute right-3 top-8 text-white/25 hover:text-white/60 transition-colors">
                    {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                <InputField label="Confirm New Password" type="password"
                  value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Repeat new password" error={pwErrors.confirmPw} />

                <div className="flex justify-end pt-1">
                  <SaveButton loading={pwSaving} saved={pwSaved} onClick={handleChangePassword}
                    label="Update Password" />
                </div>

                {/* Sign out all devices */}
                <div className="pt-4 border-t border-white/5">
                  <SectionTitle icon={LogOut} label="Sessions" />
                  <div className="flex items-center justify-between p-4 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                      <p className="text-sm font-medium text-white/80">Sign out everywhere</p>
                      <p className="text-xs text-white/35 mt-0.5">Revoke all active sessions on all devices</p>
                    </div>
                    <button onClick={onLogout}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium text-white/50 hover:text-red-400 border border-white/8 hover:border-red-500/30 hover:bg-red-500/8 transition-all">
                      <LogOut size={12} /> Sign out
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Danger Tab ── */}
            {tab === "danger" && (
              <div>
                <SectionTitle icon={Trash2} label="Danger Zone" />
                <p className="text-xs text-white/35 leading-relaxed mb-5">
                  These actions are irreversible. Please proceed with caution.
                </p>
                <DangerZone onDeleteAccount={handleDeleteAccount} />
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
