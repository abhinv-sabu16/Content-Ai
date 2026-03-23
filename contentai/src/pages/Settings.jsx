import { useState, useEffect } from "react";
import { Save, Check, Sliders, Palette, Cpu, RefreshCw, Wifi, WifiOff } from "lucide-react";
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

  // Ollama status
  const [ollamaStatus, setOllamaStatus] = useState(null); // null | "checking" | "online" | "offline"
  const [ollamaModels, setOllamaModels] = useState([]);
  const [ollamaActive, setOllamaActive] = useState("");

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  const checkOllama = async () => {
    setOllamaStatus("checking");
    try {
      const res = await fetch(`${API}/generate/status`, { credentials: "include" });
      const data = await res.json();
      if (data.status === "online") {
        setOllamaStatus("online");
        setOllamaModels(data.availableModels || []);
        setOllamaActive(data.activeModel || "");
      } else {
        setOllamaStatus("offline");
      }
    } catch {
      setOllamaStatus("offline");
    }
  };

  useEffect(() => { checkOllama(); }, []);

  const handleSave = () => {
    localStorage.setItem("contentai_settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputClass = "w-full bg-ink-700 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder-white/20 focus:border-ember-500/50 transition-colors";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <TopBar onToggleSidebar={onToggleSidebar} title="Settings" subtitle="Preferences & configuration" session={session} onOpenProfile={onOpenProfile} />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-5">

          {/* ── Ollama Status ── */}
          <Section icon={Cpu} title="AI Engine — Ollama">
            {/* Status indicator */}
            <div className="flex items-center justify-between p-4 rounded-xl"
              style={{
                background: ollamaStatus === "online" ? "rgba(63,255,162,0.06)" : ollamaStatus === "offline" ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${ollamaStatus === "online" ? "rgba(63,255,162,0.2)" : ollamaStatus === "offline" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)"}`,
              }}>
              <div className="flex items-center gap-3">
                {ollamaStatus === "online"
                  ? <Wifi size={16} className="text-jade-400" />
                  : ollamaStatus === "offline"
                  ? <WifiOff size={16} className="text-red-400" />
                  : <RefreshCw size={16} className="text-white/30 animate-spin" />
                }
                <div>
                  <p className={`text-sm font-semibold ${ollamaStatus === "online" ? "text-jade-400" : ollamaStatus === "offline" ? "text-red-400" : "text-white/40"}`}>
                    {ollamaStatus === "online" ? "Ollama is running" : ollamaStatus === "offline" ? "Ollama is offline" : "Checking Ollama…"}
                  </p>
                  {ollamaStatus === "online" && ollamaActive && (
                    <p className="text-xs text-white/35 mt-0.5">Active model: <span className="font-mono text-jade-400/70">{ollamaActive}</span></p>
                  )}
                  {ollamaStatus === "offline" && (
                    <p className="text-xs text-white/35 mt-0.5">Run <span className="font-mono text-white/50">ollama serve</span> in your terminal</p>
                  )}
                </div>
              </div>
              <button onClick={checkOllama}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 border border-white/8 transition-all">
                <RefreshCw size={12} className={ollamaStatus === "checking" ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {/* Available models */}
            {ollamaStatus === "online" && ollamaModels.length > 0 && (
              <Field label="Available Models" hint="These are the models installed on your machine via Ollama.">
                <div className="flex flex-col gap-2">
                  {ollamaModels.map(m => (
                    <div key={m} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all"
                      style={{
                        background: ollamaActive === m ? "rgba(63,255,162,0.08)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${ollamaActive === m ? "rgba(63,255,162,0.25)" : "rgba(255,255,255,0.06)"}`,
                      }}>
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">🤖</span>
                        <span className="text-sm font-mono text-white/75">{m}</span>
                      </div>
                      {ollamaActive === m && (
                        <span className="text-xs text-jade-400 font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(63,255,162,0.1)" }}>Active</span>
                      )}
                    </div>
                  ))}
                </div>
              </Field>
            )}

            {/* Offline instructions */}
            {ollamaStatus === "offline" && (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,107,53,0.15)" }}>
                <div className="px-4 py-3" style={{ background: "rgba(255,107,53,0.05)" }}>
                  <p className="text-xs font-bold text-ember-400 uppercase tracking-widest">Quick Setup</p>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { step: "1", cmd: null, label: "Download Ollama from ollama.com and install it" },
                    { step: "2", cmd: "ollama serve", label: "Start Ollama server" },
                    { step: "3", cmd: "ollama pull llama3.2", label: "Download a model (4GB, one-time)" },
                  ].map(({ step, cmd, label }) => (
                    <div key={step} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                        style={{ background: "rgba(255,107,53,0.3)" }}>{step}</span>
                      <div>
                        <p className="text-xs text-white/50">{label}</p>
                        {cmd && (
                          <code className="text-xs font-mono text-ember-300 bg-white/5 px-2 py-0.5 rounded mt-1 inline-block">{cmd}</code>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No models installed */}
            {ollamaStatus === "online" && ollamaModels.length === 0 && (
              <div className="p-4 rounded-xl" style={{ background: "rgba(255,107,53,0.07)", border: "1px solid rgba(255,107,53,0.15)" }}>
                <p className="text-xs text-ember-400 font-semibold mb-1">No models installed</p>
                <p className="text-xs text-white/40 mb-2">Run this in your terminal to download a model:</p>
                <code className="text-xs font-mono text-ember-300 bg-white/5 px-3 py-1.5 rounded block">ollama pull llama3.2</code>
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
                        : "border-white/5 bg-ink-700 text-white/40 hover:border-white/15"}`}>
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
