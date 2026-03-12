(function () {
  const storageKey = "endcosmos_admin_dev_token";
  const historyKey = "endcosmos_admin_dev_status_history";
  const refreshEveryMs = 20_000;

  let autoRefreshTimer = null;
  let countdownTimer = null;
  let nextRefreshAt = 0;
  let isRefreshing = false;
  let statusHistory = [];
  const healthTargets = [
    "/healthz",
    "/assets/manifests/home-gallery.json",
    "/assets/manifests/zogs-gallery.json",
    "/assets/manifests/image-data-packages.json",
    "/assets/manifests/world-systems.json",
    "/assets/manifests/endcosmos-images-workspace.json",
    "/news/",
    "/admin/",
  ];

  const routeTargets = [
    "/",
    "/admin/",
    "/admin/dev/",
    "/planet/draco/",
    "/zogs/",
    "/code-changes/",
    "/game-internal-changes/",
  ];

  const healthList = document.getElementById("health-list");
  const routeList = document.getElementById("route-list");
  const apiList = document.getElementById("api-list");
  const coreList = document.getElementById("core6-list");
  const refreshApiButton = document.getElementById("refresh-api");
  const saveTokenButton = document.getElementById("save-token");
  const apiBaseInput = document.getElementById("api-base");
  const tokenInput = document.getElementById("admin-token");
  const autoRefreshCheckbox = document.getElementById("auto-refresh");
  const refreshMeta = document.getElementById("refresh-meta");
  const statusHistoryList = document.getElementById("status-history");

  const apiTargets = [
    { key: "health", label: "API Health", path: "/health" },
    { key: "cosmosHealth", label: "Cosmos Health", path: "/cosmos/health" },
    { key: "cosmosState", label: "Cosmos State", path: "/cosmos/state" },
    { key: "worldTree", label: "World Tree", path: "/world/tree" },
    {
      key: "worldStats",
      label: "World Catalog Stats",
      path: "/world/catalog/stats",
    },
    {
      key: "adminOverview",
      label: "Admin Overview (token)",
      path: "/admin/overview",
      auth: true,
    },
  ];

  function statusChip(ok, label) {
    const color = ok
      ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-200"
      : "border-rose-300/40 bg-rose-400/10 text-rose-200";
    return `<span class="rounded-full border px-2 py-1 text-xs ${color}">${label}</span>`;
  }

  function infoLine(label, value) {
    return `<div class="mt-1 text-xs text-slate-300"><span class="text-slate-400">${label}:</span> ${value}</div>`;
  }

  function normalizeBase(inputValue) {
    const value = (inputValue || "").trim();
    if (!value) return window.location.origin;
    return value.replace(/\/+$/, "");
  }

  function getSavedToken() {
    return localStorage.getItem(storageKey) || "";
  }

  function loadHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(historyKey) || "[]");
      if (Array.isArray(parsed)) {
        statusHistory = parsed;
      }
    } catch {
      statusHistory = [];
    }
  }

  function persistHistory() {
    localStorage.setItem(
      historyKey,
      JSON.stringify(statusHistory.slice(0, 40)),
    );
  }

  function appendHistory(entry) {
    statusHistory.unshift(entry);
    statusHistory = statusHistory.slice(0, 40);
    persistHistory();
  }

  function renderHistory() {
    statusHistoryList.innerHTML = "";
    if (!statusHistory.length) {
      const item = document.createElement("li");
      item.className =
        "rounded-xl border border-slate-700/60 bg-cosmos-850/70 p-3 text-slate-300";
      item.textContent = "Sin eventos todavía.";
      statusHistoryList.appendChild(item);
      return;
    }

    for (const event of statusHistory) {
      const item = document.createElement("li");
      item.className =
        "rounded-xl border border-slate-700/60 bg-cosmos-850/70 p-3";
      item.innerHTML = `<div class="flex items-center justify-between gap-2"><span class="font-semibold">${event.label}</span>${statusChip(event.ok, event.status)}</div>${infoLine("time", event.time)}${infoLine("url", event.url)}`;
      statusHistoryList.appendChild(item);
    }
  }

  function formatLocalTime() {
    return new Date().toLocaleTimeString("es-ES", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function updateCountdownMeta() {
    if (!autoRefreshCheckbox.checked) {
      refreshMeta.textContent = "Auto refresh desactivado";
      return;
    }

    const seconds = Math.max(0, Math.ceil((nextRefreshAt - Date.now()) / 1000));
    refreshMeta.textContent = `Auto refresh activo · siguiente en ${seconds}s`;
  }

  function stopAutoRefresh() {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function startAutoRefresh() {
    stopAutoRefresh();
    if (!autoRefreshCheckbox.checked) {
      updateCountdownMeta();
      return;
    }

    nextRefreshAt = Date.now() + refreshEveryMs;
    autoRefreshTimer = setInterval(() => {
      refreshAll(false);
    }, refreshEveryMs);
    countdownTimer = setInterval(updateCountdownMeta, 1000);
    updateCountdownMeta();
  }

  function saveToken() {
    const token = (tokenInput.value || "").trim();
    if (token) {
      localStorage.setItem(storageKey, token);
      alert("Token guardado para Admin Dev.");
      return;
    }
    localStorage.removeItem(storageKey);
    alert("Token eliminado.");
  }

  async function fetchJson(url, authToken) {
    const headers = { Accept: "application/json" };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers,
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    return { response, payload };
  }

  async function runHealthChecks() {
    healthList.innerHTML = "";
    for (const path of healthTargets) {
      const item = document.createElement("li");
      item.className =
        "rounded-xl border border-slate-700/60 bg-cosmos-850/70 p-3";
      item.innerHTML = `<div class="flex items-center justify-between gap-2"><span class="font-semibold">${path}</span>${statusChip(false, "Checking")}</div>`;
      healthList.appendChild(item);

      try {
        const response = await fetch(path, {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "text/html,application/json" },
        });
        const ok = response.ok;
        item.innerHTML = `<div class="flex items-center justify-between gap-2"><span class="font-semibold">${path}</span>${statusChip(ok, `HTTP ${response.status}`)}</div>`;
      } catch (error) {
        item.innerHTML = `<div class="flex items-center justify-between gap-2"><span class="font-semibold">${path}</span>${statusChip(false, "Network Error")}</div>`;
      }
    }
  }

  async function runApiChecks() {
    apiList.innerHTML = "";
    coreList.innerHTML = "";

    const base = normalizeBase(apiBaseInput.value);
    const savedToken = getSavedToken();
    const results = {};

    for (const target of apiTargets) {
      const item = document.createElement("li");
      item.className =
        "rounded-xl border border-slate-700/60 bg-cosmos-850/70 p-3";
      item.innerHTML = `<div class="flex items-center justify-between gap-2"><span class="font-semibold">${target.label}</span>${statusChip(false, "Checking")}</div>${infoLine("URL", `${base}${target.path}`)}`;
      apiList.appendChild(item);

      try {
        const { response, payload } = await fetchJson(
          `${base}${target.path}`,
          target.auth ? savedToken : "",
        );

        const ok = response.ok;
        results[target.key] = { ok, status: response.status, payload };

        let details = "";
        if (payload && typeof payload === "object") {
          if (payload.status) details += infoLine("status", payload.status);
          if (payload.service) details += infoLine("service", payload.service);
          if (payload.core) details += infoLine("core", payload.core);
          if (payload.message) details += infoLine("message", payload.message);
        }

        item.innerHTML = `<div class="flex items-center justify-between gap-2"><span class="font-semibold">${target.label}</span>${statusChip(ok, `HTTP ${response.status}`)}</div>${infoLine("URL", `${base}${target.path}`)}${details}`;
        appendHistory({
          label: target.label,
          ok,
          status: `HTTP ${response.status}`,
          url: `${base}${target.path}`,
          time: formatLocalTime(),
        });
      } catch (error) {
        results[target.key] = { ok: false, status: "ERR", payload: null };
        item.innerHTML = `<div class="flex items-center justify-between gap-2"><span class="font-semibold">${target.label}</span>${statusChip(false, "Network Error")}</div>${infoLine("URL", `${base}${target.path}`)}`;
        appendHistory({
          label: target.label,
          ok: false,
          status: "Network Error",
          url: `${base}${target.path}`,
          time: formatLocalTime(),
        });
      }
    }

    const coreSignals = [
      {
        name: "Mapa global / árbol de mundo",
        state: results.worldTree?.ok,
        source: "/world/tree",
      },
      {
        name: "Estado cosmos en vivo",
        state: results.cosmosState?.ok,
        source: "/cosmos/state",
      },
      {
        name: "Pipeline cosmos",
        state: results.cosmosHealth?.ok,
        source: "/cosmos/health",
      },
      {
        name: "Catálogo mundial",
        state: results.worldStats?.ok,
        source: "/world/catalog/stats",
      },
      {
        name: "Salud API auth/core",
        state: results.health?.ok,
        source: "/health",
      },
      {
        name: "Métricas admin protegidas",
        state: results.adminOverview?.ok,
        source: "/admin/overview",
      },
    ];

    for (const signal of coreSignals) {
      const li = document.createElement("li");
      li.className =
        "rounded-xl border border-slate-700/60 bg-cosmos-850/70 p-3";
      li.innerHTML = `<div class="flex items-center justify-between gap-2"><span class="font-semibold">${signal.name}</span>${statusChip(Boolean(signal.state), signal.state ? "OK" : "Unavailable")}</div>${infoLine("source", signal.source)}`;
      coreList.appendChild(li);
    }

    renderHistory();
  }

  async function refreshAll(manual = false) {
    if (isRefreshing) {
      return;
    }

    isRefreshing = true;
    refreshApiButton.disabled = true;
    refreshApiButton.classList.add("opacity-60", "cursor-not-allowed");
    refreshMeta.textContent = "Sincronizando...";

    try {
      await Promise.all([runHealthChecks(), runApiChecks()]);
      nextRefreshAt = Date.now() + refreshEveryMs;
      if (!manual) {
        updateCountdownMeta();
      } else {
        refreshMeta.textContent = `Actualizado manualmente (${formatLocalTime()})`;
      }
    } finally {
      isRefreshing = false;
      refreshApiButton.disabled = false;
      refreshApiButton.classList.remove("opacity-60", "cursor-not-allowed");
    }
  }

  function renderRouteLinks() {
    for (const path of routeTargets) {
      const anchor = document.createElement("a");
      anchor.href = path;
      anchor.target = "_blank";
      anchor.rel = "noopener";
      anchor.className =
        "rounded-xl border border-cyan-300/30 bg-cosmos-850/70 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cosmos-800/70";
      anchor.textContent = path;
      routeList.appendChild(anchor);
    }
  }

  function bootstrapApiControls() {
    apiBaseInput.value = window.location.origin;
    tokenInput.value = getSavedToken();
    loadHistory();
    renderHistory();

    refreshApiButton.addEventListener("click", function () {
      refreshAll(true);
    });
    saveTokenButton.addEventListener("click", function () {
      saveToken();
      refreshAll(true);
    });
    autoRefreshCheckbox.addEventListener("change", startAutoRefresh);

    startAutoRefresh();
  }

  bootstrapApiControls();
  renderRouteLinks();
  refreshAll(false);
})();
