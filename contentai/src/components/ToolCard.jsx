import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ToolCard({ tool, compact = false }) {
  const navigate = useNavigate();

  if (compact) {
    return (
      <button
        onClick={() => navigate(`/generate?tool=${tool.id}`)}
        className="card-hover flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-ink-800 text-left w-full group"
      >
        <span className="text-xl">{tool.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/90 truncate">{tool.name}</p>
          <p className="text-xs text-white/40 truncate">{tool.category}</p>
        </div>
        <ArrowRight size={13} className="text-white/20 group-hover:text-ember-400 transition-colors flex-shrink-0" />
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate(`/generate?tool=${tool.id}`)}
      className="card-hover group flex flex-col p-5 rounded-2xl border border-white/5 bg-ink-800 text-left relative overflow-hidden"
    >
      {/* bg accent */}
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5 blur-2xl"
        style={{ background: tool.color }}
      />

      <div className="flex items-start justify-between mb-4">
        <span className="text-2xl">{tool.icon}</span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: `${tool.color}18`, color: tool.color }}
        >
          {tool.category}
        </span>
      </div>

      <h3 className="font-display font-semibold text-white text-base mb-1">{tool.name}</h3>
      <p className="text-xs text-white/40 leading-relaxed mb-4">{tool.description}</p>

      <div className="flex items-center gap-1.5 text-xs font-medium mt-auto"
        style={{ color: tool.color }}>
        <span>Generate</span>
        <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
}
