(() => {
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const hero = document.querySelector(".hero");
  const heroTitleMain = document.querySelector(".hero-title > span");
  const parallaxLayers = Array.from(document.querySelectorAll("[data-parallax-layer]"));
  const floatNodes = Array.from(document.querySelectorAll("[data-float]"));
  const revealNodes = Array.from(document.querySelectorAll(".reveal"));
  const sections = Array.from(document.querySelectorAll("main .section"));

  revealNodes.forEach((node, index) => {
    if (node.dataset.revealDelay) {
      node.style.transitionDelay = `${Number(node.dataset.revealDelay)}ms`;
      return;
    }
    const delay = Math.min(index * 55, 420);
    node.style.transitionDelay = `${delay}ms`;
  });

  function initHeroTitleLetters() {
    if (!heroTitleMain || heroTitleMain.dataset.lettersReady === "1") return;

    const rawText = (heroTitleMain.textContent || "").trim();
    if (!rawText) return;

    heroTitleMain.textContent = "";
    heroTitleMain.classList.add("hero-title-main");

    const fragment = document.createDocumentFragment();
    let charIndex = 0;
    for (const char of rawText) {
      const node = document.createElement("span");
      node.className = "hero-letter";
      if (char === " ") {
        node.classList.add("hero-letter-space");
        node.textContent = "\u00A0";
      } else {
        node.textContent = char;
        node.style.setProperty("--char-index", String(charIndex));
        charIndex += 1;
      }
      fragment.appendChild(node);
    }

    heroTitleMain.appendChild(fragment);
    heroTitleMain.dataset.lettersReady = "1";
  }

  function initSectionKinetics() {
    if (!sections.length) return;
    sections.forEach((section) => section.classList.add("section-kinetic"));

    if (!("IntersectionObserver" in window)) {
      sections.forEach((section) => section.classList.add("is-in-view"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in-view");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.25,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    sections.forEach((section) => observer.observe(section));
  }

  initHeroTitleLetters();
  initSectionKinetics();

  if (!hero || (!parallaxLayers.length && !floatNodes.length)) return;

  const state = {
    x: 0.5,
    y: 0.5,
    tx: 0.5,
    ty: 0.5,
    rafId: 0,
    reduced: reducedMotionQuery.matches,
  };

  function readNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function resetTransforms() {
    parallaxLayers.forEach((layer) => {
      layer.style.transform = "";
    });
    floatNodes.forEach((node) => {
      node.style.transform = "";
    });
  }

  function step(time) {
    if (state.reduced) {
      resetTransforms();
      state.rafId = 0;
      return;
    }

    state.x += (state.tx - state.x) * 0.08;
    state.y += (state.ty - state.y) * 0.08;

    const viewportScale = Math.min(window.innerWidth, 1400) / 1400;
    const px = state.x - 0.5;
    const py = state.y - 0.5;

    parallaxLayers.forEach((layer) => {
      const depth = readNumber(layer.dataset.parallaxLayer, 0.1);
      const shiftX = px * 64 * depth * viewportScale;
      const shiftY = py * 44 * depth * viewportScale;
      layer.style.transform = `translate3d(${shiftX.toFixed(2)}px, ${shiftY.toFixed(2)}px, 0)`;
    });

    floatNodes.forEach((node, index) => {
      const amplitude = readNumber(node.dataset.float, 8);
      const speed = readNumber(node.dataset.floatSpeed, 1);
      const phase = index * 0.9;
      const wave = Math.sin(time * 0.0011 * speed + phase) * amplitude;
      const sway = Math.cos(time * 0.0009 * speed + phase) * (amplitude * 0.34);
      const pointerX = px * amplitude * 0.9;
      const pointerY = py * amplitude * 0.5;
      node.style.transform = `translate3d(${(sway + pointerX).toFixed(2)}px, ${(wave + pointerY).toFixed(2)}px, 0)`;
    });

    state.rafId = window.requestAnimationFrame(step);
  }

  function startLoop() {
    if (state.rafId) window.cancelAnimationFrame(state.rafId);
    state.rafId = 0;
    if (state.reduced) {
      resetTransforms();
      return;
    }
    state.rafId = window.requestAnimationFrame(step);
  }

  window.addEventListener(
    "pointermove",
    (event) => {
      if (state.reduced) return;
      state.tx = event.clientX / Math.max(window.innerWidth, 1);
      state.ty = event.clientY / Math.max(window.innerHeight, 1);
    },
    { passive: true },
  );

  window.addEventListener(
    "pointerleave",
    () => {
      state.tx = 0.5;
      state.ty = 0.5;
    },
    { passive: true },
  );

  window.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        if (state.rafId) window.cancelAnimationFrame(state.rafId);
        state.rafId = 0;
        return;
      }
      startLoop();
    },
    { passive: true },
  );

  reducedMotionQuery.addEventListener("change", (event) => {
    state.reduced = event.matches;
    startLoop();
  });

  startLoop();
})();
