(() => {
  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("es-ES", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderEntries(container, payload, limit) {
    const entries = Array.isArray(payload.entries) ? payload.entries : [];
    const selected = limit > 0 ? entries.slice(0, limit) : entries;

    if (!selected.length) {
      container.innerHTML =
        '<div class="card"><p class="muted">Sin logs disponibles por ahora.</p></div>';
      return;
    }

    const rows = selected
      .map((entry) => {
        return `
          <article class="card" style="margin-top:.75rem;">
            <p class="muted" style="margin:0 0 .4rem 0;">${formatDate(entry.timestamp)} · ${entry.id ?? "LOG"} · ${entry.area ?? "General"}</p>
            <h3 style="margin:.2rem 0 .35rem 0;">${entry.summary ?? "Cambio registrado"}</h3>
            <p style="margin:0;">${entry.details ?? "Sin detalles."}</p>
          </article>
        `;
      })
      .join("");

    const updatedAt = payload.updated_at
      ? formatDate(payload.updated_at)
      : "N/A";
    container.innerHTML = `
      <div class="card">
        <p style="margin:0;"><strong>${payload.title ?? "Logs"}</strong></p>
        <p class="muted" style="margin:.3rem 0 0 0;">Última actualización: ${updatedAt}</p>
      </div>
      ${rows}
    `;
  }

  async function hydrateContainer(container) {
    const source = container.getAttribute("data-log-source");
    const limitAttr = container.getAttribute("data-log-limit");
    const limit = Number.parseInt(limitAttr ?? "0", 10) || 0;
    if (!source) return;

    try {
      const response = await fetch(source, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      renderEntries(container, payload, limit);
    } catch (error) {
      container.innerHTML = `
        <div class="card">
          <p><strong>Error cargando logs</strong></p>
          <p class="muted" style="margin:0;">${String(error?.message || error)}</p>
        </div>
      `;
    }
  }

  function boot() {
    const containers = Array.from(
      document.querySelectorAll("[data-log-source]"),
    );
    containers.forEach((container) => {
      hydrateContainer(container);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
