(() => {
  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} at ${path}`);
    }
    return response.json();
  }

  function renderList(targetId, items, formatter, limit = 8) {
    const target = document.getElementById(targetId);
    if (!target) return;

    const safeItems = Array.isArray(items) ? items.slice(0, limit) : [];
    if (!safeItems.length) {
      target.innerHTML = '<li class="muted">Sin entradas aún.</li>';
      return;
    }

    target.innerHTML = safeItems.map(formatter).join("");
  }

  function bootCodex(payload) {
    renderList(
      "loreCodexCharacters",
      payload?.characters,
      (entry) =>
        `<li><strong>${entry?.name || "Personaje"}</strong><br /><span class="muted">${entry?.role || "Rol desconocido"}</span><br />${entry?.summary || ""}</li>`,
      8,
    );

    renderList(
      "loreCodexBosses",
      payload?.bosses,
      (entry) =>
        `<li><strong>${entry?.name || "Boss"}</strong><br /><span class="muted">${entry?.domain || "Dominio desconocido"} · Amenaza ${entry?.threat || "N/A"}</span></li>`,
      8,
    );

    renderList(
      "loreCodexArtifacts",
      payload?.artifacts,
      (entry) => `<li>${String(entry)}</li>`,
      10,
    );

    renderList(
      "loreCodexWars",
      payload?.majorWars,
      (entry) => `<li>${String(entry)}</li>`,
      8,
    );

    renderList(
      "loreCodexTimeline",
      payload?.timeline,
      (entry) => `<li>${String(entry)}</li>`,
      10,
    );
  }

  async function init() {
    try {
      const payload = await fetchJson("/assets/logs/wiki-vol2.json");
      bootCodex(payload);
    } catch (error) {
      const ids = [
        "loreCodexCharacters",
        "loreCodexBosses",
        "loreCodexArtifacts",
        "loreCodexWars",
        "loreCodexTimeline",
      ];

      ids.forEach((id) => {
        const target = document.getElementById(id);
        if (target) {
          target.innerHTML = `<li class="muted">Error cargando codex: ${String(
            error?.message || error,
          )}</li>`;
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
