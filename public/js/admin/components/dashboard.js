window.AdminDashboard = (() => {
  const { classNames, SectionHeader, StatusBadge, ToggleRow } =
    window.AdminCore;

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
    const points = window.AdminData.performanceSeries;
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
          <svg
            viewBox="0 0 100 100"
            className="h-40 w-full"
            aria-label="Gráfica de rendimiento"
          >
            <defs>
              <linearGradient id="lineGradX" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#67E8F9" />
                <stop offset="100%" stopColor="#A78BFA" />
              </linearGradient>
            </defs>
            <polyline
              fill="none"
              stroke="url(#lineGradX)"
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
              <p
                className={classNames("mt-1 text-xl font-semibold", item.tone)}
              >
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
        <SectionHeader
          title="Usuarios conectados"
          subtitle="Estado inmediato"
        />
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

  function SettingsCard({ settings, onToggle }) {
    return (
      <article className="glass rounded-2xl p-4">
        <SectionHeader
          title="Configuraciones"
          subtitle="Preferencias del sistema"
          icon="⚙"
        />
        <div className="mt-4 space-y-3 text-sm">
          {settings.map((item) => (
            <ToggleRow
              key={item.key}
              label={item.label}
              enabled={item.enabled}
              onToggle={() => onToggle(item.key)}
            />
          ))}
        </div>
      </article>
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

  return {
    StatCard,
    PerformanceWidget,
    SignalsWidget,
    UsersWidget,
    SettingsCard,
  };
})();
