window.AdminApp = (() => {
  const { useEffect, useMemo, useState } = React;

  const { Sidebar, Topbar } = window.AdminLayout;
  const { SectionHeader } = window.AdminCore;
  const {
    StatCard,
    PerformanceWidget,
    SignalsWidget,
    UsersWidget,
    SettingsCard,
  } = window.AdminDashboard;
  const { UsersModule, ProjectsModule, ContentModule, ActivityModule } =
    window.AdminModules;

  const ADMIN_SESSION_KEY = "endcosmos_admin_session";

  function getApiBase() {
    if (window.ENDCOSMOS_API_URL) {
      return window.ENDCOSMOS_API_URL;
    }
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return "http://127.0.0.1:8000";
    }
    return "http://127.0.0.1:8000";
  }

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${getApiBase()}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(payload?.detail || `Error ${response.status}`);
    }

    return payload;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("es-ES").format(value || 0);
  }

  function mapOverviewToMetrics(overview) {
    const metrics = overview?.metrics || {};
    return [
      {
        title: "Usuarios totales",
        value: formatNumber(metrics.total_users),
        delta: `+${formatNumber(metrics.new_users_7d)} (7d)`,
        trend: "up",
      },
      {
        title: "Usuarios activos",
        value: formatNumber(metrics.active_users),
        delta: `${formatNumber(metrics.verified_users)} verificados`,
        trend: "up",
      },
      {
        title: "Login exitoso 24h",
        value: formatNumber(metrics.successful_logins_24h),
        delta: `${metrics.login_success_ratio || 0}% ratio`,
        trend: "up",
      },
      {
        title: "Login fallido 24h",
        value: formatNumber(metrics.failed_logins_24h),
        delta: "Atención de seguridad",
        trend: (metrics.failed_logins_24h || 0) > 0 ? "down" : "up",
      },
    ];
  }

  function mapOverviewUsers(overview) {
    const users = overview?.users || [];
    return users.map((user, index) => ({
      name: user.name,
      role: user.role,
      status: user.status,
      projects: index + 1,
      last: user.last
        ? new Date(user.last).toLocaleString("es-ES")
        : "Sin login",
    }));
  }

  function isAdminRole(role) {
    const currentRole = String(role || "").toLowerCase();
    return ["admin", "superadmin", "super_admin"].includes(currentRole);
  }

  function LoginCard({ onSubmit, loading, error }) {
    const [identity, setIdentity] = useState("");
    const [password, setPassword] = useState("");

    return (
      <div className="grid-noise flex min-h-screen items-center justify-center p-4 text-slate-100">
        <section className="glass-strong neon-line w-full max-w-md rounded-2xl p-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Admin Access
          </h1>
          <p className="small-muted mt-2 text-sm">
            Ingresa con una cuenta de rol admin.
          </p>

          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit({ identity, password });
            }}
          >
            <label className="block text-sm">
              <span className="small-muted">Usuario o email</span>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-cosmos-900/55 px-3 py-2 outline-none"
                value={identity}
                onChange={(event) => setIdentity(event.target.value)}
                autoComplete="username"
                required
              />
            </label>

            <label className="block text-sm">
              <span className="small-muted">Contraseña</span>
              <input
                type="password"
                className="mt-1 w-full rounded-xl border border-white/10 bg-cosmos-900/55 px-3 py-2 outline-none"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            {error ? (
              <p className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-200">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl border border-neon-300/30 bg-neon-300/15 px-3 py-2 text-sm font-medium text-neon-100 transition hover:bg-neon-300/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Validando..." : "Entrar al panel"}
            </button>
          </form>
        </section>
      </div>
    );
  }

  function WorldControlPanel({
    worldStats,
    syncingWorld,
    worldMessage,
    maxImages,
    setMaxImages,
    onSyncWorld,
    linkForm,
    setLinkForm,
    onLinkImage,
  }) {
    return (
      <section className="grid gap-4 xl:grid-cols-2">
        <article className="glass-strong neon-line rounded-2xl p-4">
          <SectionHeader
            title="World Sync"
            subtitle="Control total del repertorio EndCosmos + ZOGS"
            icon="✹"
          />

          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <p>Assets detectados: {worldStats?.assets_images ?? "-"}</p>
            <p>Imágenes vinculadas: {worldStats?.linked_images ?? "-"}</p>
            <p>Clases: {worldStats?.classes ?? "-"}</p>
            <p>Casas: {worldStats?.houses ?? "-"}</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Máximo imágenes (vacío = todas)"
              value={maxImages}
              onChange={(event) => setMaxImages(event.target.value)}
              className="w-full max-w-xs rounded-xl border border-white/10 bg-cosmos-900/55 px-3 py-2 text-sm outline-none"
            />

            <button
              type="button"
              onClick={onSyncWorld}
              disabled={syncingWorld}
              className="rounded-xl border border-neon-300/30 bg-neon-300/15 px-3 py-2 text-sm font-medium text-neon-100 hover:bg-neon-300/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncingWorld
                ? "Sincronizando..."
                : "Sincronizar repertorio total"}
            </button>
          </div>

          {worldMessage ? (
            <p className="mt-3 rounded-xl border border-white/10 bg-cosmos-900/45 px-3 py-2 text-sm text-slate-200">
              {worldMessage}
            </p>
          ) : null}
        </article>

        <article className="glass-strong rounded-2xl p-4">
          <SectionHeader
            title="House Link"
            subtitle="Añadir imagen directa a una casa"
            icon="⟡"
          />

          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              onLinkImage();
            }}
          >
            <input
              placeholder="house_slug (ej: aurelia-wardens)"
              value={linkForm.houseSlug}
              onChange={(event) =>
                setLinkForm((current) => ({
                  ...current,
                  houseSlug: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-white/10 bg-cosmos-900/55 px-3 py-2 text-sm outline-none"
              required
            />
            <input
              placeholder="/assets/.../imagen.png"
              value={linkForm.imagePath}
              onChange={(event) =>
                setLinkForm((current) => ({
                  ...current,
                  imagePath: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-white/10 bg-cosmos-900/55 px-3 py-2 text-sm outline-none"
              required
            />
            <input
              placeholder="Título"
              value={linkForm.title}
              onChange={(event) =>
                setLinkForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-white/10 bg-cosmos-900/55 px-3 py-2 text-sm outline-none"
              required
            />
            <input
              type="number"
              min="1"
              max="10"
              step="1"
              value={linkForm.powerLevel}
              onChange={(event) =>
                setLinkForm((current) => ({
                  ...current,
                  powerLevel: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-white/10 bg-cosmos-900/55 px-3 py-2 text-sm outline-none"
              required
            />
            <button
              type="submit"
              className="rounded-xl border border-neon-300/30 bg-neon-300/15 px-3 py-2 text-sm font-medium text-neon-100 hover:bg-neon-300/25"
            >
              Vincular imagen a casa
            </button>
          </form>
        </article>
      </section>
    );
  }

  function App() {
    const [session, setSession] = useState(() => {
      try {
        const raw = localStorage.getItem(ADMIN_SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    });
    const [active, setActive] = useState("dashboard");
    const [query, setQuery] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [syncingWorld, setSyncingWorld] = useState(false);
    const [loginError, setLoginError] = useState("");
    const [worldMessage, setWorldMessage] = useState("");
    const [overview, setOverview] = useState(null);
    const [worldStats, setWorldStats] = useState(null);
    const [maxImages, setMaxImages] = useState("");
    const [linkForm, setLinkForm] = useState({
      houseSlug: "aurelia-wardens",
      imagePath: "/assets/images/endcosmos-maps-main.png",
      title: "Carga manual",
      powerLevel: "9",
    });
    const [settings, setSettings] = useState([
      { key: "safe-api", label: "Modo seguro API", enabled: true },
      {
        key: "live-notifs",
        label: "Notificaciones en tiempo real",
        enabled: true,
      },
      { key: "auto-sync", label: "Sincronización automática", enabled: false },
    ]);

    useEffect(() => {
      if (!session?.token) return;

      setLoading(true);
      apiRequest("/admin/overview", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      })
        .then((response) => {
          setOverview(response.data || null);
        })
        .catch(() => {
          setSession(null);
          setOverview(null);
          localStorage.removeItem(ADMIN_SESSION_KEY);
        })
        .finally(() => setLoading(false));

      apiRequest("/world/catalog/stats", {
        method: "GET",
      })
        .then((response) => setWorldStats(response.data || null))
        .catch(() => setWorldStats(null));
    }, [session?.token]);

    const q = query.trim().toLowerCase();

    const sourceUsers = useMemo(() => {
      return overview ? mapOverviewUsers(overview) : window.AdminData.users;
    }, [overview]);

    const sourceMetrics = useMemo(() => {
      return overview
        ? mapOverviewToMetrics(overview)
        : window.AdminData.metrics;
    }, [overview]);

    const sourceActivity = useMemo(() => {
      return overview?.activity || window.AdminData.activity;
    }, [overview]);

    const filteredUsers = useMemo(() => {
      if (!q) return sourceUsers;
      return sourceUsers.filter((user) =>
        [user.name, user.role, user.status].join(" ").toLowerCase().includes(q),
      );
    }, [q, sourceUsers]);

    const filteredProjects = useMemo(() => {
      if (!q) return window.AdminData.projects;
      return window.AdminData.projects.filter((project) =>
        [project.name, project.code, project.owner, project.phase]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }, [q]);

    const filteredContent = useMemo(() => {
      if (!q) return window.AdminData.content;
      return window.AdminData.content.filter((item) =>
        [item.section, item.status].join(" ").toLowerCase().includes(q),
      );
    }, [q]);

    const toggleSetting = (key) => {
      setSettings((current) =>
        current.map((item) =>
          item.key === key ? { ...item, enabled: !item.enabled } : item,
        ),
      );
    };

    const login = async ({ identity, password }) => {
      setLoading(true);
      setLoginError("");
      try {
        const response = await apiRequest("/login", {
          method: "POST",
          body: JSON.stringify({
            username_or_email: identity,
            password,
            source: "panel",
          }),
        });

        if (!response?.access_token || !response?.user) {
          throw new Error("No se pudo iniciar sesión");
        }

        if (!isAdminRole(response.user.role)) {
          throw new Error("Tu cuenta no tiene permisos de administrador");
        }

        const nextSession = {
          token: response.access_token,
          user: response.user,
        };
        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(nextSession));
        setSession(nextSession);
      } catch (error) {
        setLoginError(error.message || "Error de autenticación");
      } finally {
        setLoading(false);
      }
    };

    const logout = () => {
      localStorage.removeItem(ADMIN_SESSION_KEY);
      setSession(null);
      setOverview(null);
      setWorldStats(null);
      setWorldMessage("");
      setLoginError("");
    };

    const refreshWorldStats = async () => {
      const response = await apiRequest("/world/catalog/stats", {
        method: "GET",
      });
      setWorldStats(response.data || null);
    };

    const syncWorldRepertoire = async () => {
      setSyncingWorld(true);
      setWorldMessage("");
      try {
        const parsedMax = Number.parseInt(maxImages, 10);
        const payload =
          Number.isFinite(parsedMax) && parsedMax > 0
            ? { max_images: parsedMax }
            : { max_images: null };

        const response = await apiRequest("/world/admin/sync-repertoire", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.token}` },
          body: JSON.stringify(payload),
        });

        setWorldMessage(
          `Sync completado: ${response?.data?.synced_images || 0} imágenes repartidas en ${response?.data?.houses || 0} casas.`,
        );
        await refreshWorldStats();
      } catch (error) {
        setWorldMessage(error.message || "No se pudo sincronizar world");
      } finally {
        setSyncingWorld(false);
      }
    };

    const linkImageToHouse = async () => {
      setWorldMessage("");
      try {
        await apiRequest(
          `/world/admin/houses/${encodeURIComponent(linkForm.houseSlug)}/images`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${session.token}` },
            body: JSON.stringify({
              image_path: linkForm.imagePath,
              title: linkForm.title,
              power_level: Number.parseInt(linkForm.powerLevel, 10) || 8,
            }),
          },
        );
        setWorldMessage("Imagen vinculada correctamente a la casa.");
        await refreshWorldStats();
      } catch (error) {
        setWorldMessage(error.message || "No se pudo vincular la imagen");
      }
    };

    if (!session?.token) {
      return (
        <LoginCard onSubmit={login} loading={loading} error={loginError} />
      );
    }

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
              onMenuToggle={() => setMenuOpen((open) => !open)}
            />

            <main className="scrollbar-cosmos flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              <section className="mb-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                      EndCosmos Admin Control
                    </h1>
                    <p className="small-muted mt-2 text-sm md:text-base">
                      Operación segura para el panel de administración.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-xl border border-white/15 bg-cosmos-900/55 px-3 py-2 text-sm text-slate-200 hover:bg-cosmos-900/80"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </section>

              <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {sourceMetrics.map((metric) => (
                  <StatCard key={metric.title} {...metric} />
                ))}
              </section>

              {active === "dashboard" && (
                <>
                  <section className="mb-6 grid gap-4 xl:grid-cols-3">
                    <PerformanceWidget />
                    <SignalsWidget />
                    <UsersWidget users={filteredUsers} />
                  </section>

                  <section className="mb-6 grid gap-4 xl:grid-cols-2">
                    <UsersModule users={filteredUsers} />
                    <ProjectsModule projects={filteredProjects} />
                  </section>

                  <section className="grid gap-4 lg:grid-cols-3">
                    <ContentModule content={filteredContent} />
                    <SettingsCard
                      settings={settings}
                      onToggle={toggleSetting}
                    />
                    <ActivityModule activity={sourceActivity} />
                  </section>
                </>
              )}

              {active === "users" && <UsersModule users={filteredUsers} />}
              {active === "content" && (
                <ContentModule content={filteredContent} />
              )}
              {active === "world" && (
                <WorldControlPanel
                  worldStats={worldStats}
                  syncingWorld={syncingWorld}
                  worldMessage={worldMessage}
                  maxImages={maxImages}
                  setMaxImages={setMaxImages}
                  onSyncWorld={syncWorldRepertoire}
                  linkForm={linkForm}
                  setLinkForm={setLinkForm}
                  onLinkImage={linkImageToHouse}
                />
              )}
              {active === "activity" && (
                <ActivityModule activity={sourceActivity} />
              )}

              {active === "settings" && (
                <section className="grid gap-4 lg:grid-cols-2">
                  <SettingsCard settings={settings} onToggle={toggleSetting} />
                  <article className="glass rounded-2xl p-4">
                    <SectionHeader
                      title="Sistema"
                      subtitle="Perfil visual aplicado"
                      icon="◉"
                    />
                    <div className="mt-4 space-y-2 text-sm text-slate-300">
                      <p>
                        Fuente de estilo:{" "}
                        {window.AdminData.visualLanguage.source}
                      </p>
                      <p>
                        Brillo medio:{" "}
                        {
                          window.AdminData.visualLanguage.extracted
                            .avgBrightness
                        }
                      </p>
                      <p>
                        Contraste medio:{" "}
                        {window.AdminData.visualLanguage.extracted.avgContrast}
                      </p>
                      <p>
                        Saturación media:{" "}
                        {
                          window.AdminData.visualLanguage.extracted
                            .avgSaturation
                        }
                      </p>
                    </div>
                  </article>
                </section>
              )}
            </main>
          </div>
        </div>
      </div>
    );
  }

  return { App };
})();
