window.AdminModules = (() => {
  const { SectionHeader, StatusBadge } = window.AdminCore;

  function UsersModule({ users }) {
    return (
      <section className="glass-strong neon-line rounded-2xl p-4">
        <SectionHeader title="Usuarios" subtitle="Gestión operativa" />
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
      </section>
    );
  }

  function ProjectsModule({ projects }) {
    return (
      <section className="glass-strong neon-line rounded-2xl p-4">
        <SectionHeader title="Proyectos" subtitle="Pipeline activo" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
      </section>
    );
  }

  function ContentModule({ content }) {
    return (
      <section className="glass-strong neon-line rounded-2xl p-4">
        <SectionHeader title="Contenido" subtitle="Módulos y catálogo" />
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-cosmos-900/80">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-300">
                <th className="px-3 py-2">Sección</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Items</th>
                <th className="px-3 py-2">Actualización</th>
              </tr>
            </thead>
            <tbody>
              {content.map((item) => (
                <tr
                  key={item.section}
                  className="border-t border-white/5 bg-cosmos-900/35"
                >
                  <td className="px-3 py-2">{item.section}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-3 py-2 text-slate-300">{item.items}</td>
                  <td className="px-3 py-2 text-slate-400">{item.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function ActivityModule({ activity }) {
    return (
      <section className="glass rounded-2xl p-4">
        <SectionHeader title="Actividad" subtitle="Últimos eventos" />
        <ul className="mt-4 space-y-2 text-sm">
          {activity.map((line) => (
            <li
              key={line}
              className="rounded-xl border border-white/10 bg-cosmos-900/45 px-3 py-2 text-slate-300"
            >
              {line}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return {
    UsersModule,
    ProjectsModule,
    ContentModule,
    ActivityModule,
  };
})();
