const { useMemo, useState } = React;

const SIDEBAR_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "◈" },
  { key: "users", label: "Usuarios", icon: "◎" },
  { key: "projects", label: "Proyectos", icon: "⬢" },
  { key: "content", label: "Contenido", icon: "◇" },
  { key: "settings", label: "Configuración", icon: "⚙" },
];

const METRICS = [
  { title: "Usuarios activos", value: "12,480", delta: "+8.4%", trend: "up" },
  { title: "Proyectos en curso", value: "316", delta: "+2.1%", trend: "up" },
  { title: "Tasa de conversión", value: "4.92%", delta: "+0.6%", trend: "up" },
  {
    title: "Incidencias abiertas",
    value: "29",
    delta: "-14.7%",
    trend: "down",
  },
];

const USERS = [
  {
    name: "Vera Sol",
    role: "Admin",
    status: "Online",
    projects: 12,
    last: "Hace 2 min",
  },
  {
    name: "Lio Arkan",
    role: "Editor",
    status: "Online",
    projects: 8,
    last: "Hace 4 min",
  },
  {
    name: "Nia Krol",
    role: "Analyst",
    status: "Idle",
    projects: 5,
    last: "Hace 18 min",
  },
  {
    name: "Dax Orion",
    role: "Developer",
    status: "Offline",
    projects: 14,
    last: "Hace 1 h",
  },
  {
    name: "Ema Flux",
    role: "Support",
    status: "Online",
    projects: 6,
    last: "Hace 7 min",
  },
];

const PROJECTS = [
  {
    code: "COS-01",
    name: "Nebula Commerce",
    owner: "Vera Sol",
    progress: 82,
    phase: "Staging",
  },
  {
    code: "COS-07",
    name: "Atlas Worlds",
    owner: "Dax Orion",
    progress: 64,
    phase: "Build",
  },
  {
    code: "COS-14",
    name: "Quantum Feed",
    owner: "Nia Krol",
    progress: 47,
    phase: "Research",
  },
  {
    code: "COS-19",
    name: "Holo Assets",
    owner: "Lio Arkan",
    progress: 91,
    phase: "Release",
  },
];

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function App() {
  const [active, setActive] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return USERS;
    return USERS.filter((user) =>
      [user.name, user.role, user.status].join(" ").toLowerCase().includes(q),
    );
  }, [query]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PROJECTS;
    return PROJECTS.filter((project) =>
      [project.name, project.code, project.owner, project.phase]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query]);

  return (
    <div className="grid-noise min-h-screen text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <Sidebar
          active={active}
          onChange={setActive}
          menuOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            query={query}
            setQuery={setQuery}
            onMenuToggle={() => setMenuOpen((v) => !v)}
          />

          <main className="scrollbar-cosmos flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <section className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                EndCosmos Admin Nexus
              </h1>
              <p className="small-muted mt-2 text-sm md:text-base">
                Reinterpretación moderna sci-fi: superficie oscura, capas
                holográficas y foco en datos operativos.
              </p>
            </section>

            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {METRICS.map((metric) => (
                <StatCard key={metric.title} {...metric} />
              ))}
            </section>

            <section className="mb-6 grid gap-4 xl:grid-cols-3">
              <PerformanceWidget />
              <SignalsWidget />
              <UsersWidget users={filteredUsers} />
            </section>

            <section className="mb-6 grid gap-4 2xl:grid-cols-5">
              <div className="glass-strong neon-line rounded-2xl p-4 2xl:col-span-3">
                <SectionHeader title="Usuarios" subtitle="Gestión operativa" />
                <UsersTable users={filteredUsers} />
              </div>

              <div className="glass-strong neon-line rounded-2xl p-4 2xl:col-span-2">
                <SectionHeader title="Proyectos" subtitle="Pipeline activo" />
                <ProjectsTable projects={filteredProjects} />
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <ContentSection />
              <SettingsSection />
              <ActivitySection />
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ active, onChange, menuOpen, onClose }) {
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
          <h2 className="mt-1 text-lg font-semibold">Control Plane</h2>
          <p className="small-muted mt-2 text-xs">
            Operaciones centralizadas en tiempo real.
          </p>
        </div>

        <nav className="space-y-2">
          {SIDEBAR_ITEMS.map((item) => (
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
            placeholder="Buscar usuarios, proyectos o estado..."
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

function StatCard({ title, value, delta, trend }) {
  const positive = trend === "up";

  return (
    <article className="glass-strong animate-float rounded-2xl p-4">
      <p className="small-muted text-sm">{title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p
        className={classNames(
          "mt-2 text-sm font-medium",
          positive ? "text-cyan-300" : "text-amber-300",
        )}
      >
        {delta} {positive ? "↗" : "↘"}
      </p>
    </article>
  );
}

function PerformanceWidget() {
  const points = [12, 25, 18, 32, 28, 46, 40, 52, 49, 58];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const normalized = points.map((point, index) => {
    const x = (index / (points.length - 1)) * 100;
    const y = 100 - ((point - min) / (max - min || 1)) * 100;
    return `${x},${y}`;
  });

  return (
    <article className="glass-strong neon-line rounded-2xl p-4 xl:col-span-2">
      <SectionHeader
        title="Rendimiento"
        subtitle="Carga del sistema y actividad"
      />
      <div className="mt-4 rounded-xl border border-white/10 bg-cosmos-900/50 p-4">
        <svg viewBox="0 0 100 100" className="h-40 w-full">
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#67E8F9" />
              <stop offset="100%" stopColor="#A78BFA" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={normalized.join(" ")}
          />
        </svg>
        <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-slate-300">
          <InfoChip label="Throughput" value="1.24M" />
          <InfoChip label="Latency" value="18ms" />
          <InfoChip label="Availability" value="99.98%" />
        </div>
      </div>
    </article>
  );
}

function SignalsWidget() {
  const items = [
    { label: "Alertas críticas", value: 2, tone: "text-amber-300" },
    { label: "Eventos auditados", value: 146, tone: "text-cyan-300" },
    { label: "Integraciones", value: 18, tone: "text-violet-300" },
  ];

  return (
    <article className="glass-strong rounded-2xl p-4">
      <SectionHeader title="Señales" subtitle="Monitoreo en vivo" />
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-white/10 bg-cosmos-900/50 p-3"
          >
            <p className="small-muted text-xs">{item.label}</p>
            <p className={classNames("mt-1 text-xl font-semibold", item.tone)}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function UsersWidget({ users }) {
  return (
    <article className="glass-strong rounded-2xl p-4">
      <SectionHeader title="Usuarios conectados" subtitle="Estado inmediato" />
      <div className="mt-4 space-y-2">
        {users.slice(0, 4).map((user) => (
          <div
            key={user.name}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-cosmos-900/50 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="small-muted text-xs">{user.role}</p>
            </div>
            <StatusBadge status={user.status} />
          </div>
        ))}
      </div>
    </article>
  );
}

function UsersTable({ users }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-cosmos-900/80">
          <tr className="text-left text-xs uppercase tracking-wider text-slate-300">
            <th className="px-3 py-2">Usuario</th>
            <th className="px-3 py-2">Rol</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2">Proyectos</th>
            <th className="px-3 py-2">Última actividad</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.name}
              className="border-t border-white/5 bg-cosmos-900/35"
            >
              <td className="px-3 py-2">{user.name}</td>
              <td className="px-3 py-2 text-slate-300">{user.role}</td>
              <td className="px-3 py-2">
                <StatusBadge status={user.status} />
              </td>
              <td className="px-3 py-2 text-slate-300">{user.projects}</td>
              <td className="px-3 py-2 text-slate-400">{user.last}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectsTable({ projects }) {
  return (
    <div className="mt-4 space-y-3">
      {projects.map((project) => (
        <article
          key={project.code}
          className="rounded-xl border border-white/10 bg-cosmos-900/45 p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-neon-300">{project.code}</p>
              <h4 className="mt-1 text-sm font-semibold">{project.name}</h4>
              <p className="small-muted text-xs">Owner: {project.owner}</p>
            </div>
            <span className="rounded-full border border-neon-300/30 px-2 py-1 text-xs text-neon-200">
              {project.phase}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-cosmos-900">
            <div
              className="h-full rounded-full bg-gradient-to-r from-neon-400 to-mag-400"
              style={{ width: `${project.progress}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-slate-300">
            {project.progress}%
          </p>
        </article>
      ))}
    </div>
  );
}

function ContentSection() {
  return (
    <article className="glass rounded-2xl p-4">
      <SectionHeader title="Contenido" subtitle="Assets y publicaciones" />
      <div className="mt-4 space-y-3 text-sm">
        <div className="rounded-xl border border-white/10 bg-cosmos-900/45 p-3">
          <p className="small-muted text-xs">Última importación</p>
          <p className="mt-1 font-medium">Catálogo ZOGS sincronizado</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-cosmos-900/45 p-3">
          <p className="small-muted text-xs">Pendientes</p>
          <p className="mt-1 font-medium">3 páginas en revisión editorial</p>
        </div>
      </div>
    </article>
  );
}

function SettingsSection() {
  return (
    <article className="glass rounded-2xl p-4">
      <SectionHeader
        title="Configuraciones"
        subtitle="Preferencias del sistema"
      />
      <div className="mt-4 space-y-3 text-sm">
        <ToggleRow label="Modo seguro API" enabled />
        <ToggleRow label="Notificaciones en tiempo real" enabled />
        <ToggleRow label="Sincronización automática" enabled={false} />
      </div>
    </article>
  );
}

function ActivitySection() {
  const activities = [
    "Deploy validado en producción",
    "Manifests regenerados correctamente",
    "Monitoreo healthz estable",
    "Reglas edge aplicadas en dominio www",
  ];

  return (
    <article className="glass rounded-2xl p-4">
      <SectionHeader title="Actividad" subtitle="Últimos eventos" />
      <ul className="mt-4 space-y-2 text-sm">
        {activities.map((activity) => (
          <li
            key={activity}
            className="rounded-xl border border-white/10 bg-cosmos-900/45 px-3 py-2 text-slate-300"
          >
            {activity}
          </li>
        ))}
      </ul>
    </article>
  );
}

function ToggleRow({ label, enabled }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-cosmos-900/45 px-3 py-2">
      <span className="text-slate-300">{label}</span>
      <span
        className={classNames(
          "inline-flex h-6 w-11 items-center rounded-full border transition",
          enabled
            ? "border-cyan-300/60 bg-cyan-400/20 justify-end"
            : "border-white/20 bg-white/5 justify-start",
        )}
      >
        <span
          className={classNames(
            "mx-1 h-4 w-4 rounded-full",
            enabled ? "bg-cyan-300" : "bg-slate-500",
          )}
        />
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    Online: "bg-emerald-400/20 text-emerald-300 border-emerald-300/30",
    Idle: "bg-amber-300/20 text-amber-200 border-amber-200/30",
    Offline: "bg-slate-400/20 text-slate-300 border-slate-300/30",
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

function SectionHeader({ title, subtitle }) {
  return (
    <header className="flex items-end justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-neon-200">
          {title}
        </h3>
        <p className="small-muted mt-1 text-xs">{subtitle}</p>
      </div>
      <span className="text-neon-300">✦</span>
    </header>
  );
}

function InfoChip({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-cosmos-900/60 px-2 py-2">
      <p className="small-muted">{label}</p>
      <p className="mt-1 font-medium text-neon-200">{value}</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
