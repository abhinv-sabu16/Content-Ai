import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, FileText, TrendingUp, Clock, ArrowRight, Sparkles } from "lucide-react";
import TopBar from "../components/TopBar";
import ToolCard from "../components/ToolCard";
import { TOOLS } from "../lib/tools";
import { getHistory, getUsage } from "../lib/history";

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="flex flex-col p-5 rounded-2xl border border-white/5 bg-ink-800">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18` }}>
          <Icon size={17} style={{ color }} />
        </div>
      </div>
      <p className="font-display font-bold text-2xl text-white">{value}</p>
      <p className="text-xs text-white/50 mt-0.5">{label}</p>
      {sub && <p className="text-xs mt-1" style={{ color }}>{sub}</p>}
    </div>
  );
}

export default function Dashboard({ onToggleSidebar, session, onOpenProfile }) {
  const [history, setHistory] = useState([]);
  const [usage, setUsage] = useState({ total: 0, today: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    getHistory({ limit: 5 }).then(entries => setHistory(entries)).catch(() => {});
    setUsage(getUsage());
  }, []);

  const featuredTools = TOOLS.slice(0, 4);
  const recentTools = [...new Map(history.map(h => [h.toolId, h])).values()].slice(0, 4);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <TopBar onToggleSidebar={onToggleSidebar} title="Dashboard" subtitle="Welcome back" session={session} onOpenProfile={onOpenProfile} />

      <div className="flex-1 overflow-auto p-6 space-y-8">
        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-2xl p-6 md:p-8"
          style={{ background: "linear-gradient(135deg, #1c0e06 0%, #2d1008 50%, #1c0e06 100%)", border: "1px solid rgba(255,107,53,0.2)" }}>
          <div className="absolute inset-0 opacity-20"
            style={{ background: "radial-gradient(circle at 80% 50%, #ff6b35 0%, transparent 60%)" }} />
          <div className="relative z-10 max-w-xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-ember-400" />
              <span className="text-xs text-ember-400 font-semibold uppercase tracking-widest">AI-Powered</span>
            </div>
            <h2 className="font-display font-bold text-2xl md:text-3xl text-white mb-2 leading-tight">
              Create content that
              <span className="shimmer-text"> converts.</span>
            </h2>
            <p className="text-white/50 text-sm mb-5 leading-relaxed">
              8 powerful AI tools for blogs, social media, emails, ads and more. Generate in seconds.
            </p>
            <button
              onClick={() => navigate("/generate")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)" }}
            >
              <Zap size={14} fill="white" />
              Start Generating
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div>
          <h3 className="font-display font-semibold text-white/60 text-xs uppercase tracking-widest mb-4">Your Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Zap} label="Total Generated" value={usage.total} color="#ff6b35" />
            <StatCard icon={TrendingUp} label="Generated Today" value={usage.today} color="#34d399" sub="↑ Active today" />
            <StatCard icon={FileText} label="Saved Items" value={history.length} color="#38bdf8" />
            <StatCard icon={Clock} label="Avg. Time" value="~3s" color="#a78bfa" sub="Per generation" />
          </div>
        </div>

        {/* Tools */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-white/60 text-xs uppercase tracking-widest">Popular Tools</h3>
            <button onClick={() => navigate("/generate")} className="text-xs text-ember-400 hover:text-ember-300 flex items-center gap-1">
              View all <ArrowRight size={11} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredTools.map(tool => <ToolCard key={tool.id} tool={tool} />)}
          </div>
        </div>

        {/* Recent history */}
        {history.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-white/60 text-xs uppercase tracking-widest">Recent Generations</h3>
              <button onClick={() => navigate("/history")} className="text-xs text-ember-400 hover:text-ember-300 flex items-center gap-1">
                View all <ArrowRight size={11} />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {history.map(item => (
                <div key={item.id} className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-ink-800 group cursor-pointer hover:border-white/10 transition-colors"
                  onClick={() => navigate(`/history`)}>
                  <span className="text-xl mt-0.5 flex-shrink-0">{TOOLS.find(t => t.id === item.toolId)?.icon || "📄"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">{item.toolName}</p>
                    <p className="text-xs text-white/30 truncate mt-0.5">{item.output?.slice(0, 120)}...</p>
                  </div>
                  <span className="text-xs text-white/20 flex-shrink-0 mt-0.5">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
