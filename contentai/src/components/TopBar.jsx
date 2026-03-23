import { PanelLeft, Bell, Search } from "lucide-react";

export default function TopBar({ onToggleSidebar, title, subtitle, session, onOpenProfile }) {
  const initials = session?.name
    ? session.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-ink-950/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"
        >
          <PanelLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display font-semibold text-white text-base leading-none truncate">{title}</h1>
          {subtitle && <p className="text-xs text-white/40 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-white/30 text-sm">
          <Search size={13} />
          <span className="hidden sm:block">Search...</span>
          <kbd className="hidden sm:block text-xs bg-white/10 px-1.5 py-0.5 rounded text-white/20">⌘K</kbd>
        </div>

        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all">
          <Bell size={15} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-ember-400" />
        </button>

        {/* Avatar — opens profile modal */}
        <button
          onClick={onOpenProfile}
          title="View profile"
          className="group relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/10 hover:ring-ember-400/60 transition-all"
        >
          {session?.avatar ? (
            <img src={session.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #ff6b35, #f54e1e)" }}>
              {initials}
            </div>
          )}
        </button>
      </div>
    </header>
  );
}
