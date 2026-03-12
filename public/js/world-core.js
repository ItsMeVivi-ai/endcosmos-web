(() => {
  const API_WORLD_LORE = "/ai/world-lore";
  const API_WORLD_REGIONS = "/ai/world/regions";
  const API_WORLD_NPCS = "/ai/world/npcs";

  const fallbackWorldData = {
    name: "Celestial Expanse",
    regions: [
      {
        name: "Nebula City",
        role: "starter-city",
        functions: ["comercio", "gremios", "banco cosmico"],
      },
      {
        name: "Echo Ruins",
        role: "ancient-ruins",
        features: ["artefactos antiguos", "runas vivas"],
      },
      {
        name: "Astral Wastelands",
        role: "hostile-zone",
        features: ["bosses salvajes", "tormentas de energia"],
      },
      {
        name: "Void Abyss",
        role: "endgame-zone",
        features: ["gravedad distorsionada", "entidades del vacio"],
      },
    ],
    cosmic_laws: [
      { name: "Ley de Equilibrio", effect: "cada poder tiene un coste" },
      {
        name: "Ley de Resonancia",
        effect: "artefactos reaccionan con jugadores",
      },
      { name: "Ley de Memoria", effect: "el mundo recuerda acciones" },
      {
        name: "Ley del Descubrimiento",
        effect: "zonas ocultas se desbloquean explorando",
      },
      {
        name: "Ley del Vacio",
        effect: "a mayor profundidad, mayor distorsion de la realidad",
      },
    ],
    thought_system: {
      currents: [
        "Orden del Cosmos",
        "Ciencia Antigua",
        "Culto del Vacio",
        "Hijos de las Estrellas",
        "Guardianes del Tiempo",
      ],
      affects: ["npc_dialogues", "quests", "factions"],
    },
    discovery_system: {
      discoverables: [
        "artefactos",
        "mapas ocultos",
        "civilizaciones",
        "bosses secretos",
        "portales",
      ],
      registry: "Archivo del Cronista",
    },
    principal_npcs: [
      { name: "El Cronista", role: "registro vivo del universo" },
      { name: "Kara", role: "guia exploradora" },
      { name: "Atlas", role: "guardian de portales" },
      { name: "Hera", role: "reina de civilizaciones antiguas" },
    ],
    universe_layers: [
      "superficie",
      "subsuelo",
      "cielos",
      "orbita",
      "vacio cosmico",
      "dimension espejo",
      "mundo corrupto",
    ],
  };

  function card(title, bodyHtml) {
    return `<article class="card card-spaced"><h3>${title}</h3><div class="muted">${bodyHtml}</div></article>`;
  }

  function list(items) {
    if (!Array.isArray(items) || !items.length) return "<span>No data</span>";
    return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
  }

  function renderRegions(world) {
    const container = document.getElementById("world-regions");
    if (!container) return;

    const html = (world.regions || [])
      .map((region) => {
        const details =
          region.functions || region.features || region.creatures || [];
        return card(
          `${region.name}`,
          `Rol: <strong>${region.role || "region"}</strong>${list(details)}`,
        );
      })
      .join("");

    container.innerHTML =
      html || card("No regions", "No hay regiones cargadas.");
  }

  function renderLaws(world) {
    const container = document.getElementById("world-laws");
    if (!container) return;

    const html = (world.cosmic_laws || [])
      .map((law) => card(law.name, law.effect || "Sin descripcion"))
      .join("");

    container.innerHTML = html || card("No laws", "No hay leyes cargadas.");
  }

  function renderSystems(world) {
    const container = document.getElementById("world-systems");
    if (!container) return;

    const thought = world.thought_system || {};
    const discovery = world.discovery_system || {};

    const html = [
      card("Corrientes filosóficas", list(thought.currents || [])),
      card("Impacto del sistema", list(thought.affects || [])),
      card(
        "Descubrimiento",
        `Registro: <strong>${discovery.registry || "Archivo del Cronista"}</strong>${list(discovery.discoverables || [])}`,
      ),
    ].join("");

    container.innerHTML = html;
  }

  function renderNpcsAndLayers(world) {
    const container = document.getElementById("world-npcs-layers");
    if (!container) return;

    const npcItems = (world.principal_npcs || []).map(
      (npc) => `${npc.name}: ${npc.role}`,
    );
    const layers = world.universe_layers || [];

    const html = [
      card("NPCs del mapa principal", list(npcItems)),
      card("Capas del universo", list(layers)),
    ].join("");

    container.innerHTML = html;
  }

  function renderHeroImage(heroImage) {
    const hero = document.getElementById("world-hero-image");
    if (!hero || !heroImage) return;
    hero.src = heroImage;
  }

  function renderCatalogStats(summary, regionsCatalog, npcsCatalog) {
    const container = document.getElementById("world-catalog-stats");
    if (!container) return;

    const totalRegions =
      summary?.catalog_regions ||
      summary?.regions_total ||
      regionsCatalog?.data?.total ||
      0;
    const totalNpcs =
      summary?.catalog_npcs ||
      summary?.npcs_total ||
      npcsCatalog?.data?.total ||
      0;

    const highlightedRegions = (regionsCatalog?.data?.regions || [])
      .slice(0, 5)
      .map((item) => item.name);
    const highlightedNpcs = (npcsCatalog?.data?.npcs || [])
      .slice(0, 5)
      .map((item) => item.name);

    container.innerHTML = [
      card(
        "Catálogo de regiones",
        `<strong>${totalRegions}</strong> regiones registradas${list(highlightedRegions)}`,
      ),
      card(
        "Catálogo de NPCs",
        `<strong>${totalNpcs}</strong> NPCs registrados${list(highlightedNpcs)}`,
      ),
    ].join("");
  }

  async function loadCatalog(url) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (_) {
      return null;
    }
  }

  async function loadWorldLore() {
    try {
      const response = await fetch(API_WORLD_LORE, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload?.success || !payload?.data?.world)
        throw new Error("Invalid payload");
      return payload.data;
    } catch (_) {
      return { world: fallbackWorldData, summary: null };
    }
  }

  async function initWorldCore() {
    const lore = await loadWorldLore();
    const world = lore.world || fallbackWorldData;
    const regionsCatalog = await loadCatalog(API_WORLD_REGIONS);
    const npcsCatalog = await loadCatalog(API_WORLD_NPCS);

    renderHeroImage(world.hero_image || lore.summary?.hero_image);
    renderRegions(world);
    renderLaws(world);
    renderSystems(world);
    renderNpcsAndLayers(world);
    renderCatalogStats(lore.summary, regionsCatalog, npcsCatalog);
  }

  document.addEventListener("DOMContentLoaded", initWorldCore);
})();
