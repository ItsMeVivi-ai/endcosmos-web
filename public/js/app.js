(() => {
  const y = document.getElementById("y");
  if (y) y.textContent = new Date().getFullYear();

  const CLOCK_ID = "ec-global-clock";
  const CLOCK_STYLE_ID = "ec-global-clock-style";
  const QUICK_ACTIONS_ID = "ec-quick-actions";
  const SENIOR_AXIS_ID = "ec-senior-axis";
  const PROJECT_DISCORD_URL = "https://discord.gg/de6rZQtUUH";
  const HERO_MANIFEST_URL = "/assets/manifests/home-gallery.json";
  const HERO_ROTATION_MS = 5200;
  const HERO_FADE_MS = 620;
  const HERO_FADE_OUT_OPACITY = "0.2";
  const SENIOR_USER = "VIVI";
  const SENIOR_VARIABLES = [
    {
      name: "UNKTIME",
      focus: "Tiempo desconocido y decisiones bajo incertidumbre",
    },
    {
      name: "PSI_ABSTRACT",
      focus: "Psicologia abstracta aplicada a la accion",
    },
    {
      name: "ETHOS_RIGOR",
      focus: "Disciplina filosofica y criterio estricto",
    },
    {
      name: "NARRATIVE_GRAVITY",
      focus: "Contenido con peso real y direccion",
    },
    {
      name: "LIFE_SIGNAL",
      focus: "Impacto vital medible en el proceso creativo",
    },
  ];

  window.ENDCOSMOS_LINKS = Object.freeze({
    discord: PROJECT_DISCORD_URL,
  });

  function injectClockStyles() {
    if (document.getElementById(CLOCK_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = CLOCK_STYLE_ID;
    style.textContent = `
      #${CLOCK_ID} {
        position: fixed;
        right: 14px;
        bottom: 14px;
        z-index: 9999;
        min-width: 185px;
        border-radius: 12px;
        border: 1px solid rgba(117, 205, 255, 0.35);
        background: linear-gradient(135deg, rgba(10,18,42,.86), rgba(20,24,55,.82));
        box-shadow: 0 0 0 1px rgba(117,205,255,.16), 0 0 18px rgba(56,189,248,.22);
        color: #eaf6ff;
        font-family: Inter, Segoe UI, system-ui, sans-serif;
        backdrop-filter: blur(6px);
        padding: 10px 12px;
        line-height: 1.25;
        pointer-events: none;
      }

      #${CLOCK_ID} .ec-time {
        font-size: 1rem;
        font-weight: 700;
      }

      #${CLOCK_ID} .ec-date {
        margin-top: 2px;
        font-size: .76rem;
        opacity: .88;
      }

      #${CLOCK_ID} .ec-phase {
        margin-top: 4px;
        font-size: .72rem;
      }

      img.ec-flow {
        transition: transform 220ms ease-out, filter 220ms ease-out;
        will-change: transform, filter;
      }

      @keyframes ecImagePulse {
        0%, 100% { transform: scale(1.01); }
        50% { transform: scale(1.03); }
      }

      img.ec-flow.ec-pulse {
        animation: ecImagePulse 6s ease-in-out infinite;
      }

      #${QUICK_ACTIONS_ID} {
        position: fixed;
        left: 14px;
        bottom: 14px;
        z-index: 9999;
        display: grid;
        gap: 8px;
        --ec-btn-border: rgba(244, 114, 182, 0.45);
        --ec-btn-bg-a: rgba(58, 28, 88, .92);
        --ec-btn-bg-b: rgba(123, 30, 94, .86);
        --ec-btn-color: #fff1fb;
        --ec-btn-shadow: 0 0 0 1px rgba(244,114,182,.16), 0 0 16px rgba(168,85,247,.28);
        --ec-btn-border-hover: rgba(251, 207, 232, 0.9);
        --ec-btn-shadow-hover: 0 0 0 1px rgba(251,207,232,.3), 0 0 22px rgba(217,70,239,.4);
      }

      #${QUICK_ACTIONS_ID} .ec-btn {
        border: 1px solid var(--ec-btn-border);
        background: linear-gradient(135deg, var(--ec-btn-bg-a), var(--ec-btn-bg-b));
        color: var(--ec-btn-color);
        text-decoration: none;
        font-family: Inter, Segoe UI, system-ui, sans-serif;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: .04em;
        padding: 8px 10px;
        border-radius: 10px;
        box-shadow: var(--ec-btn-shadow);
        cursor: pointer;
        transition: border-color 180ms ease, box-shadow 180ms ease;
      }

      #${QUICK_ACTIONS_ID} .ec-btn:hover,
      #${QUICK_ACTIONS_ID} .ec-btn:focus-visible {
        border-color: var(--ec-btn-border-hover);
        box-shadow: var(--ec-btn-shadow-hover);
      }

      @media (max-width: 760px) {
        #${QUICK_ACTIONS_ID} {
          left: 10px;
          bottom: 10px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
        }

        #${QUICK_ACTIONS_ID} .ec-btn {
          font-size: 11px;
          padding: 7px 8px;
        }
      }

      #${SENIOR_AXIS_ID} {
        position: fixed;
        left: 14px;
        top: 14px;
        z-index: 9998;
        width: min(360px, calc(100vw - 28px));
        border-radius: 12px;
        border: 1px solid rgba(117, 205, 255, 0.35);
        background: linear-gradient(135deg, rgba(8,12,28,.9), rgba(16,20,45,.86));
        box-shadow: 0 0 0 1px rgba(117,205,255,.16), 0 0 20px rgba(56,189,248,.2);
        color: #eaf6ff;
        font-family: Inter, Segoe UI, system-ui, sans-serif;
        backdrop-filter: blur(6px);
        padding: 10px 12px;
      }

      #${SENIOR_AXIS_ID} .ec-senior-title {
        margin: 0;
        font-size: .78rem;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
        color: #a5f3fc;
      }

      #${SENIOR_AXIS_ID} .ec-senior-user {
        margin-top: 4px;
        font-size: .72rem;
        color: #dbeafe;
      }

      #${SENIOR_AXIS_ID} .ec-senior-list {
        margin: 8px 0 0;
        padding-left: 18px;
        display: grid;
        gap: 4px;
      }

      #${SENIOR_AXIS_ID} .ec-senior-list li {
        font-size: .72rem;
        line-height: 1.35;
        color: #e2e8f0;
      }

      #${SENIOR_AXIS_ID} .ec-senior-list strong {
        color: #fef08a;
      }

      @media (max-width: 760px) {
        #${SENIOR_AXIS_ID} {
          top: 10px;
          left: 10px;
          right: 10px;
          width: auto;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const BUTTON_THEMES = [
    {
      label: "◈ Púrpura",
      "--ec-btn-border": "rgba(244, 114, 182, 0.45)",
      "--ec-btn-bg-a": "rgba(58, 28, 88, .92)",
      "--ec-btn-bg-b": "rgba(123, 30, 94, .86)",
      "--ec-btn-color": "#fff1fb",
      "--ec-btn-shadow":
        "0 0 0 1px rgba(244,114,182,.16), 0 0 16px rgba(168,85,247,.28)",
      "--ec-btn-border-hover": "rgba(251, 207, 232, 0.9)",
      "--ec-btn-shadow-hover":
        "0 0 0 1px rgba(251,207,232,.3), 0 0 22px rgba(217,70,239,.4)",
    },
    {
      label: "◈ Verde",
      "--ec-btn-border": "rgba(74, 222, 128, 0.45)",
      "--ec-btn-bg-a": "rgba(18, 50, 28, .92)",
      "--ec-btn-bg-b": "rgba(20, 83, 45, .88)",
      "--ec-btn-color": "#f0fdf4",
      "--ec-btn-shadow":
        "0 0 0 1px rgba(74,222,128,.16), 0 0 16px rgba(34,197,94,.28)",
      "--ec-btn-border-hover": "rgba(187, 247, 208, 0.9)",
      "--ec-btn-shadow-hover":
        "0 0 0 1px rgba(187,247,208,.3), 0 0 22px rgba(74,222,128,.45)",
    },
    {
      label: "◈ Cyan",
      "--ec-btn-border": "rgba(117, 205, 255, 0.35)",
      "--ec-btn-bg-a": "rgba(10, 18, 42, .9)",
      "--ec-btn-bg-b": "rgba(20, 24, 55, .84)",
      "--ec-btn-color": "#eaf6ff",
      "--ec-btn-shadow":
        "0 0 0 1px rgba(117,205,255,.12), 0 0 16px rgba(56,189,248,.2)",
      "--ec-btn-border-hover": "rgba(165, 243, 252, 0.65)",
      "--ec-btn-shadow-hover":
        "0 0 0 1px rgba(165,243,252,.22), 0 0 20px rgba(56,189,248,.34)",
    },
  ];

  const THEME_STORAGE_KEY = "ec-btn-theme";

  function applyButtonTheme(wrapper, idx) {
    const theme = BUTTON_THEMES[idx % BUTTON_THEMES.length];
    for (const [prop, value] of Object.entries(theme)) {
      if (prop.startsWith("--")) wrapper.style.setProperty(prop, value);
    }
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      String(idx % BUTTON_THEMES.length),
    );
  }

  function initGlobalActionButtons() {
    if (document.getElementById(QUICK_ACTIONS_ID)) return;

    const wrapper = document.createElement("nav");
    wrapper.id = QUICK_ACTIONS_ID;
    wrapper.setAttribute("aria-label", "Acciones rápidas EndCosmos");

    const saved = Number.parseInt(
      window.localStorage.getItem(THEME_STORAGE_KEY) ?? "0",
      10,
    );
    let activeTheme = Number.isNaN(saved) ? 0 : saved % BUTTON_THEMES.length;
    applyButtonTheme(wrapper, activeTheme);

    const buttons = [
      {
        type: "link",
        label: "Inicio",
        href: "/",
      },
      {
        type: "link",
        label: "Noticias",
        href: "/news/",
      },
      {
        type: "link",
        label: "Mapas",
        href: "/mapas/",
      },
      {
        type: "link",
        label: "Discord",
        href: PROJECT_DISCORD_URL,
        external: true,
      },
      {
        type: "button",
        label: "Arriba",
        onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }),
      },
      {
        type: "button",
        label: "Recargar",
        onClick: () => window.location.reload(),
      },
    ];

    for (const item of buttons) {
      if (item.type === "link") {
        const anchor = document.createElement("a");
        anchor.className = "ec-btn";
        anchor.href = item.href;
        if (item.external) {
          anchor.target = "_blank";
          anchor.rel = "noreferrer noopener";
        }
        anchor.textContent = item.label;
        wrapper.appendChild(anchor);
      } else {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ec-btn";
        button.textContent = item.label;
        button.addEventListener("click", item.onClick);
        wrapper.appendChild(button);
      }
    }

    const themeBtn = document.createElement("button");
    themeBtn.type = "button";
    themeBtn.className = "ec-btn";
    themeBtn.title = "Cambiar tema de botones";
    themeBtn.textContent = BUTTON_THEMES[activeTheme].label;
    themeBtn.addEventListener("click", () => {
      activeTheme = (activeTheme + 1) % BUTTON_THEMES.length;
      applyButtonTheme(wrapper, activeTheme);
      themeBtn.textContent = BUTTON_THEMES[activeTheme].label;
    });
    wrapper.appendChild(themeBtn);

    document.body.appendChild(wrapper);
  }

  function initSeniorPhilosophyLayer() {
    if (!document.body) return;
    document.body.classList.add("mode-senior");
    document.body.dataset.seniorUser = SENIOR_USER;

    if (document.getElementById(SENIOR_AXIS_ID)) return;

    const panel = document.createElement("aside");
    panel.id = SENIOR_AXIS_ID;
    panel.setAttribute("aria-label", "Senior philosophy variables");

    const listItems = SENIOR_VARIABLES.map(
      (variable, idx) =>
        `<li><strong>${idx + 1}. ${variable.name}</strong> · ${variable.focus}</li>`,
    ).join("");

    panel.innerHTML = `
      <p class="ec-senior-title">Senior Creator · Life Research Mode</p>
      <div class="ec-senior-user">Usuario activo: ${SENIOR_USER}</div>
      <ol class="ec-senior-list">${listItems}</ol>
    `;

    document.body.appendChild(panel);
  }

  function getCosmicPhase(date) {
    const hour = date.getHours();
    if (hour < 6) return "Fase Noctis ∞";
    if (hour < 12) return "Fase Aurora Stellar";
    if (hour < 18) return "Fase Nexus Activa";
    return "Fase Eclipse Arcana";
  }

  function mountClock() {
    let clock = document.getElementById(CLOCK_ID);
    if (clock) return clock;
    clock = document.createElement("aside");
    clock.id = CLOCK_ID;
    clock.setAttribute("aria-live", "polite");
    clock.innerHTML = `
      <div class="ec-time">--:--:--</div>
      <div class="ec-date">--</div>
      <div class="ec-phase">Fase --</div>
    `;
    document.body.appendChild(clock);
    return clock;
  }

  function updateClock(clock) {
    const now = new Date();
    const time = now.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const date = now.toLocaleDateString("es-ES", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
    });

    const timeNode = clock.querySelector(".ec-time");
    const dateNode = clock.querySelector(".ec-date");
    const phaseNode = clock.querySelector(".ec-phase");
    if (!timeNode || !dateNode || !phaseNode) return;

    timeNode.textContent = time;
    dateNode.textContent = date;
    phaseNode.textContent = getCosmicPhase(now);
  }

  function initGlobalClock() {
    injectClockStyles();
    const clock = mountClock();
    updateClock(clock);
    window.setInterval(() => updateClock(clock), 1000);
  }

  function initImageFlow() {
    const images = Array.from(document.querySelectorAll("img"));
    if (!images.length) return;

    images.forEach((img, index) => {
      img.classList.add("ec-flow");
      if (index % 2 === 0) img.classList.add("ec-pulse");
    });

    document.addEventListener(
      "mousemove",
      (event) => {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const dx = (event.clientX - cx) / Math.max(cx, 1);
        const dy = (event.clientY - cy) / Math.max(cy, 1);

        images.forEach((img, index) => {
          const speed = 1 + (index % 5) * 0.2;
          const x = -(dx * 2.8 * speed);
          const y = -(dy * 2.1 * speed);
          img.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        });
      },
      { passive: true },
    );
  }

  async function initHeroImageRotation() {
    const heroBg = document.querySelector(".hero-bg");
    if (!heroBg) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let payload;
    try {
      const response = await fetch(HERO_MANIFEST_URL, { cache: "no-store" });
      if (!response.ok) return;
      payload = await response.json();
    } catch {
      return;
    }

    const slides = Array.isArray(payload?.slides)
      ? payload.slides
          .map((slide) => {
            const src = typeof slide?.src === "string" ? slide.src.trim() : "";
            const label =
              typeof slide?.caption === "string" && slide.caption.trim().length
                ? slide.caption.trim()
                : typeof slide?.alt === "string" && slide.alt.trim().length
                  ? slide.alt.trim()
                  : "Cosmic hero scene";
            return src ? { src, label } : null;
          })
          .filter(Boolean)
      : [];

    const uniqueSlides = [];
    const seen = new Set();
    for (const slide of slides) {
      if (seen.has(slide.src)) continue;
      seen.add(slide.src);
      uniqueSlides.push(slide);
    }

    if (!uniqueSlides.length) return;

    heroBg.style.transition = `opacity ${HERO_FADE_MS}ms ease`;
    heroBg.style.willChange = "opacity";

    let activeIndex = Math.floor(Math.random() * uniqueSlides.length);
    let rotationTimerId = 0;
    let isTransitioning = false;

    const applySlide = (slide) => {
      if (!slide?.src) return;
      if (!heroBg.style.backgroundImage.includes(slide.src)) {
        heroBg.dataset.heroSrc = slide.src;
      }
      const cssSrc = slide.src.replace(/"/g, '\\"');
      heroBg.style.backgroundImage = `url("${cssSrc}")`;
      heroBg.style.opacity = "1";
      heroBg.setAttribute("aria-label", slide.label);
    };

    const preloadImage = (src) =>
      new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(true);
        image.onerror = () => resolve(false);
        image.src = src;
      });

    const firstSlide = uniqueSlides[activeIndex];
    const firstLoaded = await preloadImage(firstSlide.src);
    if (firstLoaded) {
      applySlide(firstSlide);
    }

    if (uniqueSlides.length <= 1 || reduceMotion) return;

    const scheduleNext = () => {
      window.clearTimeout(rotationTimerId);
      rotationTimerId = window.setTimeout(rotateOnce, HERO_ROTATION_MS);
    };

    const rotateOnce = async () => {
      if (document.hidden) {
        scheduleNext();
        return;
      }

      if (isTransitioning) return;
      isTransitioning = true;

      const nextIndex = (activeIndex + 1) % uniqueSlides.length;
      const nextSlide = uniqueSlides[nextIndex];
      const loaded = await preloadImage(nextSlide.src);

      if (!loaded) {
        activeIndex = nextIndex;
        isTransitioning = false;
        scheduleNext();
        return;
      }

      heroBg.style.opacity = HERO_FADE_OUT_OPACITY;
      window.setTimeout(
        () => {
          applySlide(nextSlide);
          activeIndex = nextIndex;
          isTransitioning = false;
          scheduleNext();
        },
        Math.max(180, Math.floor(HERO_FADE_MS / 2.4)),
      );
    };

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) scheduleNext();
    });

    scheduleNext();
  }

  const REFRESH_STORAGE_KEY = "endcosmos:autoRefreshSec";
  const DEFAULT_REFRESH_SECONDS = 30;
  const MIN_REFRESH_SECONDS = 5;
  const MAX_REFRESH_SECONDS = 3600;

  function clampRefreshSeconds(value) {
    const n = Number.parseInt(String(value ?? ""), 10);
    if (Number.isNaN(n)) return null;
    if (n <= 0) return 0;
    return Math.max(MIN_REFRESH_SECONDS, Math.min(MAX_REFRESH_SECONDS, n));
  }

  function initAutoRefresh() {
    const params = new URLSearchParams(window.location.search);
    const paramValue = params.get("refresh") ?? params.get("autorefresh");
    const parsedParam =
      paramValue === null ? null : clampRefreshSeconds(paramValue);

    if (parsedParam !== null) {
      if (parsedParam > 0) {
        window.localStorage.setItem(REFRESH_STORAGE_KEY, String(parsedParam));
      } else {
        window.localStorage.removeItem(REFRESH_STORAGE_KEY);
      }
    }

    const storedValue = window.localStorage.getItem(REFRESH_STORAGE_KEY);
    const parsedStored =
      storedValue === null ? null : clampRefreshSeconds(storedValue);

    const refreshSeconds =
      parsedParam !== null
        ? parsedParam
        : parsedStored !== null
          ? parsedStored
          : DEFAULT_REFRESH_SECONDS;

    if (refreshSeconds > 0) {
      window.setTimeout(() => {
        window.location.reload();
      }, refreshSeconds * 1000);
    }
  }

  initSeniorPhilosophyLayer();
  initGlobalClock();
  initGlobalActionButtons();
  initImageFlow();
  initHeroImageRotation();
  initAutoRefresh();

  const body = document.body;
  const canvas =
    document.getElementById("cosmos-canvas") ||
    document.querySelector(".starfield");
  if (!canvas || !body) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  const state = {
    width: 0,
    height: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    pointerX: 0,
    pointerY: 0,
    targetPointerX: 0,
    targetPointerY: 0,
    starsNear: [],
    starsMid: [],
    starsFar: [],
    particles: [],
    nebulae: [],
    config: null,
    reducedMotion: reducedMotionQuery.matches,
    firstFrameDone: false,
    rafId: 0,
  };

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function getAnimationConfig() {
    const mobile = state.width < 768;
    const compact = state.width < 460;
    const scale = compact ? 0.46 : mobile ? 0.64 : 1;
    return {
      nearStars: Math.max(28, Math.floor(85 * scale)),
      midStars: Math.max(44, Math.floor(120 * scale)),
      farStars: Math.max(58, Math.floor(165 * scale)),
      particles: Math.max(14, Math.floor(36 * scale)),
      nebulae: Math.max(2, Math.floor(4 * (mobile ? 0.75 : 1))),
      speedScale: state.reducedMotion ? 0.16 : 1,
      parallaxScale: state.reducedMotion ? 0.08 : 1,
      pointerSmoothing: state.reducedMotion ? 0.02 : 0.045,
    };
  }

  function createStar(
    depthMin,
    depthMax,
    speedMin,
    speedMax,
    sizeMin,
    sizeMax,
  ) {
    const config = getAnimationConfig();
    return {
      x: randomBetween(0, state.width),
      y: randomBetween(0, state.height),
      size: randomBetween(sizeMin, sizeMax),
      speed: randomBetween(speedMin, speedMax) * config.speedScale,
      alpha: randomBetween(0.35, 0.95),
      twinkle: randomBetween(0, Math.PI * 2),
      depth: randomBetween(depthMin, depthMax),
    };
  }

  function createParticle() {
    const config = state.config || getAnimationConfig();
    return {
      x: randomBetween(0, state.width),
      y: randomBetween(0, state.height),
      radius: randomBetween(1.2, 2.4),
      alpha: randomBetween(0.08, 0.26),
      alphaBase: randomBetween(0.07, 0.2),
      pulseSpeed: randomBetween(0.00045, 0.001),
      vx: randomBetween(-0.04, 0.04) * config.speedScale,
      vy: randomBetween(-0.08, -0.02) * config.speedScale,
      drift: randomBetween(0, Math.PI * 2),
    };
  }

  function createNebula() {
    const config = state.config || getAnimationConfig();
    const hues = [264, 228, 196];
    return {
      x: randomBetween(0.15, 0.85) * state.width,
      y: randomBetween(0.1, 0.9) * state.height,
      radius: randomBetween(220, 420),
      hue: hues[Math.floor(Math.random() * hues.length)],
      alpha: randomBetween(0.07, 0.14),
      driftX: randomBetween(-0.08, 0.08) * config.speedScale,
      driftY: randomBetween(-0.06, 0.06) * config.speedScale,
    };
  }

  function resizeCanvas() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    state.pointerX = state.width * 0.5;
    state.pointerY = state.height * 0.5;
    state.targetPointerX = state.pointerX;
    state.targetPointerY = state.pointerY;

    const config = getAnimationConfig();
    state.config = config;

    state.starsNear = Array.from({ length: config.nearStars }, () =>
      createStar(0.55, 1, 0.08, 0.22, 0.9, 1.8),
    );
    state.starsMid = Array.from({ length: config.midStars }, () =>
      createStar(0.3, 0.75, 0.05, 0.16, 0.6, 1.35),
    );
    state.starsFar = Array.from({ length: config.farStars }, () =>
      createStar(0.12, 0.45, 0.02, 0.1, 0.35, 1),
    );
    state.particles = Array.from({ length: config.particles }, createParticle);
    state.nebulae = Array.from({ length: config.nebulae }, createNebula);
  }

  function drawNebula(nebula, time, cameraX, cameraY) {
    const config = state.config;
    const mouseParallaxX =
      (state.pointerX / Math.max(state.width, 1) - 0.5) *
      24 *
      config.parallaxScale;
    const mouseParallaxY =
      (state.pointerY / Math.max(state.height, 1) - 0.5) *
      18 *
      config.parallaxScale;
    const driftX =
      Math.sin(time * 0.00008 + nebula.hue) * 28 * config.speedScale +
      nebula.driftX * time * 0.01;
    const driftY =
      Math.cos(time * 0.00006 + nebula.hue) * 22 * config.speedScale +
      nebula.driftY * time * 0.01;

    const x = nebula.x + driftX + mouseParallaxX * 0.32 + cameraX;
    const y = nebula.y + driftY + mouseParallaxY * 0.32 + cameraY;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, nebula.radius);
    gradient.addColorStop(0, `hsla(${nebula.hue}, 92%, 64%, ${nebula.alpha})`);
    gradient.addColorStop(
      0.6,
      `hsla(${nebula.hue}, 85%, 50%, ${nebula.alpha * 0.3})`,
    );
    gradient.addColorStop(1, "hsla(220, 80%, 10%, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, nebula.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawParticles(time, cameraX, cameraY) {
    const config = state.config;
    const offsetX =
      (state.pointerX / Math.max(state.width, 1) - 0.5) *
      6 *
      config.parallaxScale;
    const offsetY =
      (state.pointerY / Math.max(state.height, 1) - 0.5) *
      6 *
      config.parallaxScale;

    for (let i = 0; i < state.particles.length; i += 1) {
      const particle = state.particles[i];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.x +=
        Math.sin(time * 0.0008 + particle.drift) * 0.05 * config.speedScale;

      if (
        particle.y < -10 ||
        particle.x < -10 ||
        particle.x > state.width + 10
      ) {
        particle.x = randomBetween(0, state.width);
        particle.y = state.height + randomBetween(4, 20);
        particle.drift = randomBetween(0, Math.PI * 2);
      }

      const pulse =
        0.55 + Math.sin(time * particle.pulseSpeed + particle.drift) * 0.45;
      ctx.globalAlpha = particle.alphaBase + particle.alpha * pulse;
      ctx.fillStyle = "#7ddfff";
      ctx.beginPath();
      ctx.arc(
        particle.x + offsetX + cameraX * 0.45,
        particle.y + offsetY + cameraY * 0.45,
        particle.radius,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  function updateAndDrawStars(stars, time, depthFactor, cameraX, cameraY) {
    const config = state.config;
    const offsetX =
      (state.pointerX / Math.max(state.width, 1) - 0.5) *
      depthFactor *
      config.parallaxScale;
    const offsetY =
      (state.pointerY / Math.max(state.height, 1) - 0.5) *
      depthFactor *
      config.parallaxScale;

    for (let i = 0; i < stars.length; i += 1) {
      const star = stars[i];
      star.y += star.speed;
      if (star.y > state.height + 3) {
        star.y = -3;
        star.x = randomBetween(0, state.width);
      }

      const twinkle = 0.72 + Math.sin(time * 0.0014 + star.twinkle) * 0.28;
      ctx.globalAlpha = star.alpha * twinkle;
      ctx.fillStyle = "#e8f2ff";
      ctx.beginPath();
      ctx.arc(
        star.x + offsetX * star.depth + cameraX * star.depth,
        star.y + offsetY * star.depth + cameraY * star.depth,
        star.size,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  function renderFrame(time) {
    const config = state.config;
    state.pointerX +=
      (state.targetPointerX - state.pointerX) * config.pointerSmoothing;
    state.pointerY +=
      (state.targetPointerY - state.pointerY) * config.pointerSmoothing;

    const cameraX = Math.sin(time * 0.00012) * 8 * config.parallaxScale;
    const cameraY = Math.cos(time * 0.0001) * 7 * config.parallaxScale;

    ctx.clearRect(0, 0, state.width, state.height);

    for (let i = 0; i < state.nebulae.length; i += 1) {
      drawNebula(state.nebulae[i], time, cameraX, cameraY);
    }

    updateAndDrawStars(state.starsFar, time, 8, cameraX, cameraY);
    updateAndDrawStars(state.starsMid, time, 12, cameraX, cameraY);
    updateAndDrawStars(state.starsNear, time, 16, cameraX, cameraY);
    drawParticles(time, cameraX, cameraY);
    ctx.globalAlpha = 1;
  }

  function markReady() {
    if (state.firstFrameDone) return;
    state.firstFrameDone = true;
    body.classList.add("galaxy-ready");
  }

  function animate(time) {
    renderFrame(time);
    markReady();

    state.rafId = requestAnimationFrame(animate);
  }

  function startAnimation() {
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = 0;

    if (state.reducedMotion) {
      renderFrame(0);
      markReady();
      return;
    }

    state.rafId = requestAnimationFrame(animate);
  }

  let resizeFrame = 0;
  function onResize() {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeCanvas();
      startAnimation();
    });
  }

  function onReducedMotionChange(event) {
    state.reducedMotion = event.matches;
    resizeCanvas();
    startAnimation();
  }

  window.addEventListener("resize", onResize, { passive: true });
  reducedMotionQuery.addEventListener("change", onReducedMotionChange);
  window.addEventListener(
    "pointermove",
    (event) => {
      if (state.reducedMotion) return;
      state.targetPointerX = event.clientX;
      state.targetPointerY = event.clientY;
    },
    { passive: true },
  );

  resizeCanvas();
  startAnimation();
})();
