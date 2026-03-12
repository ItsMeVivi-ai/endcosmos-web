(() => {
  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status} at ${path}`);
    return response.json();
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function normalizeItems(homeManifest, zogsManifest) {
    const homeItems = Array.isArray(homeManifest?.items)
      ? homeManifest.items
      : [];
    const zogsItems = Array.isArray(zogsManifest?.items)
      ? zogsManifest.items
      : [];

    return [...homeItems, ...zogsItems]
      .filter((item) => item && item.src)
      .slice(0, 24)
      .map((item, index) => ({
        src: item.src,
        alt: item.alt || item.title || `Cosmos image ${index + 1}`,
        title: item.title || `Pulso visual ${index + 1}`,
      }));
  }

  function startImageFlow(items) {
    const image = document.getElementById("newsFlowImage");
    const caption = document.getElementById("newsFlowCaption");
    if (!image || !caption || !items.length) return;

    let index = 0;

    function renderCurrent() {
      const current = items[index];
      image.src = current.src;
      image.alt = current.alt;
      caption.textContent = current.title;
      index = (index + 1) % items.length;
    }

    renderCurrent();
    window.setInterval(renderCurrent, 4500);
  }

  function renderQuickLog(listId, payload) {
    const target = document.getElementById(listId);
    if (!target) return;

    const entries = Array.isArray(payload?.entries)
      ? payload.entries.slice(0, 4)
      : [];
    if (!entries.length) {
      target.innerHTML = '<li class="muted">Sin logs aún.</li>';
      return;
    }

    target.innerHTML = entries
      .map(
        (entry) =>
          `<li><strong>${entry.id ?? "LOG"}</strong> — ${entry.summary ?? "Cambio"}</li>`,
      )
      .join("");
  }

  function renderLoreFeed(payload) {
    const target = document.getElementById("newsLoreFeed");
    if (!target) return;

    const entries = Array.isArray(payload?.entries)
      ? payload.entries.slice(0, 10)
      : [];

    if (!entries.length) {
      target.innerHTML = '<li class="muted">Sin artículos aún.</li>';
      return;
    }

    target.innerHTML = entries
      .map((entry) => {
        const title = entry?.title || "Artículo";
        const slug = entry?.slug || "";
        const summary = entry?.summary || "Actualización del universo.";
        const id = entry?.id || "NEWS";
        const date = entry?.date || "";
        const href = slug ? `/news/${slug}` : "/news";
        const label = [id, date].filter(Boolean).join(" · ");

        return `<li><a href="${href}"><strong>${title}</strong></a><br /><span class="muted">${label}</span><br />${summary}</li>`;
      })
      .join("");
  }

  async function boot() {
    try {
      const [homeManifest, zogsManifest, codeLogs, gameLogs, loreArticles] =
        await Promise.all([
          fetchJson("/assets/manifests/home-gallery.json"),
          fetchJson("/assets/manifests/zogs-gallery.json"),
          fetchJson("/assets/logs/code-changes.json"),
          fetchJson("/assets/logs/game-internal-changes.json"),
          fetchJson("/assets/logs/news-articles.json"),
        ]);

      const items = normalizeItems(homeManifest, zogsManifest);
      startImageFlow(items);
      setText("newsFlowCount", String(items.length));
      renderQuickLog("newsCodeLogQuick", codeLogs);
      renderQuickLog("newsGameLogQuick", gameLogs);
      renderLoreFeed(loreArticles);
      setText(
        "newsLastSync",
        new Date().toLocaleString("es-ES", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch (error) {
      setText("newsLastSync", `Error: ${String(error?.message || error)}`);
      renderLoreFeed({ entries: [] });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
