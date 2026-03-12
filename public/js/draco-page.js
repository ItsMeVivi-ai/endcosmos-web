(() => {
  const fallbackData = {
    name: "Draco",
    type: "planet",
    population: "4.8M",
    civilizations: ["Llunaris Vanguard", "Forgebound Houses", "Aster Nomads"],
    status: "active",
    map_zones: [
      "Citadel Ring",
      "Ashfall Basin",
      "Furnace Rift",
      "Shatter Docks",
      "Noctilux Plateau",
    ],
    npcs: [
      {
        name: "Veyra Quill",
        role: "Llunaris Liaison",
        location: "Citadel Ring",
        status: "on_duty",
      },
      {
        name: "Rhokan Ember",
        role: "Forge Overseer",
        location: "Furnace Rift",
        status: "active",
      },
      {
        name: "Seliar Keth",
        role: "Convoy Navigator",
        location: "Shatter Docks",
        status: "in_transit",
      },
    ],
    creatures: [
      { name: "Magma Wyrmling", threat_level: "high", habitat: "Ashfall Basin" },
      {
        name: "Voidback Stalker",
        threat_level: "critical",
        habitat: "Noctilux Plateau",
      },
      { name: "Ferric Hydra", threat_level: "extreme", habitat: "Furnace Rift" },
    ],
    economy: {
      primary_resource: "Aether Iron",
      trade_flux: 78,
      currency: "Lumens",
      trade_partners: ["Aurelia Capital", "Arcane Tower", "Ocean of Chaos"],
      market_state: "volatile-growth",
    },
    timeline: [
      "Cycle 211: Landing of the first Lunaris scout cohorts.",
      "Cycle 228: Foundation of the Citadel Ring and defensive orbital rails.",
      "Cycle 241: Forgebound Houses activate deep-core extraction.",
      "Cycle 253: Rift storms open and creature pressure escalates.",
      "Cycle 260: Convoy Pact signed to stabilize Draco exports.",
    ],
  };

  const DATA_URL = "/data/cosmos/worlds/draco.json";

  const byId = (id) => document.getElementById(id);

  function setText(id, value) {
    const node = byId(id);
    if (node) node.textContent = value;
  }

  function setMeter(id, value) {
    const node = byId(id);
    if (!node) return;
    const safe = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    node.style.setProperty("--level", `${safe}%`);
  }

  function renderList(listId, values) {
    const list = byId(listId);
    if (!list) return;
    list.innerHTML = "";
    values.forEach((value) => {
      const item = document.createElement("li");
      item.textContent = value;
      list.appendChild(item);
    });
  }

  function renderNPCs(npcs) {
    const root = byId("draco-npcs");
    if (!root) return;
    root.innerHTML = "";
    npcs.forEach((npc) => {
      const card = document.createElement("article");
      card.className = "card world-region-card world-region-card-celestial";
      card.innerHTML = `
        <h3>${npc.name}</h3>
        <p><strong>Rol:</strong> ${npc.role}</p>
        <p><strong>Sector:</strong> ${npc.location}</p>
        <p class="muted">Estado: ${String(npc.status).replace("_", " ")}</p>
      `;
      root.appendChild(card);
    });
  }

  function renderCreatures(creatures) {
    const root = byId("draco-creatures");
    if (!root) return;
    root.innerHTML = "";
    creatures.forEach((creature) => {
      const card = document.createElement("article");
      card.className = "card world-region-card world-region-card-dragon";
      card.innerHTML = `
        <h3>${creature.name}</h3>
        <p><strong>Amenaza:</strong> ${creature.threat_level}</p>
        <p><strong>Habitat:</strong> ${creature.habitat}</p>
      `;
      root.appendChild(card);
    });
  }

  function renderEconomy(economy) {
    setText(
      "draco-economy-main",
      `Recurso primario: ${economy.primary_resource}. Moneda operativa: ${economy.currency}.`,
    );

    const values = [
      `Flujo comercial: ${economy.trade_flux}%`,
      `Estado de mercado: ${economy.market_state}`,
      `Socios: ${economy.trade_partners.join(", ")}`,
    ];
    renderList("draco-economy-list", values);
    setText(
      "draco-economy-overview",
      `${economy.market_state} | ${economy.currency}`,
    );
    setMeter("draco-economy-meter", Number(economy.trade_flux));
  }

  function renderLivePanel(data, source) {
    const civilizations = Array.isArray(data.civilizations)
      ? data.civilizations.join(" • ")
      : "Unknown";

    setText("draco-status", String(data.status || "unknown").toUpperCase());
    setText("draco-population", data.population || "Unknown");
    setText("draco-civilizations", civilizations);
    setText(
      "draco-phase",
      data.timeline && data.timeline.length
        ? data.timeline[data.timeline.length - 1]
        : "Cycle feed not available",
    );

    const hasPopulation = typeof data.population === "string" && data.population.length > 0;
    setMeter("draco-population-meter", hasPopulation ? 68 : 22);
    setMeter("draco-civilizations-meter", Array.isArray(data.civilizations) ? 82 : 28);
    setMeter("draco-phase-meter", data.timeline && data.timeline.length ? 76 : 26);

    const meta = byId("draco-live-meta");
    if (meta) {
      const now = new Date().toLocaleString("es-ES");
      meta.textContent = `Fuente: ${source}. Ultima sincronizacion: ${now}.`;
    }
  }

  async function loadData() {
    try {
      const response = await fetch(DATA_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return { data, source: "dataset externo" };
    } catch (_error) {
      return { data: fallbackData, source: "fallback local" };
    }
  }

  async function init() {
    const { data, source } = await loadData();

    renderLivePanel(data, source);
    renderList("draco-map-zones", data.map_zones || []);
    renderList("draco-timeline", data.timeline || []);
    renderNPCs(data.npcs || []);
    renderCreatures(data.creatures || []);
    renderEconomy(data.economy || fallbackData.economy);
  }

  init();
})();

