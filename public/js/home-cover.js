(() => {
  const WWW_URL = "https://www.endcosmos.com/";

  if (window.location.hostname === "endcosmos.com") {
    const target = `${WWW_URL.replace(/\/$/, "")}${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(target);
    return;
  }

  const ZONES = {
    logo: {
      title: "Zona logo EndCosmos",
      text: "Marca central del universo EndCosmos. Desde aqui inicia el acceso oficial al seed infinito Vyrakth y a la portada principal.",
    },
    dragon: {
      title: "Zona dragon cosmico",
      text: "Guardian de amenaza alta vinculado al Sistema de bosses globales y al eje evolutivo del despertar de Leviathan.",
    },
    portal: {
      title: "Zona portal infinito",
      text: "Nucleo de Vyrakth ∞. Referencia del Umbral de los Colores Eternos y punto de entrada a portales ocultos, eventos globales y rutas dimensionales.",
    },
    play: {
      title: "Zona PLAY NOW",
      text: "Entrada rapida al flujo activo del juego con arranque de progresion desde Aurelia Prime, clima dinamico y control territorial.",
    },
    explore: {
      title: "Zona EXPLORE THE COSMOS",
      text: "Ruta de exploracion del cosmos para mapas ocultos, zonas secretas, anomalias dimensionales y expansion infinita del mundo.",
    },
    heroes: {
      title: "Zona escuadron",
      text: "Escuadron de operacion del jugador, alineado a facciones base del universo: Llunaris Accord o Leviathan Forge.",
    },
    portada: {
      title: "Portada EndCosmos",
      text: "Area general de portada oficial. Todo clic mantiene la navegacion ligada a www.endcosmos.com y al mapa global conectado del universo.",
    },
  };

  const stage = document.getElementById("cover-stage");
  const panelTitle = document.getElementById("panel-title");
  const panelText = document.getElementById("panel-text");
  const panelZone = document.getElementById("panel-zone");
  const panelPos = document.getElementById("panel-pos");

  if (!stage || !panelTitle || !panelText || !panelZone || !panelPos) return;

  const hotspots = Array.from(stage.querySelectorAll(".hotspot"));

  function formatPercent(value) {
    return `${Math.round(value * 100)}%`;
  }

  function pickZoneByPosition(x, y) {
    if (x >= 0.24 && x <= 0.76 && y >= 0.02 && y <= 0.22) return "logo";
    if (x >= 0.68 && y <= 0.46) return "dragon";
    if (x >= 0.29 && x <= 0.72 && y >= 0.23 && y <= 0.74) return "portal";
    if (x >= 0.17 && x <= 0.49 && y >= 0.84) return "play";
    if (x >= 0.51 && x <= 0.85 && y >= 0.84) return "explore";
    if (x >= 0.33 && x <= 0.68 && y >= 0.62 && y <= 0.92) return "heroes";
    return "portada";
  }

  function updatePanel(zoneKey, x, y) {
    const zone = ZONES[zoneKey] || ZONES.portada;
    panelTitle.textContent = zone.title;
    panelText.textContent = zone.text;
    panelZone.textContent = zoneKey;
    panelPos.textContent = `${formatPercent(x)}, ${formatPercent(y)}`;
  }

  function processInteraction(clientX, clientY, forcedZone) {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const rawX = (clientX - rect.left) / rect.width;
    const rawY = (clientY - rect.top) / rect.height;
    const x = Math.max(0, Math.min(1, rawX));
    const y = Math.max(0, Math.min(1, rawY));
    const zone = forcedZone || pickZoneByPosition(x, y);

    updatePanel(zone, x, y);
  }

  stage.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLAnchorElement) return;

    const hotspot = target instanceof HTMLElement ? target.closest(".hotspot") : null;
    if (hotspot) {
      processInteraction(event.clientX, event.clientY, hotspot.dataset.zone || "portada");
      return;
    }

    processInteraction(event.clientX, event.clientY);
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("a")) return;
    if (stage.contains(target)) return;

    const x = Math.max(0, Math.min(1, event.clientX / Math.max(window.innerWidth, 1)));
    const y = Math.max(0, Math.min(1, event.clientY / Math.max(window.innerHeight, 1)));
    updatePanel("portada", x, y);
  });

  hotspots.forEach((hotspot) => {
    hotspot.addEventListener("click", (event) => {
      event.preventDefault();
      const zone = hotspot.dataset.zone || "portada";
      processInteraction(event.clientX, event.clientY, zone);
    });
  });

  stage.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const focused = document.activeElement;
      if (!(focused instanceof HTMLElement)) return;
      if (!focused.classList.contains("hotspot")) return;
      event.preventDefault();
      const rect = focused.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      processInteraction(cx, cy, focused.dataset.zone || "portada");
    },
    true,
  );

  const center = stage.getBoundingClientRect();
  processInteraction(center.left + center.width * 0.5, center.top + center.height * 0.5, "portada");
})();
