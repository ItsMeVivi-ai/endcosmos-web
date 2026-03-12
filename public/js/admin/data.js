window.AdminData = {
  visualLanguage: {
    source: "C:/Users/Vivi/OneDrive/COSMOS/ZOGS",
    summary:
      "Base dark espacial azul-violeta con acentos eléctricos cian y microdetalles magenta/cálidos, reinterpretado en UI premium limpia.",
    extracted: {
      images: 200,
      avgBrightness: 76.97,
      avgContrast: 47.58,
      avgSaturation: 0.451,
      dominantBase: ["#070914", "#0B1020", "#111830"],
      accent: ["#305090", "#38BDF8", "#67E8F9", "#A78BFA"],
    },
  },

  sidebarItems: [
    { key: "dashboard", label: "Dashboard", icon: "◈" },
    { key: "users", label: "Usuarios", icon: "◎" },
    { key: "world", label: "World Control", icon: "✹" },
    { key: "content", label: "Contenido", icon: "◇" },
    { key: "settings", label: "Configuración", icon: "⚙" },
    { key: "activity", label: "Actividad", icon: "✦" },
  ],

  metrics: [
    { title: "Usuarios activos", value: "12,480", delta: "+8.4%", trend: "up" },
    { title: "Proyectos en curso", value: "316", delta: "+2.1%", trend: "up" },
    {
      title: "Tasa de conversión",
      value: "4.92%",
      delta: "+0.6%",
      trend: "up",
    },
    {
      title: "Incidencias abiertas",
      value: "29",
      delta: "-14.7%",
      trend: "down",
    },
  ],

  users: [
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
    {
      name: "Kai Nox",
      role: "Moderator",
      status: "Idle",
      projects: 4,
      last: "Hace 22 min",
    },
  ],

  projects: [
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
    {
      code: "COS-22",
      name: "Nexus Identity",
      owner: "Ema Flux",
      progress: 73,
      phase: "QA",
    },
  ],

  content: [
    {
      section: "ZOGS Gallery",
      status: "Publicado",
      items: 1584,
      updated: "Hace 9 min",
    },
    {
      section: "Lore Hub",
      status: "Revisión",
      items: 214,
      updated: "Hace 27 min",
    },
    {
      section: "Newsroom",
      status: "Activo",
      items: 96,
      updated: "Hace 14 min",
    },
    {
      section: "Landing Assets",
      status: "Draft",
      items: 48,
      updated: "Hace 1 h",
    },
  ],

  activity: [
    "Deploy validado en producción",
    "Manifests regenerados correctamente",
    "Monitoreo healthz estable",
    "Regla de redirección www -> apex validada",
    "Sincronización backend/public completada",
  ],

  performanceSeries: [18, 24, 21, 33, 29, 42, 40, 49, 46, 58, 63, 60],
};
