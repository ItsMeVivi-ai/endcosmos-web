(() => {
  document.documentElement.setAttribute("data-section", "universe");

  const systemsNode = document.querySelector("[data-world-systems]");
  const prioritiesNode = document.querySelector("[data-priority-systems]");
  const structureNode = document.querySelector("[data-core-target]");

  if (!systemsNode || !prioritiesNode || !structureNode) return;

  function titleCase(value) {
    return String(value || "")
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function makeList(items) {
    const list = document.createElement("ul");
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
    return list;
  }

  async function initUniverseSystems() {
    try {
      const response = await fetch("/assets/manifests/world-systems.json", {
        cache: "no-store",
      });
      if (!response.ok) return;

      const payload = await response.json();
      const systems = Array.isArray(payload.systems) ? payload.systems : [];
      const priorities = Array.isArray(payload.priority_12)
        ? payload.priority_12
        : [];
      const structure = payload.world_structure || {};

      systemsNode.innerHTML = "";
      systems.forEach((system) => {
        const article = document.createElement("article");
        article.className = "card world-region-card world-region-card-portal";

        const heading = document.createElement("h3");
        heading.textContent = system.name || "World System";
        article.appendChild(heading);

        const detail = document.createElement("p");
        detail.className = "muted";
        detail.textContent = Array.isArray(system.items)
          ? system.items.join(" • ")
          : "";
        article.appendChild(detail);

        systemsNode.appendChild(article);
      });

      prioritiesNode.innerHTML = "";
      priorities.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        prioritiesNode.appendChild(li);
      });

      structureNode.innerHTML = "";
      Object.entries(structure).forEach(([key, items]) => {
        if (!Array.isArray(items) || !items.length) return;

        const block = document.createElement("div");
        const heading = document.createElement("h3");
        heading.textContent = titleCase(key);
        block.appendChild(heading);
        block.appendChild(makeList(items));
        structureNode.appendChild(block);
      });
    } catch {
      // Keep static universe page usable when manifest is unavailable.
    }
  }

  initUniverseSystems();
})();
