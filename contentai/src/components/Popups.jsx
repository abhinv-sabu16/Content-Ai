import { useEffect, useState } from "react";
import { LogOut, X, Sparkles, Zap, ArrowRight, CheckCircle2 } from "lucide-react";

// ── Shared backdrop ───────────────────────────────────────────
function Backdrop({ onClick }) {
  return (
    <div
      className="fixed inset-0 z-40 backdrop-blur-sm"
      style={{ background: "rgba(5,5,8,0.8)" }}
      onClick={onClick}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// LOGOUT CONFIRMATION POPUP
// ─────────────────────────────────────────────────────────────
export function LogoutPopup({ onConfirm, onCancel }) {
  const [confirming, setConfirming] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm();
  };

  return (
    <>
      <Backdrop onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-sm rounded-2xl overflow-hidden animate-slide-up"
          style={{ background: "#13131f", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Top accent bar */}
          <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #f54e1e, #ff6b35, transparent)" }} />

          <div className="p-6">
            {/* Icon */}
            <div className="flex items-center justify-between mb-5">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <LogOut size={20} className="text-red-400" />
              </div>
              <button
                onClick={onCancel}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
              >
                <X size={15} />
              </button>
            </div>

            {/* Text */}
            <h2 className="font-display font-bold text-white text-lg mb-1">
              Sign out?
            </h2>
            <p className="text-sm text-white/40 leading-relaxed mb-6">
              You'll need to sign back in to access your content and generation history.
            </p>

            {/* Buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)" }}
              >
                {confirming ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing out…
                  </span>
                ) : (
                  <><LogOut size={14} /> Yes, sign me out</>
                )}
              </button>
              <button
                onClick={onCancel}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// WELCOME POPUP (shown on first sign-up)
// ─────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: "📝", label: "Blog Posts", desc: "Long-form articles in seconds" },
  { icon: "📱", label: "Social Captions", desc: "Stop-the-scroll copy" },
  { icon: "✉️", label: "Email Copy", desc: "Campaigns that convert" },
  { icon: "🎯", label: "Ad Copy", desc: "For every platform" },
];

export function WelcomePopup({ userName, onClose }) {
  const [step, setStep] = useState(0); // 0 = welcome, 1 = features, 2 = ready
  const [closing, setClosing] = useState(false);

  const firstName = userName?.split(" ")[0] || "there";

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 300);
  };

  return (
    <>
      <Backdrop onClick={null} /> {/* No dismiss on backdrop for welcome */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`pointer-events-auto w-full max-w-md rounded-2xl overflow-hidden transition-all duration-300 ${closing ? "opacity-0 scale-95" : "animate-slide-up"}`}
          style={{ background: "#13131f", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Gradient top bar */}
          <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #ff6b35, #f54e1e, #a78bfa)" }} />

          {/* Step 0 — Welcome */}
          {step === 0 && (
            <div className="p-7 text-center">
              {/* Animated logo */}
              <div className="flex justify-center mb-5">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center relative"
                  style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)", boxShadow: "0 0 40px rgba(255,107,53,0.3)" }}
                >
                  <Zap size={28} fill="white" color="white" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "#13131f", border: "2px solid #13131f" }}>
                    <span className="text-xs">✨</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mb-3">
                <Sparkles size={13} className="text-ember-400" />
                <span className="text-xs text-ember-400 font-semibold uppercase tracking-widest">Account Created</span>
              </div>

              <h2 className="font-display font-bold text-white text-2xl mb-2 leading-tight">
                Welcome to ContentAI,<br />
                <span className="shimmer-text">{firstName}! 🎉</span>
              </h2>
              <p className="text-sm text-white/45 leading-relaxed mb-7">
                You're all set. Let's show you what you can create with the power of AI at your fingertips.
              </p>

              <button
                onClick={() => setStep(1)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)", boxShadow: "0 8px 24px rgba(255,107,53,0.25)" }}
              >
                Show me around <ArrowRight size={15} />
              </button>
              <button onClick={handleClose} className="w-full mt-2.5 py-2 text-xs text-white/25 hover:text-white/50 transition-colors">
                Skip for now
              </button>
            </div>
          )}

          {/* Step 1 — Features */}
          {step === 1 && (
            <div className="p-7">
              <div className="text-center mb-6">
                <h2 className="font-display font-bold text-white text-xl mb-1">8 tools, endless content</h2>
                <p className="text-sm text-white/40">Everything you need to create content that converts.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {FEATURES.map((f, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-1.5 p-3.5 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <span className="text-xl">{f.icon}</span>
                    <p className="text-xs font-semibold text-white/80">{f.label}</p>
                    <p className="text-xs text-white/35 leading-snug">{f.desc}</p>
                  </div>
                ))}
              </div>

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1.5 mb-5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="rounded-full transition-all duration-300"
                    style={{
                      width: step === i ? "20px" : "6px",
                      height: "6px",
                      background: step === i ? "#ff6b35" : "rgba(255,255,255,0.15)"
                    }} />
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)" }}
              >
                Next <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* Step 2 — Ready */}
          {step === 2 && (
            <div className="p-7 text-center">
              <div className="flex justify-center mb-5">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(63,255,162,0.1)", border: "2px solid rgba(63,255,162,0.25)" }}
                >
                  <CheckCircle2 size={32} className="text-jade-400" />
                </div>
              </div>

              <h2 className="font-display font-bold text-white text-xl mb-2">
                You're ready to create! 🚀
              </h2>
              <p className="text-sm text-white/40 leading-relaxed mb-2">
                Start with any tool from the sidebar. Your first generation is just one click away.
              </p>

              {/* Tip */}
              <div className="rounded-xl p-3.5 mb-6 text-left"
                style={{ background: "rgba(255,107,53,0.07)", border: "1px solid rgba(255,107,53,0.15)" }}>
                <p className="text-xs text-ember-400 font-semibold mb-0.5">💡 Pro tip</p>
                <p className="text-xs text-white/45 leading-relaxed">
                  The more detail you give, the better the output. Try the Blog Post tool first — it's the most popular.
                </p>
              </div>

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1.5 mb-5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="rounded-full transition-all duration-300"
                    style={{
                      width: step === i ? "20px" : "6px",
                      height: "6px",
                      background: step === i ? "#ff6b35" : "rgba(255,255,255,0.15)"
                    }} />
                ))}
              </div>

              <button
                onClick={handleClose}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)", boxShadow: "0 8px 24px rgba(255,107,53,0.2)" }}
              >
                <Zap size={14} fill="white" /> Start Creating
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
