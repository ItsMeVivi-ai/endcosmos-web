(() => {
  const VISUAL_MANIFEST_URL = "/assets/manifests/world-visual-pack.json";

  function normalizeList(raw) {
    if (!raw) return [];
    return String(raw)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }

  function toSafeImageUrl(src) {
    if (typeof src !== "string" || !src.trim()) return "";
    try {
      const url = new URL(src, window.location.origin);
      return url.pathname + url.search + url.hash;
    } catch {
      return src;
    }
  }

  function buildImageCard(item, index) {
    const card = document.createElement("figure");
    card.className = "card card-spaced visual-pack-card";

    const image = document.createElement("img");
    image.src = toSafeImageUrl(item.src);
    image.alt =
      typeof item.alt === "string" && item.alt.trim()
        ? item.alt.trim()
        : "EndCosmos visual asset";
    image.loading = index < 2 ? "eager" : "lazy";
    image.decoding = "async";
    image.fetchPriority = index === 0 ? "high" : "low";

    image.addEventListener("error", () => {
      card.remove();
    });

    const caption = document.createElement("figcaption");
    caption.className = "muted visual-pack-caption";
    const title =
      typeof item.display_name === "string" && item.display_name.trim()
        ? item.display_name.trim()
        : typeof item.caption === "string" && item.caption.trim()
          ? item.caption.trim()
          : image.alt;
    caption.textContent = title;

    card.appendChild(image);
    card.appendChild(caption);
    return card;
  }

  async function initVisualPack() {
    const mounts = Array.from(
      document.querySelectorAll("[data-visual-gallery]"),
    );
    if (!mounts.length) return;

    let payload;
    try {
      const response = await fetch(VISUAL_MANIFEST_URL, { cache: "no-store" });
      if (!response.ok) return;
      payload = await response.json();
    } catch {
      return;
    }

    const categories = Array.isArray(payload?.categories)
      ? payload.categories
      : [];
    const byId = new Map(
      categories
        .filter((category) => category && typeof category.id === "string")
        .map((category) => [category.id, category]),
    );

    mounts.forEach((mount) => {
      const wanted = normalizeList(mount.getAttribute("data-visual-category"));
      const maxItems = Number.parseInt(
        mount.getAttribute("data-visual-limit") || "12",
        10,
      );
      const limit = Number.isNaN(maxItems) ? 12 : Math.max(1, maxItems);

      const selectedItems = [];
      const seen = new Set();

      wanted.forEach((categoryId) => {
        const category = byId.get(categoryId);
        if (!category || !Array.isArray(category.items)) return;

        for (const item of category.items) {
          if (!item || typeof item.src !== "string") continue;
          if (seen.has(item.src)) continue;
          seen.add(item.src);
          selectedItems.push(item);
          if (selectedItems.length >= limit) break;
        }
      });

      if (!selectedItems.length) {
        mount.innerHTML =
          '<p class="muted">No hay imágenes disponibles para esta sección.</p>';
        return;
      }

      mount.innerHTML = "";
      selectedItems.slice(0, limit).forEach((item, index) => {
        mount.appendChild(buildImageCard(item, index));
      });
    });
  }

  document.addEventListener("DOMContentLoaded", initVisualPack);
})();
