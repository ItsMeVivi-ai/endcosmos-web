(() => {
  const titleNode = document.querySelector("[data-world-title]");
  const pathNode = document.querySelector("[data-world-path]");
  const summaryNode = document.querySelector("[data-world-summary]");
  if (!titleNode || !pathNode || !summaryNode) return;

  const segments = window.location.pathname
    .split("/")
    .filter((segment) => segment.length > 0);

  const [
    root,
    galaxy = "unknown",
    planet = "unknown",
    civilization = "unknown",
  ] = segments;

  if (root !== "worlds") return;

  titleNode.textContent = `${galaxy} / ${planet} / ${civilization}`;
  pathNode.textContent = window.location.pathname;

  function toName(value) {
    return String(value || "")
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  const paragraph = summaryNode.querySelector("p");
  if (paragraph) {
    paragraph.textContent = `Galaxy: ${toName(galaxy)}. Planet: ${toName(planet)}. Civilization: ${toName(civilization)}. This route follows EndCosmos master world systems.`;
  }

  async function enrichRoute() {
    try {
      const response = await fetch("/assets/manifests/world-systems.json", {
        cache: "no-store",
      });
      if (!response.ok) return;

      const payload = await response.json();
      const formula = Array.isArray(payload.master_formula)
        ? payload.master_formula
        : [];
      const sample = payload.sample_world || null;

      const formulaBlock = document.createElement("div");
      formulaBlock.className = "card card-spaced";
      formulaBlock.innerHTML = `<h2>Master Formula</h2>`;
      const list = document.createElement("ul");
      formula.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
      });
      formulaBlock.appendChild(list);
      summaryNode.appendChild(formulaBlock);

      if (
        sample &&
        planet === "llunaris-depth" &&
        civilization === "echo-order"
      ) {
        const sampleBlock = document.createElement("div");
        sampleBlock.className = "card card-spaced";
        sampleBlock.innerHTML = `
          <h2>${sample.name}</h2>
          <p><strong>Tipo:</strong> ${sample.type}</p>
          <p><strong>Clima:</strong> ${sample.weather}</p>
          <p><strong>Recurso:</strong> ${sample.resource}</p>
          <p><strong>Boss:</strong> ${sample.boss}</p>
          <p><strong>Evento:</strong> ${sample.event}</p>
          <p><strong>NPC:</strong> ${sample.npc}</p>
          <p><strong>Mecánica:</strong> ${sample.mechanic}</p>
          <p><strong>Secreto:</strong> ${sample.secret}</p>
        `;
        summaryNode.appendChild(sampleBlock);
      }
    } catch {
      // Keep base route rendering available.
    }
  }

  enrichRoute();
})();
