(() => {
  const MANIFEST_URL = "/assets/manifests/image-data-packages.json";
  const WORKSPACE_MANIFEST_URL =
    "/assets/manifests/endcosmos-images-workspace.json";
  const INITIAL_BATCH = 48;
  const NEXT_BATCH = 48;
  const MAIN_MAP_REGEX = /\/endcosmos-maps-main\.(png|jpg|webp|avif)$/i;

  function prioritizeMainMap(items) {
    if (!Array.isArray(items) || items.length <= 1) return items || [];

    return [...items].sort((left, right) => {
      const leftMain = MAIN_MAP_REGEX.test(String(left?.src || ""));
      const rightMain = MAIN_MAP_REGEX.test(String(right?.src || ""));
      if (leftMain && !rightMain) return -1;
      if (!leftMain && rightMain) return 1;
      return 0;
    });
  }

  function normalizePackages(packagesPayload) {
    if (!packagesPayload || !Array.isArray(packagesPayload.packages)) return [];

    return packagesPayload.packages
      .map((pkg) => {
        const packageId =
          typeof pkg.id === "string" && pkg.id.trim()
            ? pkg.id.trim()
            : "package";
        const packageTitle =
          typeof pkg.title === "string" && pkg.title.trim()
            ? pkg.title.trim()
            : "Package";
        const rawItems = Array.isArray(pkg.items) ? pkg.items : [];

        const items = rawItems
          .map((item) => {
            const src = typeof item.src === "string" ? item.src.trim() : "";
            if (!src) return null;

            return {
              src,
              alt:
                typeof item.alt === "string" && item.alt.trim()
                  ? item.alt.trim()
                  : "EndCosmos image",
              caption:
                typeof item.caption === "string" && item.caption.trim()
                  ? item.caption.trim()
                  : packageTitle,
              source: packageTitle,
              packageId,
            };
          })
          .filter(Boolean);

        return {
          id: packageId,
          title: packageTitle,
          items,
          count: items.length,
        };
      })
      .filter((pkg) => pkg.count > 0);
  }

  function normalizeWorkspace(workspacePayload) {
    if (!workspacePayload || !Array.isArray(workspacePayload.images)) return [];

    const items = workspacePayload.images
      .map((src) => (typeof src === "string" ? src.trim() : ""))
      .filter(Boolean)
      .map((src) => ({
        src,
        alt: "EndCosmos workspace image",
        caption: "Workspace Library",
        source: "Workspace",
        packageId: "workspace",
      }));

    if (!items.length) return [];

    return [
      {
        id: "workspace",
        title: "Workspace",
        items,
        count: items.length,
      },
    ];
  }

  function renderCard(item) {
    const figure = document.createElement("figure");
    figure.className = "mega-gallery-card";

    const image = document.createElement("img");
    image.src = item.src;
    image.alt = item.alt;
    image.loading = "lazy";
    image.decoding = "async";
    image.fetchPriority = "low";
    image.referrerPolicy = "strict-origin-when-cross-origin";
    image.sizes = "(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 18vw";

    const caption = document.createElement("figcaption");

    const capPrimary = document.createElement("span");
    capPrimary.className = "mega-gallery-caption";
    capPrimary.textContent = item.caption;

    const capSource = document.createElement("span");
    capSource.className = "mega-gallery-source";
    capSource.textContent = item.source;

    caption.appendChild(capPrimary);
    caption.appendChild(capSource);

    figure.appendChild(image);
    figure.appendChild(caption);

    return figure;
  }

  async function initMegaGallery() {
    const grid = document.querySelector("[data-mega-gallery-grid]");
    const meta = document.querySelector("[data-mega-gallery-meta]");
    const moreButton = document.querySelector("[data-mega-gallery-more]");
    const filters = document.querySelector("[data-mega-gallery-filters]");

    if (!grid || !meta || !moreButton || !filters) return;

    try {
      const response = await fetch(MANIFEST_URL, { cache: "no-store" });
      let packages = [];

      if (response.ok) {
        const payload = await response.json();
        packages = normalizePackages(payload);
      }

      if (!packages.length) {
        const workspaceResponse = await fetch(WORKSPACE_MANIFEST_URL, {
          cache: "no-store",
        });
        if (workspaceResponse.ok) {
          const workspacePayload = await workspaceResponse.json();
          packages = normalizeWorkspace(workspacePayload);
        }
      }

      if (!packages.length) {
        meta.textContent = "Mega gallery unavailable right now.";
        return;
      }

      const allItems = prioritizeMainMap(packages.flatMap((pkg) => pkg.items));
      const total = allItems.length;

      if (!total) {
        meta.textContent = "No images found in mega gallery.";
        return;
      }

      const packageMap = new Map(packages.map((pkg) => [pkg.id, pkg]));
      let rendered = 0;
      let currentFilter = "all";
      let searchTerm = "";
      let currentItems = allItems;

      const searchInput = document.createElement("input");
      searchInput.type = "search";
      searchInput.className = "sitemap-search mega-gallery-search";
      searchInput.placeholder = "Search by caption or source...";
      searchInput.setAttribute("aria-label", "Search images in mega gallery");
      filters.prepend(searchInput);

      function applyQuery(items) {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return items;

        return items.filter((item) => {
          const inCaption =
            typeof item.caption === "string" &&
            item.caption.toLowerCase().includes(query);
          const inSource =
            typeof item.source === "string" &&
            item.source.toLowerCase().includes(query);
          const inAlt =
            typeof item.alt === "string" &&
            item.alt.toLowerCase().includes(query);
          return inCaption || inSource || inAlt;
        });
      }

      function updateMeta() {
        const activeLabel =
          currentFilter === "all"
            ? "All Packages"
            : packageMap.get(currentFilter)?.title || "Filtered Package";
        const queryLabel = searchTerm.trim()
          ? ` · Query "${searchTerm.trim()}"`
          : "";

        meta.textContent = `Showing ${rendered} of ${currentItems.length} images · ${activeLabel}${queryLabel} · Total library ${total}.`;
      }

      function updateFilterPills() {
        Array.from(filters.querySelectorAll(".ec-cat-pill")).forEach((pill) => {
          const isActive =
            pill.getAttribute("data-filter-id") === currentFilter;
          pill.classList.toggle("is-active", isActive);
          pill.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
      }

      const paintNext = (amount) => {
        const slice = currentItems.slice(rendered, rendered + amount);
        slice.forEach((item) => grid.appendChild(renderCard(item)));
        rendered += slice.length;
        moreButton.hidden = rendered >= currentItems.length;
        updateMeta();
      };

      function setFilter(filterId) {
        currentFilter = filterId;
        const baseItems = prioritizeMainMap(
          filterId === "all" ? allItems : packageMap.get(filterId)?.items || [],
        );
        currentItems = applyQuery(baseItems);

        rendered = 0;
        grid.innerHTML = "";
        paintNext(INITIAL_BATCH);
        updateFilterPills();
      }

      function addFilterPill(id, label) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ec-cat-pill";
        button.textContent = label;
        button.setAttribute("data-filter-id", id);
        button.setAttribute("aria-pressed", "false");
        button.addEventListener("click", () => setFilter(id));
        filters.appendChild(button);
      }

      addFilterPill("all", `All (${total})`);
      packages.forEach((pkg) => {
        addFilterPill(pkg.id, `${pkg.title} (${pkg.count})`);
      });

      setFilter("all");

      searchInput.addEventListener("input", (event) => {
        searchTerm = String(event.target.value || "");
        setFilter(currentFilter);
      });

      moreButton.addEventListener("click", () => paintNext(NEXT_BATCH));
    } catch {
      meta.textContent = "Mega gallery failed to load.";
    }
  }

  initMegaGallery();
})();
