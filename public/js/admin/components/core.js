window.AdminCore = (() => {
  function classNames(...values) {
    return values.filter(Boolean).join(" ");
  }

  function SectionHeader({ title, subtitle, icon = "✦" }) {
    return (
      <header className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-neon-200">
            {title}
          </h3>
          <p className="small-muted mt-1 text-xs">{subtitle}</p>
        </div>
        <span className="text-neon-300">{icon}</span>
      </header>
    );
  }

  function StatusBadge({ status }) {
    const map = {
      Online: "bg-emerald-400/20 text-emerald-300 border-emerald-300/30",
      Idle: "bg-amber-300/20 text-amber-200 border-amber-200/30",
      Offline: "bg-slate-400/20 text-slate-300 border-slate-300/30",
      Publicado: "bg-cyan-300/20 text-cyan-200 border-cyan-200/30",
      Revisión: "bg-violet-300/20 text-violet-200 border-violet-200/30",
      Activo: "bg-emerald-300/20 text-emerald-200 border-emerald-200/30",
      Draft: "bg-slate-300/20 text-slate-200 border-slate-200/30",
    };

    return (
      <span
        className={classNames(
          "rounded-full border px-2 py-1 text-xs",
          map[status] || map.Offline,
        )}
      >
        {status}
      </span>
    );
  }

  function ToggleRow({ label, enabled, onToggle }) {
    return (
      <button
        onClick={onToggle}
        type="button"
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-cosmos-900/45 px-3 py-2 text-left"
      >
        <span className="text-sm text-slate-300">{label}</span>
        <span
          className={classNames(
            "inline-flex h-6 w-11 items-center rounded-full border transition",
            enabled
              ? "justify-end border-cyan-300/60 bg-cyan-400/20"
              : "justify-start border-white/20 bg-white/5",
          )}
        >
          <span
            className={classNames(
              "mx-1 h-4 w-4 rounded-full",
              enabled ? "bg-cyan-300" : "bg-slate-500",
            )}
          />
        </span>
      </button>
    );
  }

  return {
    classNames,
    SectionHeader,
    StatusBadge,
    ToggleRow,
  };
})();
