import { useState, useEffect } from "react";
import { Zap, Eye, EyeOff, ArrowRight, Mail, Lock, User, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { login, register, loginWithGoogle } from "../lib/auth";

const FEATURES = [
  { icon: "📝", text: "Blog posts & long-form articles" },
  { icon: "📱", text: "Social captions that stop the scroll" },
  { icon: "✉️", text: "Email copy that converts" },
  { icon: "🎯", text: "Ad copy for every platform" },
];

function InputField({ icon: Icon, type, placeholder, value, onChange, showToggle, onToggle, showPassword, error }) {
  return (
    <div className="relative">
      <Icon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
      <input
        type={showToggle ? (showPassword ? "text" : "password") : type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full pl-11 ${showToggle ? "pr-11" : "pr-4"} py-3 rounded-xl text-sm text-gray-900 placeholder-gray-500 transition-all border ${
          error
            ? "border-red-500/50 bg-red-50 focus:border-red-400"
            : "border-gray-200 bg-white focus:border-ember-500/50"
        }`}
        style={{ outline: "none" }}
        autoComplete={type === "password" ? "current-password" : type === "email" ? "email" : "name"}
      />
      {showToggle && (
        <button type="button" onClick={onToggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10">
          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      )}
    </div>
  );
}

function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    { label: "8+ chars", ok: password.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
    { label: "Symbol", ok: /[^a-zA-Z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ["", "#ef4444", "#f97316", "#eab308", "#3fffa2"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];

  return (
    <div className="mt-2.5">
      <div className="flex gap-1 mb-2">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-0.5 flex-1 rounded-full transition-all duration-300"
            style={{ background: i <= score ? colors[score] : "rgba(255,255,255,0.08)" }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          {checks.map(c => (
            <span key={c.label} className={`text-xs transition-colors ${c.ok ? "text-jade-400" : "text-white/20"}`}>
              {c.ok ? "✓" : "·"} {c.label}
            </span>
          ))}
        </div>
        {score > 0 && (
          <span className="text-xs font-semibold" style={{ color: colors[score] }}>{labels[score]}</span>
        )}
      </div>
    </div>
  );
}

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Handle Google OAuth redirect error
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error === "google_failed") {
      setApiError("Google sign-in failed. Please try again.");
      window.history.replaceState({}, "", "/auth");
    }
  }, []);

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setFieldErrors(er => ({ ...er, [k]: "" }));
    setApiError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setApiError("");
    setFieldErrors({});

    try {
      const user = mode === "login"
        ? await login({ email: form.email, password: form.password })
        : await register({ name: form.name, email: form.email, password: form.password });

      setSuccess(true);
      setTimeout(() => onAuth(user, mode === "register"), 700);
    } catch (err) {
      if (err.fields) {
        setFieldErrors(err.fields);
      } else {
        setApiError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setForm({ name: "", email: "", password: "" });
    setFieldErrors({});
    setApiError("");
    setSuccess(false);
    setShowPass(false);
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#050508" }}>

      {/* ── Left — Branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-[460px] flex-shrink-0 relative overflow-hidden p-12"
        style={{ background: "linear-gradient(160deg, #0f0905 0%, #1a0a03 60%, #0f0905 100%)" }}>

        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,107,53,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,53,1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }} />

        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #ff6b35, transparent 70%)" }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)" }}>
            <Zap size={20} fill="white" color="white" />
          </div>
          <span className="font-display font-bold text-white text-xl tracking-tight">ContentAI</span>
        </div>

        {/* Hero */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles size={13} className="text-ember-400" />
            <span className="text-xs text-ember-400 font-semibold uppercase tracking-widest">AI-Powered Platform</span>
          </div>
          <h2 className="font-display font-bold text-4xl text-white leading-tight mb-4">
            Create content<br />that <span className="shimmer-text">converts.</span>
          </h2>
          <p className="text-white/40 text-sm leading-relaxed mb-8">
            8 powerful AI tools for every type of content. Go from idea to publish-ready copy in seconds.
          </p>
          <div className="flex flex-col gap-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.15)" }}>
                  {f.icon}
                </div>
                <span className="text-sm text-white/50">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="relative z-10 rounded-2xl p-5"
          style={{ background: "rgba(255,107,53,0.06)", border: "1px solid rgba(255,107,53,0.12)" }}>
          <p className="text-sm text-white/55 leading-relaxed mb-3">
            "ContentAI cut our content production time by 80%. We now publish 4× more with half the team."
          </p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)" }}>S</div>
            <div>
              <p className="text-xs font-semibold text-white/80">Sarah K.</p>
              <p className="text-xs text-white/30">Head of Content, Growthly</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right — Form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-auto">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)" }}>
            <Zap size={16} fill="white" color="white" />
          </div>
          <span className="font-display font-bold text-white text-lg">ContentAI</span>
        </div>

        <div className="w-full max-w-md animate-slide-up">

          {/* Tab switcher */}
          <div className="flex rounded-xl p-1 mb-8"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold capitalize transition-all duration-200 ${
                  mode === m ? "text-white" : "text-white/35 hover:text-white/60"
                }`}
                style={mode === m ? { background: "linear-gradient(135deg, #ff6b35, #f54e1e)" } : {}}>
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Header */}
          <div className="mb-7">
            <h1 className="font-display font-bold text-white text-2xl mb-1">
              {mode === "login" ? "Welcome back" : "Start for free"}
            </h1>
            <p className="text-sm text-white/40">
              {mode === "login"
                ? "Sign in to your ContentAI account"
                : "Create your account — no credit card required"}
            </p>
          </div>

          {/* Success banner */}
          {success && (
            <div className="flex items-center gap-3 p-4 rounded-xl mb-5 animate-fade-in"
              style={{ background: "rgba(63,255,162,0.08)", border: "1px solid rgba(63,255,162,0.2)" }}>
              <CheckCircle2 size={18} className="text-jade-400 flex-shrink-0" />
              <p className="text-sm text-jade-400 font-medium">
                {mode === "login" ? "Signing you in…" : "Account created! Redirecting…"}
              </p>
            </div>
          )}

          {/* API error */}
          {apiError && (
            <div className="flex items-start gap-3 p-4 rounded-xl mb-5 animate-fade-in"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{apiError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

            {mode === "register" && (
              <div>
                <InputField icon={User} type="text" placeholder="Full name"
                  value={form.name} onChange={set("name")} error={fieldErrors.name} />
                {fieldErrors.name && <p className="text-xs text-red-400 mt-1.5 ml-1">{fieldErrors.name}</p>}
              </div>
            )}

            <div>
              <InputField icon={Mail} type="email" placeholder="Email address"
                value={form.email} onChange={set("email")} error={fieldErrors.email} />
              {fieldErrors.email && <p className="text-xs text-red-400 mt-1.5 ml-1">{fieldErrors.email}</p>}
            </div>

            <div>
              <InputField icon={Lock} type="password" placeholder="Password"
                value={form.password} onChange={set("password")} error={fieldErrors.password}
                showToggle onToggle={() => setShowPass(s => !s)} showPassword={showPass} />
              {fieldErrors.password && <p className="text-xs text-red-400 mt-1.5 ml-1">{fieldErrors.password}</p>}
              {mode === "register" && <PasswordStrength password={form.password} />}
            </div>

            {mode === "login" && (
              <div className="flex justify-end -mt-1">
                <button type="button" className="text-xs text-ember-400 hover:text-ember-300 transition-colors">
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading || success}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)", boxShadow: "0 8px 24px rgba(255,107,53,0.2)" }}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === "login" ? "Signing in…" : "Creating account…"}
                </span>
              ) : (
                <>{mode === "login" ? "Sign In" : "Create Account"} <ArrowRight size={15} /></>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/6" />
              <span className="text-xs text-white/20">or</span>
              <div className="flex-1 h-px bg-white/6" />
            </div>

            {/* Google OAuth */}
            <button type="button" onClick={loginWithGoogle}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-medium text-white/70 hover:text-white transition-all hover:bg-white/6 active:scale-[0.98]"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

          </form>

          {/* Footer links */}
          <p className="text-center text-xs text-white/25 mt-7">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => switchMode(mode === "login" ? "register" : "login")}
              className="text-ember-400 hover:text-ember-300 font-medium transition-colors">
              {mode === "login" ? "Create one free" : "Sign in"}
            </button>
          </p>

          <p className="text-center text-xs text-white/15 mt-3">
            By continuing you agree to our{" "}
            <span className="text-white/30 hover:text-white/50 cursor-pointer transition-colors">Terms</span>
            {" & "}
            <span className="text-white/30 hover:text-white/50 cursor-pointer transition-colors">Privacy Policy</span>
          </p>

        </div>
      </div>
    </div>
  );
}
