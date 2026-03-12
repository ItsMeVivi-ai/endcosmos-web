(() => {
  const form = document.getElementById("world-builder");
  if (!form) return;

  const connectionsNode = document.querySelector("[data-world-connections]");
  const biomesNode = document.querySelector("[data-world-biomes]");
  const sampleNode = document.querySelector("[data-sample-world]");

  function toSlug(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const galaxyInput = document.getElementById("galaxy");
    const planetInput = document.getElementById("planet");
    const civilizationInput = document.getElementById("civilization");
    if (!galaxyInput || !planetInput || !civilizationInput) return;

    const galaxy = toSlug(galaxyInput.value);
    const planet = toSlug(planetInput.value);
    const civilization = toSlug(civilizationInput.value);
    if (!galaxy || !planet || !civilization) return;

    window.location.href = `/worlds/${galaxy}/${planet}/${civilization}`;
  });

  function setList(node, items) {
    if (!node) return;
    node.innerHTML = "";
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      node.appendChild(li);
    });
  }

  async function initWorldBlueprint() {
    if (!connectionsNode && !biomesNode && !sampleNode) return;

    try {
      const response = await fetch("/assets/manifests/world-systems.json", {
        cache: "no-store",
      });
      if (!response.ok) return;

      const payload = await response.json();
      const systems = Array.isArray(payload.systems) ? payload.systems : [];

      const connectionSystem = systems.find(
        (system) => system.id === "world-connection",
      );
      const biomeSystem = systems.find((system) => system.id === "biomes");

      setList(
        connectionsNode,
        Array.isArray(connectionSystem?.items) ? connectionSystem.items : [],
      );
      setList(
        biomesNode,
        Array.isArray(biomeSystem?.items) ? biomeSystem.items : [],
      );

      if (sampleNode && payload.sample_world) {
        const sample = payload.sample_world;
        sampleNode.innerHTML = `
          <h2>Sample World</h2>
          <p><strong>${sample.name}</strong> — ${sample.type}</p>
          <p class="muted">Route: <a href="${sample.route}">${sample.route}</a></p>
          <ul>
            <li>Clima: ${sample.weather}</li>
            <li>Recurso: ${sample.resource}</li>
            <li>Boss: ${sample.boss}</li>
            <li>Evento: ${sample.event}</li>
          </ul>
        `;
      }
    } catch {
      // Keep route generator functional even if manifest fetch fails.
    }
  }

  initWorldBlueprint();
})();
