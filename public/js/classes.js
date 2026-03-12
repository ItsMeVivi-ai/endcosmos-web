(() => {
  const root = document.getElementById("classes-root");
  const summary = document.getElementById("classes-summary");

  if (!root || !summary) return;

  const API_BASE_URL = window.ENDCOSMOS_API_URL || "http://127.0.0.1:8000";
  const STORAGE_KEYS = {
    classes: "endcosmos.classes.filters",
    jobs: "endcosmos.jobs.filters",
  };

  function readStoredFilters(key) {
    try {
      const rawValue = localStorage.getItem(key);
      return rawValue ? JSON.parse(rawValue) : null;
    } catch {
      return null;
    }
  }

  function writeStoredFilters(key, payload) {
    try {
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      return;
    }
  }

  function clearStoredFilters(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      return;
    }
  }

  function setStatus(message) {
    root.innerHTML = `<div class="status-message">${message}</div>`;
  }

  function renderSummary(payload) {
    summary.textContent = `Clases: ${payload.total_classes} · Casas: ${payload.total_houses} · Imágenes: ${payload.total_images}`;
  }

  function renderClasses(classes) {
    root.innerHTML = "";

    classes.forEach((item) => {
      const housesHtml = item.houses
        .map((house) => {
          const imagesHtml = house.images
            .map((image, index) => {
              const speed = 0.8 + (index % 5) * 0.12;
              const delay = (index % 6) * 0.5;
              return `
                <figure class="motion-frame" data-speed="${speed}" style="--motion-delay:${delay}s">
                  <img class="motion-image" src="${image.path}" alt="${house.name} - ${image.title}" loading="lazy" />
                  <figcaption>${image.title} · Poder ${image.power_level}/10</figcaption>
                </figure>
              `;
            })
            .join("");

          return `
            <article class="house-card">
              <h3>${house.name}</h3>
              <p>${house.lore}</p>
              <div class="images-grid">${imagesHtml}</div>
            </article>
          `;
        })
        .join("");

      const card = document.createElement("article");
      card.className = "class-card";
      card.innerHTML = `
        <h2>${item.name}</h2>
        <p class="class-meta">${item.description}</p>
        <p class="class-meta">Edad mínima: ${item.age_min}+ · Casas: ${item.total_houses} · Imágenes: ${item.total_images}</p>
        <div class="houses-grid">${housesHtml}</div>
      `;
      root.appendChild(card);
    });
  }

  function activateMotion() {
    const frames = Array.from(document.querySelectorAll(".motion-frame"));
    if (!frames.length) return;

    root.addEventListener("mousemove", (event) => {
      const viewportX = (event.clientX / window.innerWidth - 0.5) * 2;
      const viewportY = (event.clientY / window.innerHeight - 0.5) * 2;

      frames.forEach((frame) => {
        const speed = Number.parseFloat(frame.dataset.speed || "1");
        const moveX = viewportX * 4 * speed;
        const moveY = viewportY * 3 * speed;
        frame.style.setProperty("--mx", `${moveX}px`);
        frame.style.setProperty("--my", `${moveY}px`);
      });
    });
  }

  function setupCodexFilters() {
    const classesTable = document.getElementById("codexClassesTable");
    const filterDifficulty = document.getElementById("filterDifficulty");
    const filterPvpRole = document.getElementById("filterPvpRole");
    const filterTier = document.getElementById("filterTier");
    const clearButton = document.getElementById("clearCodexFilters");
    const visibleCount = document.getElementById("codexVisibleCount");

    if (
      !classesTable ||
      !filterDifficulty ||
      !filterPvpRole ||
      !filterTier ||
      !clearButton ||
      !visibleCount
    ) {
      return;
    }

    const rows = Array.from(classesTable.querySelectorAll("tbody tr"));
    if (!rows.length) return;

    const updateVisibleCount = (visible, total) => {
      visibleCount.textContent = `Clases visibles: ${visible}/${total}`;
    };

    const applyCodexFilters = () => {
      const selectedDifficulty = filterDifficulty.value.trim().toLowerCase();
      const selectedPvp = filterPvpRole.value.trim().toLowerCase();
      const selectedTier = filterTier.value.trim().toLowerCase();

      writeStoredFilters(STORAGE_KEYS.classes, {
        difficulty: filterDifficulty.value,
        pvpRole: filterPvpRole.value,
        tier: filterTier.value,
      });

      let visibleRows = 0;

      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 6) return;

        const rowPvp = (cells[2].textContent || "").trim().toLowerCase();
        const rowDifficulty = (cells[3].textContent || "").trim().toLowerCase();
        const rowTier = (cells[5].textContent || "").trim().toLowerCase();

        const passDifficulty =
          !selectedDifficulty || rowDifficulty === selectedDifficulty;
        const passPvp = !selectedPvp || rowPvp.includes(selectedPvp);
        const passTier = !selectedTier || rowTier.includes(selectedTier);

        const isVisible = passDifficulty && passPvp && passTier;
        row.style.display = isVisible ? "" : "none";
        if (isVisible) visibleRows += 1;
      });

      updateVisibleCount(visibleRows, rows.length);
    };

    filterDifficulty.addEventListener("change", applyCodexFilters);
    filterPvpRole.addEventListener("change", applyCodexFilters);
    filterTier.addEventListener("change", applyCodexFilters);

    clearButton.addEventListener("click", () => {
      filterDifficulty.value = "";
      filterPvpRole.value = "";
      filterTier.value = "";
      clearStoredFilters(STORAGE_KEYS.classes);
      applyCodexFilters();
    });

    const storedFilters = readStoredFilters(STORAGE_KEYS.classes);
    if (storedFilters) {
      filterDifficulty.value = storedFilters.difficulty || "";
      filterPvpRole.value = storedFilters.pvpRole || "";
      filterTier.value = storedFilters.tier || "";
    }

    applyCodexFilters();
  }

  function setupJobFilters() {
    const jobsTable = document.getElementById("codexJobsTable");
    const filterJobFocus = document.getElementById("filterJobFocus");
    const filterJobImpact = document.getElementById("filterJobImpact");
    const filterJobTier = document.getElementById("filterJobTier");
    const clearButton = document.getElementById("clearJobFilters");
    const visibleCount = document.getElementById("codexJobsVisibleCount");

    if (
      !jobsTable ||
      !filterJobFocus ||
      !filterJobImpact ||
      !filterJobTier ||
      !clearButton ||
      !visibleCount
    ) {
      return;
    }

    const rows = Array.from(jobsTable.querySelectorAll("tbody tr"));
    if (!rows.length) return;

    const updateVisibleCount = (visible, total) => {
      visibleCount.textContent = `Trabajos visibles: ${visible}/${total}`;
    };

    const applyJobFilters = () => {
      const selectedFocus = filterJobFocus.value.trim().toLowerCase();
      const selectedImpact = filterJobImpact.value.trim().toLowerCase();
      const selectedTier = filterJobTier.value.trim().toLowerCase();

      writeStoredFilters(STORAGE_KEYS.jobs, {
        focus: filterJobFocus.value,
        impact: filterJobImpact.value,
        tier: filterJobTier.value,
      });

      let visibleRows = 0;

      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 6) return;

        const rowFocus = (cells[1].textContent || "").trim().toLowerCase();
        const rowImpact = (cells[2].textContent || "").trim().toLowerCase();
        const rowTier = (cells[5].textContent || "").trim().toLowerCase();

        const passFocus = !selectedFocus || rowFocus.includes(selectedFocus);
        const passImpact =
          !selectedImpact || rowImpact.includes(selectedImpact);
        const passTier = !selectedTier || rowTier.includes(selectedTier);

        const isVisible = passFocus && passImpact && passTier;
        row.style.display = isVisible ? "" : "none";
        if (isVisible) visibleRows += 1;
      });

      updateVisibleCount(visibleRows, rows.length);
    };

    filterJobFocus.addEventListener("change", applyJobFilters);
    filterJobImpact.addEventListener("change", applyJobFilters);
    filterJobTier.addEventListener("change", applyJobFilters);

    clearButton.addEventListener("click", () => {
      filterJobFocus.value = "";
      filterJobImpact.value = "";
      filterJobTier.value = "";
      clearStoredFilters(STORAGE_KEYS.jobs);
      applyJobFilters();
    });

    const storedFilters = readStoredFilters(STORAGE_KEYS.jobs);
    if (storedFilters) {
      filterJobFocus.value = storedFilters.focus || "";
      filterJobImpact.value = storedFilters.impact || "";
      filterJobTier.value = storedFilters.tier || "";
    }

    applyJobFilters();
  }

  async function loadClasses() {
    setStatus("Cargando clases y casas...");

    try {
      const response = await fetch(`${API_BASE_URL}/world/tree`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(
          data?.detail || "No se pudo cargar la estructura de clases",
        );
      }

      renderSummary(data.data);
      renderClasses(data.data.classes || []);
      activateMotion();
    } catch (error) {
      summary.textContent = "Sin datos disponibles";
      setStatus("Error al cargar clases. Verifica API y vuelve a intentar.");
    }
  }

  loadClasses();
  setupCodexFilters();
  setupJobFilters();
})();
