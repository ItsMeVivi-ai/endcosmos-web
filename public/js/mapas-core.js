(function () {
  const graphRoot = document.querySelector("[data-map-node-root]");
  const langToggle = document.querySelector("[data-lang-toggle]");
  const langStatus = document.querySelector("[data-lang-status]");
  if (!graphRoot) return;

  const i18n = {
    en: {
      maps_title: "Maps",
      maps_subtitle: "The core of the main map lives in Celestial Expanse.",
      maps_world_cta:
        'Continue to <a href="/world">/world</a> to explore regions, laws, NPCs, and discovery.',
      language_status: "Language: English",
      graph_heading: "Map → Node → Root",
      graph_description:
        "Active structural connection with semantic image links by variable and origin.",
      insufficient_nodes:
        "Not enough nodes to build the map → node → root link.",
      node_label: "Node:",
      root_label: "Root:",
      type_label: "Type:",
      variable_label: "Variable:",
      primary_image: "Primary image",
      conscious_links: "Consciously interlinked images",
      no_complementary_images: "No complementary images yet.",
      graph_not_available:
        "The structural graph is not yet available in the connected system.",
      graph_unreachable: "The connected map system could not be loaded.",
    },
    es: {
      maps_title: "Mapas",
      maps_subtitle: "El núcleo del mapa principal vive en Celestial Expanse.",
      maps_world_cta:
        'Continuar a <a href="/world">/world</a> para explorar regiones, leyes, NPCs y descubrimiento.',
      language_status: "Idioma: Español",
      graph_heading: "Mapa → Nodo → Raíz",
      graph_description:
        "Conexión estructural activa con enlaces de imagen semánticos por variable y origen.",
      insufficient_nodes:
        "Sin nodos suficientes para construir el enlace mapa → nodo → raíz.",
      node_label: "Nodo:",
      root_label: "Raíz:",
      type_label: "Tipo:",
      variable_label: "Variable:",
      primary_image: "Imagen principal",
      conscious_links: "Imágenes entrelazadas conscientemente",
      no_complementary_images: "Sin imágenes complementarias todavía.",
      graph_not_available:
        "El grafo estructural aún no está disponible en el sistema conectado.",
      graph_unreachable: "No fue posible cargar el sistema de mapas conectado.",
    },
  };

  let currentLanguage = resolveInitialLanguage();
  let latestGraph = null;

  function resolveInitialLanguage() {
    try {
      const saved = localStorage.getItem("ec_site_lang");
      if (saved === "es" || saved === "en") return saved;
    } catch (error) {
      null;
    }
    const browserLanguage = (
      navigator.languages?.[0] ||
      navigator.language ||
      ""
    ).toLowerCase();
    return browserLanguage.startsWith("es") ? "es" : "en";
  }

  function t(key) {
    return i18n[currentLanguage]?.[key] || i18n.en[key] || key;
  }

  function applyStaticTranslations() {
    document.documentElement.lang = currentLanguage;
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      const translated = t(key);
      if (translated) element.textContent = translated;
    });
    document.querySelectorAll("[data-i18n-html]").forEach((element) => {
      const key = element.getAttribute("data-i18n-html");
      const translated = t(key);
      if (translated) element.innerHTML = translated;
    });
    if (langStatus) langStatus.textContent = t("language_status");
    if (langToggle) {
      const nextLanguage = currentLanguage === "en" ? "es" : "en";
      langToggle.textContent = nextLanguage.toUpperCase();
      langToggle.setAttribute(
        "aria-label",
        nextLanguage === "es" ? "Cambiar a español" : "Switch to English",
      );
      langToggle.setAttribute("aria-pressed", String(currentLanguage === "es"));
    }
  }

  const endpoints = [
    "/api/cosmos/systems/mapa-global-conectado",
    "/assets/maps/mapa-global-conectado-modelo.json",
    "/cosmos/systems/mapa-global-conectado",
    "http://127.0.0.1:8000/cosmos/systems/mapa-global-conectado",
  ];

  async function fetchBundle() {
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) continue;
        const payload = await response.json();
        if (payload && payload.success && payload.data) return payload.data;
        if (payload && payload.map_node_root_graph) {
          return {
            model: payload,
          };
        }
      } catch (error) {
        continue;
      }
    }
    return null;
  }

  function renderError(message) {
    graphRoot.innerHTML = `<div class="card card-spaced card-clean"><p class="muted">${message}</p></div>`;
  }

  function renderGraph(graph) {
    const roots = Array.isArray(graph?.roots) ? graph.roots : [];
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
    const links = Array.isArray(graph?.conscious_image_links)
      ? graph.conscious_image_links
      : [];

    if (!roots.length || !nodes.length) {
      renderError(t("insufficient_nodes"));
      return;
    }

    const rootById = new Map(roots.map((root) => [root.root_id, root]));
    const linksByNode = new Map(links.map((link) => [link.map_node, link]));

    const nodesHtml = nodes
      .map((node) => {
        const root = rootById.get(node.root_id);
        const nodeLinks = linksByNode.get(node.node_id);
        const imageLinks = Array.isArray(nodeLinks?.linked_images)
          ? nodeLinks.linked_images
          : [];

        const imageList = imageLinks.length
          ? `<ul>${imageLinks
              .map(
                (image) =>
                  `<li><a href="${image.web_path}" target="_blank" rel="noopener">${image.web_path}</a> · <span class="muted">${image.reason}</span></li>`,
              )
              .join("")}</ul>`
          : `<p class="muted">${t("no_complementary_images")}</p>`;

        return `
          <article class="card card-spaced card-clean">
            <h3>${node.map_name}</h3>
            <p><strong>${t("node_label")}</strong> ${node.node_id}</p>
            <p><strong>${t("root_label")}</strong> ${root ? root.name : node.root_id}</p>
            <p><strong>${t("type_label")}</strong> ${node.map_type} · <strong>${t("variable_label")}</strong> ${node.variable_id}</p>
            <p><a href="${node.primary_image}" target="_blank" rel="noopener">${t("primary_image")}</a></p>
            <details>
              <summary>${t("conscious_links")}</summary>
              ${imageList}
            </details>
          </article>
        `;
      })
      .join("");

    const rootsHtml = roots
      .map(
        (root) =>
          `<li><strong>${root.name}</strong> · ${root.description} <span class="muted">(${(root.variable_focus || []).join(", ")})</span></li>`,
      )
      .join("");

    graphRoot.innerHTML = `
      <div class="card card-spaced card-clean">
        <h2>${t("graph_heading")}</h2>
        <p class="muted">${t("graph_description")}</p>
        <ul>${rootsHtml}</ul>
      </div>
      <div class="section-grid">${nodesHtml}</div>
    `;
  }

  if (langToggle) {
    langToggle.addEventListener("click", () => {
      currentLanguage = currentLanguage === "en" ? "es" : "en";
      try {
        localStorage.setItem("ec_site_lang", currentLanguage);
      } catch (error) {
        null;
      }
      applyStaticTranslations();
      if (latestGraph) renderGraph(latestGraph);
    });
  }

  applyStaticTranslations();

  fetchBundle()
    .then((data) => {
      const graph = data?.model?.map_node_root_graph;
      if (!graph) {
        renderError(t("graph_not_available"));
        return;
      }
      latestGraph = graph;
      renderGraph(graph);
    })
    .catch(() => {
      renderError(t("graph_unreachable"));
    });
})();
