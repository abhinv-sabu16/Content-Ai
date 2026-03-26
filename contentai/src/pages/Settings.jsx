import { useState, useEffect } from "react";
import { Save, Check, Sliders, Palette, Cpu, RefreshCw, Wifi, WifiOff, Zap } from "lucide-react";
import TopBar from "../components/TopBar";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

const Section = ({ icon: Icon, title, children }) => (
  <div className="rounded-2xl border border-white/5 bg-ink-800 overflow-hidden">
    <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
      <Icon size={16} className="text-ember-400" />
      <h3 className="font-display font-semibold text-white text-sm">{title}</h3>
    </div>
    <div className="p-5 space-y-5">{children}</div>
  </div>
);

const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide">{label}</label>
    {children}
    {hint && <p className="text-xs text-white/25 mt-1.5">{hint}</p>}
  </div>
);

export default function Settings({ onToggleSidebar, session, onOpenProfile }) {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem("contentai_settings") || "{}"); } catch { return {}; }
  });

  const [aiStatus, setAiStatus] = useState(null);
  const [checking, setChecking] = useState(false);

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  const checkAiStatus = async () => {
    setChecking(true);
    try {
      const res = await fetch(`${API}/generate/status`, { credentials: "include" });
      const data = await res.json();
      setAiStatus(data);
    } catch {
      setAiStatus({ status: "offline", provider: "none", error: "Could not reach server." });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { checkAiStatus(); }, []);

  const handleSave = () => {
    localStorage.setItem("contentai_settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSelectModel = (m) => {
    const next = { ...settings, activeModel: m };
    setSettings(next);
    localStorage.setItem("contentai_settings", JSON.stringify(next));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputClass = "w-full bg-ink-700 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder-white/20 focus:border-ember-500/50 transition-colors";

  const isOnline = aiStatus?.status === "online";
  const provider = aiStatus?.provider || "none";

  // Dynamic styles per provider
  const isGroq = provider === "Groq";
  const isOllama = provider === "Ollama";

  const statusStyle = isOnline
    ? isGroq
      ? { bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.25)", color: "#818cf8" }
      : { bg: "rgba(63,255,162,0.06)", border: "rgba(63,255,162,0.2)", color: "#3fffa2" }
    : { bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.2)", color: "#f87171" };

  const modelStyle = isGroq
    ? { activeBg: "rgba(99,102,241,0.1)", activeBorder: "rgba(99,102,241,0.3)", activeColor: "#818cf8", icon: "⚡" }
    : { activeBg: "rgba(63,255,162,0.08)", activeBorder: "rgba(63,255,162,0.25)", activeColor: "#3fffa2", icon: "🦙" };

  const engineTitle = isOnline ? `AI Engine — ${provider}` : "AI Engine";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <TopBar
        onToggleSidebar={onToggleSidebar}
        title="Settings"
        subtitle="Preferences & configuration"
        session={session}
        onOpenProfile={onOpenProfile}
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-5">

          {/* ── AI Engine ── */}
          <Section icon={Cpu} title={engineTitle}>

            {/* Status card */}
            <div className="flex items-center justify-between p-4 rounded-xl transition-all"
              style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.border}` }}>
              <div className="flex items-center gap-3">
                {checking
                  ? <RefreshCw size={16} className="text-white/30 animate-spin" />
                  : isOnline
                    ? <Wifi size={16} style={{ color: statusStyle.color }} />
                    : <WifiOff size={16} className="text-red-400" />
                }
                <div>
                  <p className="text-sm font-semibold"
                    style={{ color: checking ? "rgba(255,255,255,0.4)" : statusStyle.color }}>
                    {checking
                      ? "Checking AI engine…"
                      : isOnline
                        ? `${isGroq ? "⚡" : "🦙"} ${provider} is connected`
                        : "No AI provider available"
                    }
                  </p>
                  {isOnline && (aiStatus?.activeModel || settings.activeModel) && (
                    <p className="text-xs text-white/35 mt-0.5">
                      Active model:{" "}
                      <span className="font-mono" style={{ color: statusStyle.color }}>
                        {settings.activeModel || aiStatus.activeModel}
                      </span>
                    </p>
                  )}
                  {!isOnline && !checking && aiStatus?.error && (
                    <p className="text-xs text-white/35 mt-0.5">{aiStatus.error}</p>
                  )}
                </div>
              </div>
              <button onClick={checkAiStatus} disabled={checking}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 border border-white/8 transition-all disabled:opacity-50">
                <RefreshCw size={12} className={checking ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {/* Models list — works for both Groq and Ollama */}
            {isOnline && aiStatus?.availableModels?.length > 0 && (
              <Field
                label="Available Models"
                hint={isGroq
                  ? "These models are available via your Groq API key."
                  : "These models are installed locally via Ollama."
                }>
                <div className="flex flex-col gap-2">
                  {aiStatus.availableModels.map(m => {
                    const isActive = (settings.activeModel || aiStatus.activeModel) === m;
                    return (
                      <button key={m}
                        onClick={() => handleSelectModel(m)}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all hover:bg-white/5 active:scale-[0.98] w-full text-left"
                        style={{
                          background: isActive ? modelStyle.activeBg : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isActive ? modelStyle.activeBorder : "rgba(255,255,255,0.06)"}`,
                        }}>
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{modelStyle.icon}</span>
                          <span className="text-sm font-mono text-white/75">{m}</span>
                        </div>
                        {isActive && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: modelStyle.activeBg, color: modelStyle.activeColor }}>
                            Active
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}

            {/* Offline — setup instructions */}
            {!isOnline && !checking && (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,107,53,0.15)" }}>
                <div className="px-4 py-3" style={{ background: "rgba(255,107,53,0.05)" }}>
                  <p className="text-xs font-bold text-ember-400 uppercase tracking-widest">Setup Options</p>
                </div>
                <div className="p-4 space-y-4">
                  {/* Groq */}
                  <div className="p-3 rounded-xl" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap size={13} className="text-indigo-400" />
                      <p className="text-xs font-semibold text-indigo-400">Option 1 — Groq (Free, Cloud)</p>
                    </div>
                    <p className="text-xs text-white/40 mb-2">Get a free key at console.groq.com then add to your server:</p>
                    <code className="text-xs font-mono text-indigo-300 bg-white/5 px-2 py-1 rounded block">
                      GROQ_API_KEY=gsk_your_key_here
                    </code>
                  </div>
                  {/* Ollama */}
                  <div className="p-3 rounded-xl" style={{ background: "rgba(63,255,162,0.04)", border: "1px solid rgba(63,255,162,0.1)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">🦙</span>
                      <p className="text-xs font-semibold text-jade-400">Option 2 — Ollama (Local)</p>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { n: "1", text: "Download from ollama.com and install" },
                        { n: "2", cmd: "ollama serve", text: "Start server" },
                        { n: "3", cmd: "ollama pull llama3.2", text: "Download model (4GB)" },
                      ].map(({ n, cmd, text }) => (
                        <div key={n} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 mt-0.5"
                            style={{ background: "rgba(63,255,162,0.2)", fontSize: "9px" }}>{n}</span>
                          <div>
                            <p className="text-xs text-white/40">{text}</p>
                            {cmd && <code className="text-xs font-mono text-jade-300 bg-white/5 px-1.5 py-0.5 rounded mt-0.5 inline-block">{cmd}</code>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* ── Generation Defaults ── */}
          <Section icon={Sliders} title="Generation Defaults">
            <Field label="Default Tone">
              <select value={settings.defaultTone || "Professional"}
                onChange={e => set("defaultTone", e.target.value)}
                className={inputClass} style={{ background: "#1c1c2e" }}>
                {["Professional", "Conversational", "Humorous", "Authoritative", "Inspirational"].map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Default Language">
              <select value={settings.language || "English"}
                onChange={e => set("language", e.target.value)}
                className={inputClass} style={{ background: "#1c1c2e" }}>
                {["English", "Spanish", "French", "German", "Portuguese", "Hindi", "Japanese", "Chinese"].map(l => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </Field>
          </Section>

          {/* ── Appearance ── */}
          <Section icon={Palette} title="Appearance">
            <Field label="Theme">
              <div className="grid grid-cols-3 gap-2">
                {["Dark", "Darker", "OLED"].map(theme => (
                  <button key={theme} onClick={() => set("theme", theme)}
                    className={`py-2 rounded-xl border text-xs font-medium transition-all ${
                      settings.theme === theme || (!settings.theme && theme === "Dark")
                        ? "border-ember-500/50 bg-ember-500/10 text-ember-300"
                        : "border-white/5 bg-ink-700 text-white/40 hover:border-white/15"
                    }`}>
                    {theme}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Font Size">
              <select value={settings.fontSize || "medium"}
                onChange={e => set("fontSize", e.target.value)}
                className={inputClass} style={{ background: "#1c1c2e" }}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </Field>
          </Section>

          <button onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-95"
            style={{ background: saved ? "rgba(63,255,162,0.15)" : "linear-gradient(135deg, #ff6b35, #f54e1e)", color: saved ? "#3fffa2" : "white" }}>
            {saved ? <><Check size={15} /> Saved!</> : <><Save size={15} /> Save Settings</>}
          </button>

        </div>
      </div>
    </div>
  );
}
