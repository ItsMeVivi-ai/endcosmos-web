window.AdminLayout = (() => {
  const { classNames } = window.AdminCore;

  function Sidebar({ active, onChange, menuOpen, onClose }) {
    const items = window.AdminData.sidebarItems;

    return (
      <>
        <button
          onClick={onClose}
          className={classNames(
            "fixed inset-0 z-30 bg-black/40 backdrop-blur-xs transition md:hidden",
            menuOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={!menuOpen}
        />

        <aside
          className={classNames(
            "glass-strong scrollbar-cosmos fixed z-40 m-3 flex h-[calc(100%-1.5rem)] w-72 flex-col rounded-2xl p-4 transition-transform md:sticky md:top-3 md:m-3 md:translate-x-0",
            menuOpen ? "translate-x-0" : "-translate-x-[120%]",
          )}
        >
          <div className="mb-6 rounded-xl border border-neon-300/20 bg-cosmos-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-neon-300">
              EndCosmos
            </p>
            <h2 className="mt-1 text-lg font-semibold">Admin Nexus</h2>
            <p className="small-muted mt-2 text-xs">
              Control premium, limpio y escalable.
            </p>
          </div>

          <nav className="space-y-2">
            {items.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  onChange(item.key);
                  onClose();
                }}
                className={classNames(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition",
                  active === item.key
                    ? "bg-neon-300/15 text-neon-200 shadow-glow"
                    : "text-slate-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <span className="text-neon-300">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-xl border border-neon-300/20 bg-cosmos-850/65 p-3">
            <p className="text-xs text-neon-200">Estado del núcleo</p>
            <p className="mt-1 text-sm font-medium">Sincronización estable</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-cosmos-900">
              <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-neon-400 to-mag-400 animate-pulseSoft" />
            </div>
          </div>
        </aside>
      </>
    );
  }

  function Topbar({ query, setQuery, onMenuToggle }) {
    return (
      <header className="sticky top-0 z-20 border-b border-white/10 bg-cosmos-950/65 px-4 py-3 backdrop-blur md:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="glass flex h-10 w-10 items-center justify-center rounded-xl text-neon-200 md:hidden"
            aria-label="Abrir menú"
          >
            ☰
          </button>

          <div className="glass flex flex-1 items-center gap-3 rounded-xl px-3 py-2">
            <span className="text-neon-300">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder="Buscar usuarios, proyectos, contenido..."
              aria-label="Buscar"
            />
          </div>

          <button className="glass relative flex h-10 w-10 items-center justify-center rounded-xl text-neon-200">
            ⟡
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-neon-300" />
          </button>

          <div className="glass flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neon-300/20 text-neon-200">
              V
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium leading-tight">Vivi</p>
              <p className="small-muted text-xs leading-tight">Super Admin</p>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return {
    Sidebar,
    Topbar,
  };
})();
