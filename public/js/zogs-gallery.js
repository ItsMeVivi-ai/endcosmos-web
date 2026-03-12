(() => {
  const ZOGS_MANIFEST_URL = "/assets/manifests/zogs-gallery.json";
  const IMAGE_PACKAGES_URL = "/assets/manifests/image-data-packages.json";
  const MOSAIC_STORAGE_KEY = "endcosmos.zogs.mosaicUltra";

  function createImageNode(item, defaultAlt) {
    const image = document.createElement("img");
    image.loading = "lazy";
    image.decoding = "async";
    image.src = item.src;
    image.alt = item.alt || defaultAlt;
    return image;
  }

  function renderBaseImage(container, baseImage) {
    if (!container || !baseImage || !baseImage.src) return;
    container.innerHTML = "";

    const figure = document.createElement("figure");
    figure.className = "zogs-base-figure";
    figure.appendChild(
      createImageNode(baseImage, "EndCosmos base gallery image"),
    );
    container.appendChild(figure);
  }

  function renderSections(container, sections) {
    if (!container || !Array.isArray(sections)) return;
    container.innerHTML = "";

    sections.forEach((section) => {
      if (!section || !Array.isArray(section.items) || !section.items.length)
        return;

      const sectionNode = document.createElement("section");
      sectionNode.className = "section zogs-section";

      const wrap = document.createElement("div");
      wrap.className = "wrap";

      const title = document.createElement("h2");
      title.textContent = section.title || "Gallery";

      const grid = document.createElement("div");
      grid.className = `zogs-grid ${section.grid_class || ""}`.trim();

      section.items.forEach((item) => {
        if (!item || typeof item.src !== "string" || !item.src.trim()) return;
        grid.appendChild(createImageNode(item, "EndCosmos gallery image"));
      });

      wrap.appendChild(title);
      wrap.appendChild(grid);
      sectionNode.appendChild(wrap);
      container.appendChild(sectionNode);
    });
  }

  function renderNarratives(container, narratives) {
    if (!container || !Array.isArray(narratives) || !narratives.length) return;

    const sectionNode = document.createElement("section");
    sectionNode.className = "section zogs-section";

    const wrap = document.createElement("div");
    wrap.className = "wrap";

    const title = document.createElement("h2");
    title.textContent = "Narrativas";

    const list = document.createElement("div");
    list.className = "zogs-narratives";

    narratives.forEach((item) => {
      if (!item || typeof item.content !== "string" || !item.content.trim())
        return;

      const card = document.createElement("article");
      card.className = "zogs-narrative-card";

      const cardTitle = document.createElement("h3");
      cardTitle.textContent = item.title || "Narrativa";

      const source = document.createElement("p");
      source.className = "muted";
      source.textContent = item.source ? `Fuente: ${item.source}` : "";

      const body = document.createElement("p");
      body.textContent = item.content;

      card.appendChild(cardTitle);
      if (source.textContent) card.appendChild(source);
      card.appendChild(body);
      list.appendChild(card);
    });

    if (!list.children.length) return;

    wrap.appendChild(title);
    wrap.appendChild(list);
    sectionNode.appendChild(wrap);
    container.appendChild(sectionNode);
  }

  function normalizePortalItems(packagesManifest) {
    const packages = Array.isArray(packagesManifest?.packages)
      ? packagesManifest.packages
      : [];

    const allItems = packages.flatMap((pkg) => {
      const packageId = pkg?.id || "package";
      const packageTitle = pkg?.title || packageId;
      const items = Array.isArray(pkg?.items) ? pkg.items : [];

      return items
        .filter(
          (item) => item && typeof item.src === "string" && item.src.trim(),
        )
        .map((item) => ({
          src: item.src,
          alt: item.alt || "EndCosmos portal image",
          filename: item.filename || item.src.split("/").pop() || "image",
          caption: item.caption || "Cosmic Assets",
          packageId,
          packageTitle,
          searchBlob:
            `${item.filename || ""} ${item.caption || ""} ${packageTitle}`.toLowerCase(),
        }));
    });

    return allItems.sort((left, right) => {
      const leftMap = /endcosmos-maps-main\.(png|jpg|webp)$/i.test(
        left.filename,
      );
      const rightMap = /endcosmos-maps-main\.(png|jpg|webp)$/i.test(
        right.filename,
      );
      if (leftMap && !rightMap) return -1;
      if (!leftMap && rightMap) return 1;
      return left.filename.localeCompare(right.filename);
    });
  }

  function createPortalCard(item) {
    const article = document.createElement("article");
    article.className = "zogs-portal-card";
    article.dataset.packageId = item.packageId;
    article.dataset.search = item.searchBlob;

    const image = createImageNode(item, item.alt);
    image.loading = "lazy";
    article.appendChild(image);

    const body = document.createElement("div");
    body.className = "zogs-portal-meta";

    const title = document.createElement("h3");
    title.textContent = item.filename;

    const caption = document.createElement("p");
    caption.className = "muted";
    caption.textContent = `${item.caption} · ${item.packageTitle}`;

    const route = document.createElement("p");
    route.className = "zogs-portal-path";
    route.textContent = item.src;

    const actions = document.createElement("div");
    actions.className = "zogs-portal-actions";

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "btn btn-secondary zogs-copy-btn";
    copyButton.textContent = "Copiar URL";
    copyButton.addEventListener("click", async () => {
      try {
        const absolute = `${window.location.origin}${item.src}`;
        await navigator.clipboard.writeText(absolute);
        copyButton.textContent = "Copiada";
        window.setTimeout(() => {
          copyButton.textContent = "Copiar URL";
        }, 1200);
      } catch {
        copyButton.textContent = "No disponible";
        window.setTimeout(() => {
          copyButton.textContent = "Copiar URL";
        }, 1200);
      }
    });

    actions.appendChild(copyButton);
    body.appendChild(title);
    body.appendChild(caption);
    body.appendChild(route);
    body.appendChild(actions);
    article.appendChild(body);

    return article;
  }

  function setupPortalFilters(items, elements) {
    const { filtersContainer, searchInput, grid, countNode } = elements;
    if (!filtersContainer || !searchInput || !grid || !countNode) return;

    const packageIds = [
      "all",
      ...new Set(items.map((item) => item.packageId).filter(Boolean)),
    ];

    let activePackage = "all";

    function updateVisibleItems() {
      const query = searchInput.value.trim().toLowerCase();
      const cards = Array.from(grid.querySelectorAll(".zogs-portal-card"));
      let visible = 0;

      cards.forEach((card) => {
        const packageMatch =
          activePackage === "all" || card.dataset.packageId === activePackage;
        const searchMatch =
          !query || (card.dataset.search || "").includes(query);
        const show = packageMatch && searchMatch;
        card.hidden = !show;
        if (show) visible += 1;
      });

      countNode.textContent = `${visible} imagenes`;
    }

    filtersContainer.innerHTML = "";
    packageIds.forEach((packageId) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `ec-cat-pill${packageId === "all" ? " is-active" : ""}`;
      button.textContent = packageId === "all" ? "All" : packageId;
      button.addEventListener("click", () => {
        activePackage = packageId;
        filtersContainer
          .querySelectorAll(".ec-cat-pill")
          .forEach((node) => node.classList.remove("is-active"));
        button.classList.add("is-active");
        updateVisibleItems();
      });
      filtersContainer.appendChild(button);
    });

    searchInput.addEventListener("input", updateVisibleItems);
    updateVisibleItems();
  }

  function renderPortal(packagesManifest) {
    const controlsNode = document.querySelector("[data-zogs-portal-controls]");
    const filtersContainer = document.querySelector(
      "[data-zogs-portal-filters]",
    );
    const searchInput = document.querySelector("[data-zogs-portal-search]");
    const countNode = document.querySelector("[data-zogs-portal-count]");
    const grid = document.querySelector("[data-zogs-portal-grid]");
    const viewToggle = document.querySelector("[data-zogs-view-toggle]");

    if (
      !controlsNode ||
      !filtersContainer ||
      !searchInput ||
      !countNode ||
      !grid
    )
      return;

    const items = normalizePortalItems(packagesManifest);
    if (!items.length) {
      grid.innerHTML =
        '<p class="muted">No hay imagenes de portal disponibles.</p>';
      countNode.textContent = "0 imagenes";
      return;
    }

    grid.innerHTML = "";
    items.forEach((item) => {
      grid.appendChild(createPortalCard(item));
    });

    setupPortalFilters(items, {
      filtersContainer,
      searchInput,
      grid,
      countNode,
    });

    if (viewToggle) {
      const initialMosaic = localStorage.getItem(MOSAIC_STORAGE_KEY) === "1";

      function applyViewState(enabled) {
        grid.classList.toggle("is-mosaic-ultra", enabled);
        viewToggle.classList.toggle("is-active", enabled);
        viewToggle.setAttribute("aria-pressed", enabled ? "true" : "false");
        viewToggle.textContent = enabled ? "Mosaic Ultra · ON" : "Mosaic Ultra";
      }

      applyViewState(initialMosaic);

      viewToggle.addEventListener("click", () => {
        const enabled = !grid.classList.contains("is-mosaic-ultra");
        applyViewState(enabled);
        localStorage.setItem(MOSAIC_STORAGE_KEY, enabled ? "1" : "0");
      });
    }
  }

  async function initZogsGallery() {
    const baseContainer = document.querySelector("[data-zogs-base]");
    const sectionsContainer = document.querySelector("[data-zogs-sections]");
    if (!baseContainer || !sectionsContainer) return;

    try {
      const [galleryResponse, packagesResponse] = await Promise.all([
        fetch(ZOGS_MANIFEST_URL, { cache: "no-store" }),
        fetch(IMAGE_PACKAGES_URL, { cache: "no-store" }),
      ]);

      if (!galleryResponse.ok) throw new Error("Manifest request failed");
      const manifest = await galleryResponse.json();
      const packagesManifest = packagesResponse.ok
        ? await packagesResponse.json()
        : null;

      renderBaseImage(baseContainer, manifest.base_image);
      renderSections(sectionsContainer, manifest.sections);
      renderNarratives(sectionsContainer, manifest.narratives);
      if (packagesManifest) renderPortal(packagesManifest);
    } catch {
      sectionsContainer.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.className = "wrap";
      const message = document.createElement("p");
      message.className = "muted";
      message.textContent =
        "No se pudo cargar el manifiesto de galeria. Ejecuta el script de generacion.";
      wrap.appendChild(message);
      sectionsContainer.appendChild(wrap);
    }
  }

  initZogsGallery();
})();
